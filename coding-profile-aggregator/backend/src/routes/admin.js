const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');
const {
  sanitizeError,
  calculateScore,
  calculateRankings,
  SCORE_SQL,
  TOTAL_PROBLEMS_SQL,
  STATS_JOINS_SQL,
} = require('../utils/scoreUtils');

const router = express.Router();
router.use(authenticate, requireAdmin);

// Fix #14 — prevent unbounded queries
const clampLimit = (val, max = 500, defaultVal = 50) => Math.min(Math.max(parseInt(val) || defaultVal, 1), max);


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
    res.status(500).json({ error: sanitizeError(err, 'Failed to load admin stats.') });
  }
});





// GET /api/admin/users - USING EXACT SAME SQL AS PUBLIC LEADERBOARD
router.get('/users', async (req, res) => {
  try {
    const { course, section, year_of_passing, search, sort = 'name', order = 'asc', limit = 50, offset = 0 } = req.query;
    const safeLimit = clampLimit(limit, 500, 50);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);

    
    let whereClause = '';
    const params = [];
    
    if (course) { params.push(course); whereClause += ` AND u.course = $${params.length}`; }
    if (section) { params.push(section); whereClause += ` AND u.section = $${params.length}`; }
    if (year_of_passing) { params.push(parseInt(year_of_passing)); whereClause += ` AND u.year_of_passing = $${params.length}`; }
    if (search) { params.push(`%${search}%`); whereClause += ` AND (u.registration_no ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }
    
    const validSorts = ['name', 'email', 'course', 'section', 'year_of_passing', 'created_at', 'registration_no'];
    const sortColumn = validSorts.includes(sort) ? sort : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
    
    params.push(safeLimit, safeOffset);

    
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
      limit: safeLimit,
      offset: safeOffset,
    });
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to load users.') });
  }
});


// GET /api/admin/users/:id - ADMIN AUDIT PROFILE
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Admin Trace] Fetching audit profile for user ID: ${id} by Admin: ${req.user.id}`);
    
    // 1. Fetch basic user info
    const userResult = await pool.query(
      `SELECT id, name, email, registration_no, course, section, username, role, created_at 
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      console.warn(`[Admin Trace] User not found: ${id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // 2. Fetch all profiles
    const profilesResult = await pool.query(
      'SELECT id, platform, username, profile_url, verified FROM coding_profiles WHERE user_id = $1',
      [user.id]
    );

    // 3. Fetch all stats
    const statsResult = await pool.query(
      'SELECT platform, problems_solved, rating, easy_solved, medium_solved, hard_solved, submissions, active_days, badges, rank, last_updated, extra_data FROM stats WHERE user_id = $1',
      [user.id]
    );

    const statsMap = {};
    statsResult.rows.forEach(s => { 
      statsMap[s.platform] = { ...s };
    });

    // 4. Calculate cumulative totals
    const totalProblems = statsResult.rows.reduce((sum, s) => sum + (s.problems_solved || 0), 0);
    // Use shared calculateScore() for consistency with dashboard/leaderboard
    const score = calculateScore(statsMap);

    // 5. Calculate rankings using shared utility
    let rankings = null;
    try {
      rankings = await calculateRankings(user.id, user.course, user.section, totalProblems);
    } catch (rankErr) {
      console.error('Error calculating rankings for admin view:', rankErr);
    }

    res.json({ 
      user, 
      profiles: profilesResult.rows, 
      stats: statsMap, 
      totalProblems, 
      score: score.toFixed(2),
      rankings
    });
  } catch (err) {
    console.error('Admin user profile error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to load user profile.') });
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
      LIMIT 500
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
    res.status(500).json({ error: sanitizeError(err, 'Failed to load section data.') });
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
      LIMIT 500
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
    res.status(500).json({ error: sanitizeError(err, 'Failed to load course data.') });
  }
});


// GET /api/admin/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { course, section, metric = 'score', limit = 100 } = req.query;
    const safeLimit = clampLimit(limit, 500, 100);

    
    let whereClause = '';
    const params = [];
    
    if (course) { params.push(course); whereClause += ` AND u.course = $${params.length}`; }
    if (section) { params.push(section); whereClause += ` AND u.section = $${params.length}`; }
    
    params.push(safeLimit);
    
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
    res.status(500).json({ error: sanitizeError(err, 'Failed to load leaderboard.') });
  }
});


// Other admin routes (admins, create-admin, sync-stats, etc.)
router.get('/admins', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, username, email, role, created_at FROM users WHERE role = 'admin' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error('List admins error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to list admins.') });
  }
});


router.post('/create-admin', requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: sanitizeError(err, 'Failed to create admin.') });
  }
});


router.post('/sync-stats', async (req, res) => {
  try {
    const { fetchAllVerifiedStats } = require('../services/statsService');
    res.json({ message: 'Stats sync started. This may take a few minutes.' });
    fetchAllVerifiedStats().catch(err => console.error('[Admin Sync] Error:', err.message));
  } catch (err) {
    console.error('Sync stats error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to start sync.') });
  }
});


