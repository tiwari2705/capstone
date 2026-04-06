const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/stats
 * Get overall statistics for admin dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const [usersResult, profilesResult, statsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['user']),
      pool.query('SELECT COUNT(*) as total FROM coding_profiles WHERE verified = TRUE'),
      pool.query('SELECT SUM(problems_solved) as total FROM stats')
    ]);

    // Platform-wise usage
    const platformUsage = await pool.query(`
      SELECT platform, COUNT(*) as user_count, SUM(problems_solved) as total_problems
      FROM stats
      GROUP BY platform
      ORDER BY user_count DESC
    `);

    // Course-wise distribution
    const courseDistribution = await pool.query(`
      SELECT course, COUNT(*) as count
      FROM users
      WHERE role = 'user' AND course IS NOT NULL
      GROUP BY course
      ORDER BY count DESC
    `);

    // Section-wise distribution
    const sectionDistribution = await pool.query(`
      SELECT section, COUNT(*) as count
      FROM users
      WHERE role = 'user' AND section IS NOT NULL
      GROUP BY section
      ORDER BY section
    `);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].total),
      totalVerifiedProfiles: parseInt(profilesResult.rows[0].total),
      totalProblemsSolved: parseInt(statsResult.rows[0].total) || 0,
      platformUsage: platformUsage.rows,
      courseDistribution: courseDistribution.rows,
      sectionDistribution: sectionDistribution.rows
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/users
 * Get all users with optional filters
 * Query params: course, section, search, sort, limit, offset
 */
