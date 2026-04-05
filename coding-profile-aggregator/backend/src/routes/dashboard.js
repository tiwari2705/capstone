const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    const [userResult, profilesResult, statsResult] = await Promise.all([
      pool.query('SELECT id, name, email, reg_no, course, section FROM users WHERE id = $1', [req.user.id]),
      pool.query('SELECT * FROM coding_profiles WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM stats WHERE user_id = $1', [req.user.id])
    ]);

    const user = userResult.rows[0];
    const profiles = profilesResult.rows;
    const stats = statsResult.rows;

    // Build per-platform stats map
    const statsMap = {};
    stats.forEach(s => { statsMap[s.platform] = s; });

    // Calculate totals
    const totalProblems = stats.reduce((sum, s) => sum + (s.problems_solved || 0), 0);
    const score = calculateScore(statsMap);

    res.json({ user, profiles, stats: statsMap, totalProblems, score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function calculateScore(statsMap) {
  const lc = statsMap['leetcode']?.problems_solved || 0;
  const cf = statsMap['codeforces']?.rating || 0;
  const gfg = statsMap['geeksforgeeks']?.score || statsMap['geeksforgeeks']?.problems_solved || 0;
  return parseFloat((lc * 1 + cf * 0.1 + gfg * 1).toFixed(2));
}

module.exports = router;
