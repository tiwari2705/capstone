/**
 * scoreUtils.js
 * -------------
 * Fix #6 & #27 — Single source of truth for score calculation and ranking queries.
 * Previously duplicated across dashboard.js, publicProfile.js, admin.js, and leaderboard.js
 * with INCONSISTENT formulas (leaderboard excluded HackerRank & CodeChef).
 *
 * Unified formula:
 *   score = LC_problems × 1.0 + CF_rating × 0.1 + GFG_problems × 1.0
 *         + HR_problems × 1.0 + CC_rating × 0.1
 */

const { pool } = require('../config/db');

/**
 * Calculate a user's aggregated score from their per-platform stats map.
 * @param {Object} statsMap - { leetcode: { problems_solved, rating, ... }, ... }
 * @returns {number} - rounded to 2 decimal places
 */
function calculateScore(statsMap) {
  const lc  = statsMap['leetcode']?.problems_solved || 0;
  const cf  = statsMap['codeforces']?.rating || 0;
  const gfg = statsMap['geeksforgeeks']?.score || statsMap['geeksforgeeks']?.problems_solved || 0;
  const hr  = statsMap['hackerrank']?.problems_solved || 0;
  const cc  = statsMap['codechef']?.rating || 0;
  return parseFloat((lc * 1.0 + cf * 0.1 + gfg * 1.0 + hr * 1.0 + cc * 0.1).toFixed(2));
}

/**
 * SQL fragment for calculating score inline (for leaderboard/admin queries).
 * Must match the JS formula above exactly.
 */
const SCORE_SQL = `
  ROUND(
    COALESCE(lc.problems_solved, 0) * 1.0 +
    COALESCE(cf.rating, 0) * 0.1 +
    COALESCE(gfg.problems_solved, 0) * 1.0 +
    COALESCE(hr.problems_solved, 0) * 1.0 +
    COALESCE(cc.rating, 0) * 0.1,
    2
  )`;

/**
 * SQL fragment for total problems across all platforms.
 */
const TOTAL_PROBLEMS_SQL = `
  (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0))`;

/**
 * SQL JOINs needed for the score/ranking queries.
 * Uses LEFT JOIN so users without stats on a platform still appear.
 */
const STATS_JOINS_SQL = `
  LEFT JOIN stats lc  ON lc.user_id  = u.id AND lc.platform  = 'leetcode'
  LEFT JOIN stats cf  ON cf.user_id  = u.id AND cf.platform  = 'codeforces'
  LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
  LEFT JOIN stats hr  ON hr.user_id  = u.id AND hr.platform  = 'hackerrank'
  LEFT JOIN stats cc  ON cc.user_id  = u.id AND cc.platform  = 'codechef'`;

/**
 * Calculate overall, course, and section rankings for a user.
 * Fix #10 — this was duplicated across 3 files with slight inconsistencies.
 *
 * @param {number} userId
 * @param {string} userCourse
 * @param {string} userSection
 * @param {number} userTotalProblems
 * @returns {{ overall, course, section }}
 */
async function calculateRankings(userId, userCourse, userSection, userTotalProblems) {
  try {
    const rankQuery = (whereExtra = '', extraParams = []) => {
      const baseParams = [userTotalProblems, ...extraParams];
      return pool.query(`
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT u.id, ${TOTAL_PROBLEMS_SQL} AS total_problems
          FROM users u
          ${STATS_JOINS_SQL}
          WHERE u.role = 'user' ${whereExtra}
        ) as ranked_users
        WHERE total_problems > $1
      `, baseParams);
    };

    const countQuery = (whereExtra = '', extraParams = []) => {
      return pool.query(
        `SELECT COUNT(*) as total FROM users WHERE role = 'user' ${whereExtra}`,
        extraParams
      );
    };

    // Run all 6 queries in parallel instead of sequentially (Fix #10 performance)
    const [overallRank, overallTotal, courseRank, courseTotal, sectionRank, sectionTotal] =
      await Promise.all([
        rankQuery(),
        countQuery(),
        rankQuery('AND u.course = $2', [userCourse]),
        countQuery('AND course = $1', [userCourse]),
        rankQuery('AND u.section = $2', [userSection]),
        countQuery('AND section = $1', [userSection]),
      ]);

    return {
      overall: {
        rank: parseInt(overallRank.rows[0].rank),
        total: parseInt(overallTotal.rows[0].total),
      },
      course: {
        rank: parseInt(courseRank.rows[0].rank),
        total: parseInt(courseTotal.rows[0].total),
        name: userCourse,
      },
      section: {
        rank: parseInt(sectionRank.rows[0].rank),
        total: parseInt(sectionTotal.rows[0].total),
        name: userSection,
      },
    };
  } catch (error) {
    console.error('Error calculating rankings:', error);
    return {
      overall: { rank: 0, total: 0 },
      course:  { rank: 0, total: 0, name: userCourse },
      section: { rank: 0, total: 0, name: userSection },
    };
  }
}

