const express = require('express');
const { pool } = require('../config/db');
const { getCached, setCached } = require('../services/cacheService');
const {
  calculateScore,
  calculateRankings,
  calculateStreaks,
  processHeatmapData,
  generateDSATopics,
  sanitizeError,
} = require('../utils/scoreUtils');

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
 * Returns full dashboard data for public viewing
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    const cacheKey = `public-profile:${identifier.toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    // Fix #3 — do NOT select email from this public query
    const userResult = await pool.query(
      `SELECT id, name, registration_no, course, section, username, created_at 
       FROM users 
       WHERE username = $1 OR registration_no = $1`,
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Fix #9 — explicit column list only
    const profilesResult = await pool.query(
      'SELECT id, platform, username, profile_url, verified FROM coding_profiles WHERE user_id = $1',
      [user.id]
    );

    const statsResult = await pool.query('SELECT * FROM stats WHERE user_id = $1', [user.id]);

    const dailySubmissionsResult = await pool.query(`
      SELECT submission_date, platform, SUM(count) as total_count
      FROM daily_submissions
      WHERE user_id = $1 AND submission_date >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY submission_date, platform
      ORDER BY submission_date DESC
    `, [user.id]);

    const contestHistoryResult = await pool.query(`
      SELECT * FROM contest_history
      WHERE user_id = $1
      ORDER BY contest_date DESC
      LIMIT 10
    `, [user.id]);

    const profiles = profilesResult.rows;
    const stats = statsResult.rows;
    const dailySubmissions = dailySubmissionsResult.rows;
    const contestHistory = contestHistoryResult.rows;

    // Build per-platform stats map
    const statsMap = {};
    stats.forEach(s => { 
      statsMap[s.platform] = {
        problems_solved: s.problems_solved || 0,
        rating: s.rating || 0,
        easy_solved: s.easy_solved || 0,
        medium_solved: s.medium_solved || 0,
        hard_solved: s.hard_solved || 0,
        submissions: s.submissions || 0,
        active_days: s.active_days || 0,
        badges: s.badges || 0,
        rank: s.rank || '',
        last_updated: s.last_updated,
        extra_data: s.extra_data || {}
      };
    });

    const totalProblems = stats.reduce((sum, s) => sum + (s.problems_solved || 0), 0);
    const totalActiveDays = stats.reduce((sum, s) => sum + (s.active_days || 0), 0);
    const totalSubmissions = stats.reduce((sum, s) => sum + (s.submissions || 0), 0);
    const totalBadges = stats.reduce((sum, s) => sum + (s.badges || 0), 0);
    
    const { maxStreak, currentStreak } = calculateStreaks(dailySubmissions);
    const heatmapData = processHeatmapData(dailySubmissions);

    const contests = [];
    const contestRankings = {};

    if (statsMap.leetcode) {
      const lcExtra = statsMap.leetcode.extra_data || {};
      const lcContests = contestHistory.filter(c => c.platform === 'leetcode');
      const contestRating = lcExtra.contestRating || statsMap.leetcode.rating || 0;
      const maxContestRating = lcExtra.maxContestRating || contestRating;
      const contestsAttended = lcExtra.contestsAttended || lcContests.length || 0;
      contests.push({ platform: 'leetcode', count: contestsAttended, rating: contestRating, ranking: lcExtra.globalRanking || 0 });
      if (contestRating > 0 || contestsAttended > 0) {
        contestRankings.leetcode = { current: contestRating, max: maxContestRating, rank: lcExtra.globalRanking || 0 };
      }
    }

    if (statsMap.codeforces) {
      const cfExtra = statsMap.codeforces.extra_data || {};
      const cfContests = contestHistory.filter(c => c.platform === 'codeforces');
      contests.push({ platform: 'codeforces', count: cfContests.length || 0, rating: statsMap.codeforces.rating || 0, rank: cfExtra.rank || '' });
      if (statsMap.codeforces.rating > 0 || cfContests.length > 0) {
        contestRankings.codeforces = { current: statsMap.codeforces.rating || 0, max: cfExtra.maxRating || statsMap.codeforces.rating || 0, rank: cfExtra.rank || 'Unrated' };
      }
    }

    if (statsMap.codechef) {
      const ccExtra = statsMap.codechef.extra_data || {};
      const ccContests = contestHistory.filter(c => c.platform === 'codechef');
      const contestRating = ccExtra.currentRating || statsMap.codechef.rating || 0;
      const maxContestRating = ccExtra.maxRating || ccExtra.highestRating || contestRating;
      const contestsAttended = ccExtra.contestsAttended || ccContests.length || 0;
      contests.push({ platform: 'codechef', count: contestsAttended, rating: contestRating });
      if (contestRating > 0 || contestsAttended > 0) {
        contestRankings.codechef = { current: contestRating, max: maxContestRating, rank: ccExtra.stars ? `${ccExtra.stars}★` : 'Unrated' };
      }
    }

    const totalContests = contests.reduce((sum, c) => sum + (c.count || 0), 0);

    // Fix #6 — use unified score formula
    const score = calculateScore(statsMap);
    const dsaTopics = generateDSATopics(statsMap);

    const allBadges = [];
    if (statsMap.leetcode?.extra_data?.badgeList) allBadges.push(...statsMap.leetcode.extra_data.badgeList);
    if (statsMap.codeforces?.extra_data?.badgeList) allBadges.push(...statsMap.codeforces.extra_data.badgeList);
    if (statsMap.geeksforgeeks?.extra_data?.badgeList) allBadges.push(...statsMap.geeksforgeeks.extra_data.badgeList);
    if (statsMap.hackerrank?.extra_data?.badgeList) allBadges.push(...statsMap.hackerrank.extra_data.badgeList);

    const rankings = await calculateRankings(user.id, user.course, user.section, totalProblems);

    const response = { 
      user: {
        name: user.name,
        registration_no: user.registration_no,
        course: user.course,
        section: user.section,
        username: user.username
      },
      profiles, stats: statsMap, totalProblems, totalActiveDays, totalSubmissions, totalBadges,
      maxStreak, currentStreak, heatmapData, allBadges, rankings, score 
    };

    if (totalContests > 0) { response.totalContests = totalContests; response.contests = contests; }
    if (Object.keys(contestRankings).length > 0) { response.contestRankings = contestRankings; }
    if (dsaTopics.length > 0) { response.dsaTopics = dsaTopics; }
    if (contestHistory.length > 0) { response.recentContests = contestHistory.slice(0, 5); }

    await setCached(cacheKey, response, 300);
    res.json(response);
  } catch (err) {
    console.error('Public profile error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to load profile.') });
  }
});

module.exports = router;
