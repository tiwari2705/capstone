const express = require('express');
const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Optional auth middleware — attaches user if token present, but doesn't block
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch { /* ignore */ }
  }
  next();
};

// GET /api/leaderboard
router.get('/', optionalAuth, async (req, res) => {
  const { sort = 'score', order = 'desc', course, section, limit = 50, offset = 0 } = req.query;
  try {
    const validSorts = ['score', 'total_problems', 'name'];
    const sortCol = validSorts.includes(sort) ? sort : 'score';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = '';
    const params = [];
    if (course) { params.push(course); whereClause += ` AND u.course = $${params.length}`; }
    if (section) { params.push(section); whereClause += ` AND u.section = $${params.length}`; }

    params.push(parseInt(limit), parseInt(offset));

    const query = `
      SELECT
        u.id,
        u.name,
        u.course,
        u.section,
        u.reg_no,
        COALESCE(lc.problems_solved, 0) AS leetcode_problems,
        COALESCE(cf.rating, 0) AS codeforces_rating,
        COALESCE(cf.problems_solved, 0) AS codeforces_problems,
        COALESCE(gfg.problems_solved, 0) AS gfg_problems,
        COALESCE(gfg.score, gfg.problems_solved, 0) AS gfg_score,
        (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0)) AS total_problems,
        ROUND(
          COALESCE(lc.problems_solved, 0) * 1.0 +
          COALESCE(cf.rating, 0) * 0.1 +
          COALESCE(gfg.problems_solved, 0) * 1.0,
          2
        ) AS score,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN lcp.verified THEN 'leetcode' END,
          CASE WHEN cfp.verified THEN 'codeforces' END,
          CASE WHEN gfgp.verified THEN 'geeksforgeeks' END
        ], NULL) AS linked_platforms
      FROM users u
      LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
      LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
      LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
      LEFT JOIN coding_profiles lcp ON lcp.user_id = u.id AND lcp.platform = 'leetcode'
      LEFT JOIN coding_profiles cfp ON cfp.user_id = u.id AND cfp.platform = 'codeforces'
      LEFT JOIN coding_profiles gfgp ON gfgp.user_id = u.id AND gfgp.platform = 'geeksforgeeks'
      WHERE u.role = 'user' ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);
    const ranked = result.rows.map((row, idx) => ({ rank: parseInt(offset) + idx + 1, ...row }));
    res.json({ leaderboard: ranked, total: ranked.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
