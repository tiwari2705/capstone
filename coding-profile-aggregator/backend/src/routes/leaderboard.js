const express = require('express');
const { pool } = require('../config/db');
const { getCached, setCached } = require('../services/cacheService');
const { sanitizeError, SCORE_SQL, TOTAL_PROBLEMS_SQL, STATS_JOINS_SQL } = require('../utils/scoreUtils');
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
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);

    // Create cache key
    const cacheKey = `leaderboard:${sortCol}:${sortOrder}:${course || 'all'}:${section || 'all'}:${safeLimit}:${safeOffset}`;
    
    // Try cache first
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let whereClause = '';
    const params = [];
    if (course) { params.push(course); whereClause += ` AND u.course = $${params.length}`; }
    if (section) { params.push(section); whereClause += ` AND u.section = $${params.length}`; }

    // Fix #5 — Get total count FIRST with a separate COUNT query
    const countQuery = `
      SELECT COUNT(*) as total FROM users u
      WHERE u.role = 'user' ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice());

    params.push(safeLimit, safeOffset);

    // Fix #6 — Use unified SCORE_SQL that includes ALL 5 platforms
    const query = `
      SELECT
        u.id,
        u.name,
        u.course,
        u.section,
        u.registration_no,
        COALESCE(lc.problems_solved, 0) AS leetcode_problems,
        COALESCE(cf.rating, 0) AS codeforces_rating,
        COALESCE(cf.problems_solved, 0) AS codeforces_problems,
        COALESCE(gfg.problems_solved, 0) AS gfg_problems,
        COALESCE(gfg.score, gfg.problems_solved, 0) AS gfg_score,
        COALESCE(hr.problems_solved, 0) AS hackerrank_problems,
        COALESCE(cc.problems_solved, 0) AS codechef_problems,
        COALESCE(cc.rating, 0) AS codechef_rating,
        ${TOTAL_PROBLEMS_SQL} AS total_problems,
        ${SCORE_SQL} AS score,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN lcp.verified THEN 'leetcode' END,
          CASE WHEN cfp.verified THEN 'codeforces' END,
          CASE WHEN gfgp.verified THEN 'geeksforgeeks' END,
          CASE WHEN hrp.verified THEN 'hackerrank' END,
          CASE WHEN ccp.verified THEN 'codechef' END
        ], NULL) AS linked_platforms
      FROM users u
      ${STATS_JOINS_SQL}
      LEFT JOIN coding_profiles lcp ON lcp.user_id = u.id AND lcp.platform = 'leetcode'
      LEFT JOIN coding_profiles cfp ON cfp.user_id = u.id AND cfp.platform = 'codeforces'
      LEFT JOIN coding_profiles gfgp ON gfgp.user_id = u.id AND gfgp.platform = 'geeksforgeeks'
      LEFT JOIN coding_profiles hrp ON hrp.user_id = u.id AND hrp.platform = 'hackerrank'
      LEFT JOIN coding_profiles ccp ON ccp.user_id = u.id AND ccp.platform = 'codechef'
      WHERE u.role = 'user' ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);
    const ranked = result.rows.map((row, idx) => ({ rank: safeOffset + idx + 1, ...row }));

    // Fix #5 — total is now the REAL total count from DB, not just current page size
    const response = {
      leaderboard: ranked,
      total: parseInt(countResult.rows[0].total),
      limit: safeLimit,
      offset: safeOffset,
    };
    
    // Cache for 5 minutes
    await setCached(cacheKey, response, 300);
    
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err, 'Failed to load leaderboard.') });
  }
});

module.exports = router;