router.get('/users', async (req, res) => {
  try {
    const { course, section, search, sort = 'name', order = 'asc', limit = 50, offset = 0 } = req.query;

    let whereConditions = ["role = 'user'"];
    const params = [];
    let paramCount = 1;

    if (course) {
      params.push(course);
      whereConditions.push(`course = $${paramCount++}`);
    }

    if (section) {
      params.push(section);
      whereConditions.push(`section = $${paramCount++}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        registration_no ILIKE $${paramCount} OR 
        registration_no ILIKE $${paramCount} OR 
        name ILIKE $${paramCount} OR 
        email ILIKE $${paramCount}
      )`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Valid sort columns
    const validSorts = ['name', 'email', 'course', 'section', 'created_at', 'registration_no'];
    const sortColumn = validSorts.includes(sort) ? sort : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    params.push(parseInt(limit), parseInt(offset));

    const query = `
      SELECT 
        u.id, u.name, u.email, u.registration_no, u.registration_no, u.course, u.section, u.created_at,
        COUNT(DISTINCT cp.id) as verified_profiles,
        COALESCE(SUM(s.problems_solved), 0) as total_problems,
        COALESCE(SUM(s.score), 0) as total_score
      FROM users u
      LEFT JOIN coding_profiles cp ON u.id = cp.user_id AND cp.verified = TRUE
      LEFT JOIN stats s ON u.id = s.user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    const result = await pool.query(query, params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
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

/**
 * GET /api/admin/users/:identifier
 * Get specific user by registration_no, email, or ID
 */
router.get('/users/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find user by registration_no, registration_no, email, or ID
    const userResult = await pool.query(`
      SELECT id, name, email, registration_no, registration_no, course, section, role, created_at
      FROM users
      WHERE registration_no = $1 OR registration_no = $1 OR email = $1 OR id::text = $1
    `, [identifier]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's profiles
    const profilesResult = await pool.query(
      'SELECT * FROM coding_profiles WHERE user_id = $1',
      [user.id]
    );

    // Get user's stats
    const statsResult = await pool.query(
      'SELECT * FROM stats WHERE user_id = $1',
      [user.id]
    );

    // Build stats map
    const statsMap = {};
    statsResult.rows.forEach(s => { statsMap[s.platform] = s; });

    // Calculate totals
    const totalProblems = statsResult.rows.reduce((sum, s) => sum + (s.problems_solved || 0), 0);
    const totalScore = statsResult.rows.reduce((sum, s) => sum + parseFloat(s.score || 0), 0);

    res.json({
      user,
      profiles: profilesResult.rows,
      stats: statsMap,
      totalProblems,
      score: totalScore.toFixed(2)
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role (promote to admin or demote to user)
 */
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: `User role updated to ${role}`,
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/section/:section
 * Get all users in a specific section with their stats
 */
router.get('/section/:section', async (req, res) => {
  try {
    const { section } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.registration_no, u.registration_no, u.course, u.section,
        COUNT(DISTINCT cp.id) as verified_profiles,
        COALESCE(SUM(s.problems_solved), 0) as total_problems,
        COALESCE(SUM(s.score), 0) as total_score,
        COALESCE(AVG(s.rating), 0) as avg_rating
      FROM users u
      LEFT JOIN coding_profiles cp ON u.id = cp.user_id AND cp.verified = TRUE
      LEFT JOIN stats s ON u.id = s.user_id
      WHERE u.section = $1 AND u.role = 'user'
      GROUP BY u.id
      ORDER BY total_problems DESC
    `, [section]);

    // Calculate section statistics
    const sectionStats = {
      totalStudents: result.rows.length,
      totalProblems: result.rows.reduce((sum, u) => sum + parseInt(u.total_problems), 0),
      avgProblems: result.rows.length > 0 
        ? (result.rows.reduce((sum, u) => sum + parseInt(u.total_problems), 0) / result.rows.length).toFixed(2)
        : 0,
      topPerformer: result.rows[0] || null
    };

    res.json({
      section,
      stats: sectionStats,
      students: result.rows
    });
  } catch (err) {
    console.error('Admin section view error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/course/:course
 * Get all users in a specific course with aggregated stats
 */
router.get('/course/:course', async (req, res) => {
  try {
    const { course } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.registration_no, u.registration_no, u.course, u.section,
        COUNT(DISTINCT cp.id) as verified_profiles,
        COALESCE(SUM(s.problems_solved), 0) as total_problems,
        COALESCE(SUM(s.score), 0) as total_score,
        COALESCE(AVG(s.rating), 0) as avg_rating
      FROM users u
      LEFT JOIN coding_profiles cp ON u.id = cp.user_id AND cp.verified = TRUE
      LEFT JOIN stats s ON u.id = s.user_id
      WHERE u.course = $1 AND u.role = 'user'
      GROUP BY u.id
      ORDER BY total_problems DESC
    `, [course]);

    // Calculate course statistics
    const courseStats = {
      totalStudents: result.rows.length,
      totalProblems: result.rows.reduce((sum, u) => sum + parseInt(u.total_problems), 0),
      avgProblems: result.rows.length > 0 
        ? (result.rows.reduce((sum, u) => sum + parseInt(u.total_problems), 0) / result.rows.length).toFixed(2)
        : 0,
      topPerformer: result.rows[0] || null
    };

    // Section-wise breakdown
    const sectionBreakdown = await pool.query(`
      SELECT 
        u.section,
        COUNT(DISTINCT u.id) as student_count,
        COALESCE(SUM(s.problems_solved), 0) as total_problems
      FROM users u
      LEFT JOIN stats s ON u.id = s.user_id
      WHERE u.course = $1 AND u.role = 'user'
      GROUP BY u.section
      ORDER BY u.section
    `, [course]);

    res.json({
      course,
      stats: courseStats,
      sectionBreakdown: sectionBreakdown.rows,
      students: result.rows
    });
  } catch (err) {
    console.error('Admin course view error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/leaderboard
 * Get leaderboard with filters for admin view
 * Query params: course, section, metric (score, problems, rating)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { course, section, metric = 'score', limit = 100 } = req.query;

    let whereConditions = ["u.role = 'user'"];
    const params = [];
    let paramCount = 1;

    if (course) {
      params.push(course);
      whereConditions.push(`u.course = $${paramCount++}`);
    }

    if (section) {
      params.push(section);
      whereConditions.push(`u.section = $${paramCount++}`);
    }

    const whereClause = whereConditions.join(' AND ');

    let orderBy = 'total_score DESC';
    if (metric === 'problems') orderBy = 'total_problems DESC';
    if (metric === 'rating') orderBy = 'avg_rating DESC';

    params.push(parseInt(limit));

    const query = `
      SELECT 
        u.id, u.name, u.email, u.registration_no, u.registration_no, u.course, u.section,
        COALESCE(SUM(s.problems_solved), 0) as total_problems,
        COALESCE(SUM(s.score), 0) as total_score,
        COALESCE(AVG(s.rating), 0) as avg_rating,
        COUNT(DISTINCT cp.id) as verified_profiles
      FROM users u
      LEFT JOIN coding_profiles cp ON u.id = cp.user_id AND cp.verified = TRUE
      LEFT JOIN stats s ON u.id = s.user_id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY ${orderBy}
      LIMIT $${paramCount}
    `;

    const result = await pool.query(query, params);

    // Add rank
    const leaderboard = result.rows.map((row, index) => ({
      ...row,
      rank: index + 1
    }));

    res.json({
      leaderboard,
      filters: { course, section, metric },
      total: leaderboard.length
    });
  } catch (err) {
    console.error('Admin leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/admins
 * List all admins (superadmin only)
 */
router.get('/admins', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, username, email, role, created_at FROM users WHERE role IN ('admin', 'superadmin') ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error('List admins error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/create-admin
 * Create a new admin (superadmin only)
 */
router.post('/create-admin', requireSuperAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, `admin_${username}@admin.local`]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Admin username already exists' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const generatedEmail = `admin_${username}@admin.local`;
    const result = await pool.query(
      "INSERT INTO users (name, username, email, password, role) VALUES ($1, $2, $3, $4, 'admin') RETURNING id, username, email, role, created_at",
      [`System Admin (${username})`, username, generatedEmail, hashed]
    );

    res.status(201).json({ 
      message: 'Admin created successfully',
      admin: result.rows[0]
    });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
