const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

/**
 * GET /api/profile/:identifier
 * 
 * Public profile route (no authentication required)
 * 
 * Identifier can be:
 * - username
 * - email
 * - registration number
 * 
 * Returns user info, verified profiles, and aggregated stats
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Find user by username, email, or reg_no
    const userResult = await pool.query(
      `SELECT id, name, email, reg_no, course, section, username, created_at 
       FROM users 
       WHERE username = $1 OR email = $1 OR reg_no = $1`,
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Fetch all verified profiles
    const profilesResult = await pool.query(
      'SELECT platform, username, profile_url, verified FROM coding_profiles WHERE user_id = $1 AND verified = TRUE',
      [user.id]
    );

    // Fetch all stats
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
    const totalBadges = statsResult.rows.reduce((sum, s) => sum + (s.badges || 0), 0);

    res.json({
      user: {
        name: user.name,
        course: user.course,
        section: user.section,
        reg_no: user.reg_no,
        username: user.username,
        joined: user.created_at
      },
      profiles: profilesResult.rows,
      stats: statsMap,
      aggregated: {
        totalProblems,
        totalScore: totalScore.toFixed(2),
        totalBadges,
        platformCount: profilesResult.rows.length
      }
    });
  } catch (err) {
    console.error('Public profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
