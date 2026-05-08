const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
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

// GET /api/dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    // Try cache first
    const cacheKey = `dashboard:${req.user.id}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const [userResult, profilesResult, statsResult, dailySubmissionsResult, contestHistoryResult] = await Promise.all([
      pool.query('SELECT id, name, email, registration_no, course, section FROM users WHERE id = $1', [req.user.id]),
      pool.query('SELECT * FROM coding_profiles WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT * FROM stats WHERE user_id = $1', [req.user.id]),
      pool.query(`
        SELECT submission_date, platform, SUM(count) as total_count
        FROM daily_submissions
        WHERE user_id = $1 AND submission_date >= CURRENT_DATE - INTERVAL '365 days'
        GROUP BY submission_date, platform
        ORDER BY submission_date DESC
      `, [req.user.id]),
      pool.query(`
        SELECT * FROM contest_history
        WHERE user_id = $1
        ORDER BY contest_date DESC
        LIMIT 10
      `, [req.user.id])
    ]);

    const user = userResult.rows[0];
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

    // Calculate cumulative totals
    const totalProblems = stats.reduce((sum, s) => sum + (s.problems_solved || 0), 0);
    const totalActiveDays = stats.reduce((sum, s) => sum + (s.active_days || 0), 0);
    const totalSubmissions = stats.reduce((sum, s) => sum + (s.submissions || 0), 0);
    const totalBadges = stats.reduce((sum, s) => sum + (s.badges || 0), 0);
    
    // Calculate max and current streak from daily submissions (shared util)
    const { maxStreak, currentStreak } = calculateStreaks(dailySubmissions);

    // Process heatmap data (shared util)
    const heatmapData = processHeatmapData(dailySubmissions);

    // Get contest data from extra_data and contest_history
    const contests = [];
    const contestRankings = {};

    // LeetCode contests
    if (statsMap.leetcode) {
      const lcExtra = statsMap.leetcode.extra_data || {};
      const lcContests = contestHistory.filter(c => c.platform === 'leetcode');
      const contestRating = lcExtra.contestRating || statsMap.leetcode.rating || 0;
      const maxContestRating = lcExtra.maxContestRating || contestRating;
      const contestsAttended = lcExtra.contestsAttended || lcContests.length || 0;
      
      contests.push({
        platform: 'leetcode',
        count: contestsAttended,
        rating: contestRating,
        ranking: lcExtra.globalRanking || 0
      });
      
      if (contestRating > 0 || contestsAttended > 0) {
        contestRankings.leetcode = {
          current: contestRating,
          max: maxContestRating,
          rank: lcExtra.globalRanking || 0
        };
      }
    }

    // Codeforces contests
    if (statsMap.codeforces) {
      const cfExtra = statsMap.codeforces.extra_data || {};
      const cfContests = contestHistory.filter(c => c.platform === 'codeforces');
      contests.push({
        platform: 'codeforces',
        count: cfContests.length || 0,
        rating: statsMap.codeforces.rating || 0,
        rank: cfExtra.rank || ''
      });
      if (statsMap.codeforces.rating > 0 || cfContests.length > 0) {
        contestRankings.codeforces = {
          current: statsMap.codeforces.rating || 0,
          max: cfExtra.maxRating || statsMap.codeforces.rating || 0,
          rank: cfExtra.rank || 'Unrated'
        };
      }
    }

    // CodeChef (if available)
    if (statsMap.codechef) {
      const ccExtra = statsMap.codechef.extra_data || {};
      const ccContests = contestHistory.filter(c => c.platform === 'codechef');
      const contestRating = ccExtra.currentRating || statsMap.codechef.rating || 0;
      const maxContestRating = ccExtra.maxRating || ccExtra.highestRating || contestRating;
      const contestsAttended = ccExtra.contestsAttended || ccContests.length || 0;
      
      contests.push({
        platform: 'codechef',
        count: contestsAttended,
        rating: contestRating
      });
      
      if (contestRating > 0 || contestsAttended > 0) {
        contestRankings.codechef = {
          current: contestRating,
          max: maxContestRating,
          rank: ccExtra.stars ? `${ccExtra.stars}★` : statsMap.codechef.rank || 'Unrated'
        };
      }
    }

    const totalContests = contests.reduce((sum, c) => sum + (c.count || 0), 0);

    // Calculate score (shared util — Fix #6)
    const score = calculateScore(statsMap);

    // Calculate rankings (shared util — Fix #10)
    const rankings = await calculateRankings(req.user.id, user.course, user.section, totalProblems);

    // DSA Topic Analysis (shared util)
    const dsaTopics = generateDSATopics(statsMap);

    // Aggregate badges from all platforms
    const allBadges = [];
    
    if (statsMap.leetcode?.extra_data?.badgeList) {
      allBadges.push(...statsMap.leetcode.extra_data.badgeList);
    }
    if (statsMap.codeforces?.extra_data?.badgeList) {
      allBadges.push(...statsMap.codeforces.extra_data.badgeList);
    }
    if (statsMap.geeksforgeeks?.extra_data?.badgeList) {
      allBadges.push(...statsMap.geeksforgeeks.extra_data.badgeList);
    }
    if (statsMap.hackerrank?.extra_data?.badgeList) {
      allBadges.push(...statsMap.hackerrank.extra_data.badgeList);
    }

    // Build response with conditional data
    const response = { 
      user, 
      profiles, 
      stats: statsMap, 
      totalProblems,
      totalActiveDays,
      totalSubmissions,
      totalBadges,
      maxStreak,
      currentStreak,
      heatmapData,
      allBadges,
      rankings,
      score 
    };

    if (totalContests > 0) {
      response.totalContests = totalContests;
      response.contests = contests;
    }
    if (Object.keys(contestRankings).length > 0) {
      response.contestRankings = contestRankings;
    }
    if (dsaTopics.length > 0) {
      response.dsaTopics = dsaTopics;
    }
    if (contestHistory.length > 0) {
      response.recentContests = contestHistory.slice(0, 5);
    }

    // Cache for 10 minutes
    await setCached(cacheKey, response, 600);
    res.json(response);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to load dashboard data.') });
  }
});

module.exports = router;