// GET /api/admin/language-filter - Filter students by programming language
router.get('/language-filter', async (req, res) => {
  try {
    console.log('[Language Filter] Request received:', req.query);
    
    const { language, minQuestions, course, year_of_passing } = req.query;
    
    // Build WHERE clause based on filters
    let whereClause = "u.role = 'user'";
    const queryParams = [];
    
    if (course) {
      queryParams.push(course);
      whereClause += ` AND u.course = $${queryParams.length}`;
    }

    if (year_of_passing) {
      queryParams.push(parseInt(year_of_passing));
      whereClause += ` AND u.year_of_passing = $${queryParams.length}`;
    }
    
    // Query all users with their LeetCode stats
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.registration_no,
        u.course,
        u.section,
        u.email,
        u.year_of_passing,
        s.extra_data
      FROM users u
      LEFT JOIN stats s ON u.id = s.user_id AND s.platform = 'leetcode'
      WHERE ${whereClause}
      ORDER BY u.name
    `, queryParams);
    
    console.log(`[Language Filter] Found ${result.rows.length} users`);
    
    // Extract language data from extra_data
    const students = result.rows.map(row => {
      const languageData = row.extra_data?.languageData || [];
      const languageMap = {};
      languageData.forEach(lang => {
        languageMap[lang.name] = lang.count;
      });
      
      return {
        id: row.id,
        name: row.name,
        registration_no: row.registration_no,
        course: row.course,
        section: row.section,
        email: row.email,
        year_of_passing: row.year_of_passing,
        languages: languageMap
      };
    });
    
    console.log(`[Language Filter] Processed ${students.length} students`);
    
// Filter by language and minimum questions
    const minQuestionsNum = parseInt(minQuestions) || 0;
    const filteredStudents = students.filter(student => {
      if (!language && minQuestionsNum === 0) {
        return true;
      }

      const count = language
        ? student.languages[language] || 0
        : Object.values(student.languages).reduce((sum, value) => sum + value, 0);

      return count >= minQuestionsNum;
    });
    
    console.log(`[Language Filter] Filtered to ${filteredStudents.length} students`);
    
    res.json({ 
      students: filteredStudents,
      filters: { language, minQuestions: minQuestionsNum, course, year_of_passing }
    });
    
  } catch (error) {
    console.error('[Language Filter] Error:', error);
    res.status(500).json({ error: sanitizeError(error, 'Failed to fetch language filter data.') });
  }
});


// GET /api/admin/available-years - Get list of all years of passing
router.get('/available-years', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT year_of_passing FROM users WHERE role = 'user' AND year_of_passing IS NOT NULL ORDER BY year_of_passing DESC`
    );
    const years = result.rows.map(r => r.year_of_passing);
    res.json({ years });
  } catch (error) {
    console.error('[Available Years] Error:', error);
    res.status(500).json({ error: sanitizeError(error, 'Failed to fetch available years.') });
  }
});


// GET /api/admin/available-languages - Get list of all programming languages
router.get('/available-languages', async (req, res) => {
  try {
    console.log('[Available Languages] Request received');
    
    // Fix #9 — Use JSONB path query to extract language names efficiently
    // instead of fetching entire extra_data column (which can be 10-50KB per user)
    const result = await pool.query(`
      SELECT DISTINCT jsonb_array_elements(extra_data->'languageData')->>'name' as language_name
      FROM stats
      WHERE platform = 'leetcode' AND extra_data IS NOT NULL AND extra_data->'languageData' IS NOT NULL
    `);
    
    console.log(`[Available Languages] Found ${result.rows.length} stats records`);
    
    const languages = result.rows
      .map(row => row.language_name)
      .filter(Boolean)
      .sort();
    
    console.log(`[Available Languages] Extracted ${languages.length} unique languages:`, languages);
    
    res.json({ languages });
    
  } catch (error) {
    console.error('[Available Languages] Error:', error);
    res.status(500).json({ error: sanitizeError(error, 'Failed to fetch available languages.') });
  }
});

// ─── Helper: Rankings ────────────────────────────────────────────────────────
// Fix #27 — calculateRankings is now imported from utils/scoreUtils.js
// (removed ~70 lines of duplicated code)

// PATCH /api/admin/users/:id/details - Update user details (year_of_passing, course, section, etc.)
router.patch('/users/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const { year_of_passing, course, section, name } = req.body;

    const updates = [];
    const params = [];

    if (year_of_passing !== undefined) {
      const yr = year_of_passing === '' || year_of_passing === null ? null : parseInt(year_of_passing);
      params.push(yr);
      updates.push(`year_of_passing = $${params.length}`);
    }
    if (course !== undefined) { params.push(course); updates.push(`course = $${params.length}`); }
    if (section !== undefined) { params.push(section); updates.push(`section = $${params.length}`); }
    if (name !== undefined) { params.push(name.trim()); updates.push(`name = $${params.length}`); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, name, email, course, section, year_of_passing`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Admin update user details error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to update user details.') });
  }
});


// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' }); // superadmin role removed
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [role, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `User role updated to ${role}`, user: result.rows[0] });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to update user role.') });
  }
});

module.exports = router;

