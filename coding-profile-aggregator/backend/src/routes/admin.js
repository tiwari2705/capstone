const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [usersResult, profilesResult, statsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['user']),
      pool.query('SELECT COUNT(*) as total FROM coding_profiles WHERE verified = TRUE'),
      pool.query('SELECT SUM(problems_solved) as total FROM stats')
    ]);
    const platformUsage = await pool.query('SELECT platform, COUNT(*) as user_count, SUM(problems_solved) as total_problems FROM stats GROUP BY platform ORDER BY user_count DESC');
    const courseDistribution = await pool.query(`SELECT course, COUNT(*) as count FROM users WHERE role = 'user' AND course IS NOT NULL GROUP BY course ORDER BY count DESC`);
    const sectionDistribution = await pool.query(`SELECT section, COUNT(*) as count FROM users WHERE role = 'user' AND section IS NOT NULL GROUP BY section ORDER BY section`);
    const yearDistribution = await pool.query(`SELECT year_of_passing, COUNT(*) as count FROM users WHERE role = 'user' AND year_of_passing IS NOT NULL GROUP BY year_of_passing ORDER BY year_of_passing DESC`);
    res.json({
      totalUsers: parseInt(usersResult.rows[0].total),
      totalVerifiedProfiles: parseInt(profilesResult.rows[0].total),
      totalProblemsSolved: parseInt(statsResult.rows[0].total) || 0,
      platformUsage: platformUsage.rows,
      courseDistribution: courseDistribution.rows,
      sectionDistribution: sectionDistribution.rows,
      yearDistribution: yearDistribution.rows
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


// GET /api/admin/users - USING EXACT SAME SQL AS PUBLIC LEADERBOARD
router.get('/users', async (req, res) => {
  try {
    const { course, section, year_of_passing, search, sort = 'name', order = 'asc', limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (course) { params.push(course); whereClause += ` AND u.course = $${params.length}`; }
    if (section) { params.push(section); whereClause += ` AND u.section = $${params.length}`; }
    if (year_of_passing) { params.push(parseInt(year_of_passing)); whereClause += ` AND u.year_of_passing = $${params.length}`; }
    if (search) { params.push(`%${search}%`); whereClause += ` AND (u.registration_no ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }
    
    const validSorts = ['name', 'email', 'course', 'section', 'year_of_passing', 'created_at', 'registration_no'];
    const sortColumn = validSorts.includes(sort) ? sort : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
    
    params.push(parseInt(limit), parseInt(offset));
    
    // EXACT SAME SQL AS PUBLIC LEADERBOARD
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.registration_no,
        u.course,
        u.section,
        u.year_of_passing,
        u.created_at,
        COUNT(DISTINCT cp.id) as verified_profiles,
        (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0)) AS total_problems,
        ROUND(
          COALESCE(lc.problems_solved, 0) * 1.0 +
          COALESCE(cf.rating, 0) * 0.1 +
          COALESCE(gfg.problems_solved, 0) * 1.0 +
          COALESCE(hr.problems_solved, 0) * 1.0 +
          COALESCE(cc.rating, 0) * 0.1,
          2
        ) AS total_score
      FROM users u
      LEFT JOIN coding_profiles cp ON cp.user_id = u.id AND cp.verified = TRUE
      LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
      LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
      LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
      LEFT JOIN stats hr ON hr.user_id = u.id AND hr.platform = 'hackerrank'
      LEFT JOIN stats cc ON cc.user_id = u.id AND cc.platform = 'codechef'
      WHERE u.role = 'user' ${whereClause}
      GROUP BY u.id, u.name, u.email, u.registration_no, u.course, u.section, u.year_of_passing, u.created_at, lc.problems_solved, cf.problems_solved, cf.rating, gfg.problems_solved, hr.problems_solved, cc.problems_solved, cc.rating
      ORDER BY u.${sortColumn} ${sortOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    
    const result = await pool.query(query, params);
    
    const countQuery = `SELECT COUNT(*) as total FROM users u WHERE u.role = 'user' ${whereClause}`;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    res.json({ 
      users: result.rows, 
      total: parseInt(countResult.rows[0].total), 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ error: err.message });
  }
});


// GET /api/admin/section/:section
router.get('/section/:section', async (req, res) => {
  try {
    const { section } = req.params;
    
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.registration_no,
        u.course,
        u.section,
        COUNT(DISTINCT cp.id) as verified_profiles,
        (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0)) AS total_problems,
        ROUND(
          COALESCE(lc.problems_solved, 0) * 1.0 +
          COALESCE(cf.rating, 0) * 0.1 +
          COALESCE(gfg.problems_solved, 0) * 1.0 +
          COALESCE(hr.problems_solved, 0) * 1.0 +
          COALESCE(cc.rating, 0) * 0.1,
          2
        ) AS total_score
      FROM users u
      LEFT JOIN coding_profiles cp ON cp.user_id = u.id AND cp.verified = TRUE
      LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
      LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
      LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
      LEFT JOIN stats hr ON hr.user_id = u.id AND hr.platform = 'hackerrank'
      LEFT JOIN stats cc ON cc.user_id = u.id AND cc.platform = 'codechef'
      WHERE u.section = $1 AND u.role = 'user'
      GROUP BY u.id, u.name, u.email, u.registration_no, u.course, u.section, lc.problems_solved, cf.problems_solved, cf.rating, gfg.problems_solved, hr.problems_solved, cc.problems_solved, cc.rating
      ORDER BY total_problems DESC
    `;
    
    const result = await pool.query(query, [section]);
    
    const sectionStats = { 
      totalStudents: result.rows.length, 
      totalProblems: result.rows.reduce((sum, u) => sum + parseInt(u.total_problems || 0), 0), 
      avgProblems: result.rows.length > 0 ? (result.rows.reduce((sum, u) => sum + parseInt(u.total_problems || 0), 0) / result.rows.length).toFixed(2) : 0, 
      topPerformer: result.rows[0] || null 
    };
    
    res.json({ section, stats: sectionStats, students: result.rows });
  } catch (err) {
    console.error('Admin section view error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/course/:course
router.get('/course/:course', async (req, res) => {
  try {
    const { course } = req.params;
    
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.registration_no,
        u.course,
        u.section,
        COUNT(DISTINCT cp.id) as verified_profiles,
        (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0)) AS total_problems,
        ROUND(
          COALESCE(lc.problems_solved, 0) * 1.0 +
          COALESCE(cf.rating, 0) * 0.1 +
          COALESCE(gfg.problems_solved, 0) * 1.0 +
          COALESCE(hr.problems_solved, 0) * 1.0 +
          COALESCE(cc.rating, 0) * 0.1,
          2
        ) AS total_score
      FROM users u
      LEFT JOIN coding_profiles cp ON cp.user_id = u.id AND cp.verified = TRUE
      LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
      LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
      LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
      LEFT JOIN stats hr ON hr.user_id = u.id AND hr.platform = 'hackerrank'
      LEFT JOIN stats cc ON cc.user_id = u.id AND cc.platform = 'codechef'
      WHERE u.course = $1 AND u.role = 'user'
      GROUP BY u.id, u.name, u.email, u.registration_no, u.course, u.section, lc.problems_solved, cf.problems_solved, cf.rating, gfg.problems_solved, hr.problems_solved, cc.problems_solved, cc.rating
      ORDER BY total_problems DESC
    `;
    
    const result = await pool.query(query, [course]);
    
    const courseStats = { 
      totalStudents: result.rows.length, 
      totalProblems: result.rows.reduce((sum, u) => sum + parseInt(u.total_problems || 0), 0), 
      avgProblems: result.rows.length > 0 ? (result.rows.reduce((sum, u) => sum + parseInt(u.total_problems || 0), 0) / result.rows.length).toFixed(2) : 0, 
      topPerformer: result.rows[0] || null 
    };
    
    const sectionMap = {};
    result.rows.forEach(user => {
      if (!sectionMap[user.section]) {
        sectionMap[user.section] = { section: user.section, student_count: 0, total_problems: 0 };
      }
      sectionMap[user.section].student_count++;
      sectionMap[user.section].total_problems += parseInt(user.total_problems || 0);
    });
    
    const sectionBreakdown = Object.values(sectionMap).sort((a, b) => a.section.localeCompare(b.section));
    
    res.json({ course, stats: courseStats, sectionBreakdown, students: result.rows });
  } catch (err) {
    console.error('Admin course view error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { course, section, metric = 'score', limit = 100 } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (course) { params.push(course); whereClause += ` AND u.course = $${params.length}`; }
    if (section) { params.push(section); whereClause += ` AND u.section = $${params.length}`; }
    
    params.push(parseInt(limit));
    
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.registration_no,
        u.course,
        u.section,
        COUNT(DISTINCT cp.id) as verified_profiles,
        (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0)) AS total_problems,
        ROUND(
          COALESCE(lc.problems_solved, 0) * 1.0 +
          COALESCE(cf.rating, 0) * 0.1 +
          COALESCE(gfg.problems_solved, 0) * 1.0 +
          COALESCE(hr.problems_solved, 0) * 1.0 +
          COALESCE(cc.rating, 0) * 0.1,
          2
        ) AS total_score,
        ROUND(
          (COALESCE(cf.rating, 0) + COALESCE(cc.rating, 0)) / 
          NULLIF((CASE WHEN cf.rating > 0 THEN 1 ELSE 0 END + CASE WHEN cc.rating > 0 THEN 1 ELSE 0 END), 0),
          2
        ) AS avg_rating
      FROM users u
      LEFT JOIN coding_profiles cp ON cp.user_id = u.id AND cp.verified = TRUE
      LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
      LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
      LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
      LEFT JOIN stats hr ON hr.user_id = u.id AND hr.platform = 'hackerrank'
      LEFT JOIN stats cc ON cc.user_id = u.id AND cc.platform = 'codechef'
      WHERE u.role = 'user' ${whereClause}
      GROUP BY u.id, u.name, u.email, u.registration_no, u.course, u.section, lc.problems_solved, cf.problems_solved, cf.rating, gfg.problems_solved, hr.problems_solved, cc.problems_solved, cc.rating
      ORDER BY ${metric === 'problems' ? 'total_problems' : metric === 'rating' ? 'avg_rating' : 'total_score'} DESC
      LIMIT $${params.length}
    `;
    
    const result = await pool.query(query, params);
    const rankedLeaderboard = result.rows.map((row, index) => ({ ...row, rank: index + 1 }));
    
    res.json({ leaderboard: rankedLeaderboard, filters: { course, section, metric }, total: rankedLeaderboard.length });
  } catch (err) {
    console.error('Admin leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Other admin routes (admins, create-admin, sync-stats, etc.)
router.get('/admins', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, username, email, role, created_at FROM users WHERE role IN ('admin', 'superadmin') ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error('List admins error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-admin', requireSuperAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const existing = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, `admin_${username}@admin.local`]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Admin username already exists' });
    const hashed = await bcrypt.hash(password, 12);
    const generatedEmail = `admin_${username}@admin.local`;
    const result = await pool.query("INSERT INTO users (name, username, email, password, role) VALUES ($1, $2, $3, $4, 'admin') RETURNING id, username, email, role, created_at", [`System Admin (${username})`, username, generatedEmail, hashed]);
    res.status(201).json({ message: 'Admin created successfully', admin: result.rows[0] });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync-stats', async (req, res) => {
  try {
    const { fetchAllVerifiedStats } = require('../services/statsService');
    res.json({ message: 'Stats sync started. This may take a few minutes.' });
    fetchAllVerifiedStats().catch(err => console.error('[Admin Sync] Error:', err.message));
  } catch (err) {
    console.error('Sync stats error:', err);
    res.status(500).json({ error: err.message });
  }
});