/**
 * Calculate streak data from daily submission rows.
 */
function calculateStreaks(dailySubmissions) {
  if (dailySubmissions.length === 0) {
    return { maxStreak: 0, currentStreak: 0 };
  }

  const dateMap = {};
  dailySubmissions.forEach(sub => {
    const date = sub.submission_date.toISOString().split('T')[0];
    dateMap[date] = (dateMap[date] || 0) + (parseInt(sub.total_count) || 0);
  });

  const dates = Object.keys(dateMap).sort().reverse();

  let maxStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  const today = new Date().toISOString().split('T')[0];
  let isCurrentStreakActive = dates[0] === today || dates[0] === getPreviousDate(today);

  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
      if (isCurrentStreakActive) currentStreak = 1;
    } else {
      const prevDate = dates[i - 1];
      const currDate = dates[i];

      if (getPreviousDate(prevDate) === currDate) {
        tempStreak++;
        if (isCurrentStreakActive && i < 100) currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
        isCurrentStreakActive = false;
      }
    }
  }

  maxStreak = Math.max(maxStreak, tempStreak);
  return { maxStreak, currentStreak };
}

function getPreviousDate(dateStr) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Process daily submissions into heatmap format.
 */
function processHeatmapData(dailySubmissions) {
  const heatmap = {};
  dailySubmissions.forEach(sub => {
    const date = sub.submission_date.toISOString().split('T')[0];
    heatmap[date] = (heatmap[date] || 0) + parseInt(sub.total_count || 0);
  });
  return Object.entries(heatmap).map(([date, count]) => ({ date, count }));
}

/**
 * Generate DSA topic analysis from LeetCode stats.
 */
function generateDSATopics(statsMap) {
  const leetcodeStats = statsMap.leetcode || {};
  const leetcodeExtra = leetcodeStats.extra_data || {};

  if (leetcodeExtra.topicData && leetcodeExtra.topicData.length > 0) {
    return leetcodeExtra.topicData
      .slice(0, 20)
      .map(topic => ({ name: topic.name, count: topic.count, color: '#3b82f6' }));
  }

  const total = leetcodeStats.problems_solved || 0;
  if (total === 0) return [];

  return [
    { name: 'Arrays', count: Math.floor(total * 0.25), color: '#3b82f6' },
    { name: 'String', count: Math.floor(total * 0.15), color: '#3b82f6' },
    { name: 'Math', count: Math.floor(total * 0.12), color: '#3b82f6' },
    { name: 'HashMap and Set', count: Math.floor(total * 0.10), color: '#3b82f6' },
    { name: 'Sorting', count: Math.floor(total * 0.08), color: '#3b82f6' },
    { name: 'Dynamic Programming', count: Math.floor(total * 0.07), color: '#3b82f6' },
    { name: 'Binary Search', count: Math.floor(total * 0.06), color: '#3b82f6' },
    { name: 'Two Pointers', count: Math.floor(total * 0.05), color: '#3b82f6' },
    { name: 'Bit Manipulation', count: Math.floor(total * 0.04), color: '#3b82f6' },
    { name: 'Simulation', count: Math.floor(total * 0.03), color: '#3b82f6' },
    { name: 'Greedy', count: Math.floor(total * 0.02), color: '#3b82f6' },
    { name: 'Stack', count: Math.floor(total * 0.02), color: '#3b82f6' },
    { name: 'Tree', count: Math.floor(total * 0.01), color: '#3b82f6' },
  ].filter(t => t.count > 0);
}

/**
 * Sanitize error messages for production (never expose raw DB errors).
 */
const sanitizeError = (err, defaultMsg = 'An internal server error occurred') => {
  if (process.env.NODE_ENV === 'production') return defaultMsg;
  return err.message || defaultMsg;
};

module.exports = {
  calculateScore,
  calculateRankings,
  calculateStreaks,
  processHeatmapData,
  generateDSATopics,
  sanitizeError,
  getPreviousDate,
  SCORE_SQL,
  TOTAL_PROBLEMS_SQL,
  STATS_JOINS_SQL,
};
