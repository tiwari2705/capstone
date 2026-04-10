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
 * Returns full dashboard data for public viewing
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Find user by username, email, or registration_no
    const userResult = await pool.query(
      `SELECT id, name, email, registration_no, course, section, username, created_at 
       FROM users 
       WHERE username = $1 OR email = $1 OR registration_no = $1`,
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Fetch all profiles (including unverified for completeness)
    const profilesResult = await pool.query(
      'SELECT * FROM coding_profiles WHERE user_id = $1',
      [user.id]
    );

    // Fetch all stats
    const statsResult = await pool.query(
      'SELECT * FROM stats WHERE user_id = $1',
      [user.id]
    );

    // Fetch daily submissions
    const dailySubmissionsResult = await pool.query(`
      SELECT submission_date, platform, SUM(count) as total_count
      FROM daily_submissions
      WHERE user_id = $1 AND submission_date >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY submission_date, platform
      ORDER BY submission_date DESC
    `, [user.id]);

    // Fetch contest history
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

    // Calculate cumulative totals
    const totalProblems = stats.reduce((sum, s) => sum + (s.problems_solved || 0), 0);
    const totalActiveDays = stats.reduce((sum, s) => sum + (s.active_days || 0), 0);
    const totalSubmissions = stats.reduce((sum, s) => sum + (s.submissions || 0), 0);
    const totalBadges = stats.reduce((sum, s) => sum + (s.badges || 0), 0);
    
    // Calculate max and current streak from daily submissions
    const { maxStreak, currentStreak } = calculateStreaks(dailySubmissions);

    // Process heatmap data
    const heatmapData = processHeatmapData(dailySubmissions);

    // Get contest data
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

    // CodeChef
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
          rank: ccExtra.stars ? `${ccExtra.stars}★` : 'Unrated'
        };
      }
    }

    const totalContests = contests.reduce((sum, c) => sum + (c.count || 0), 0);

    // Calculate score
    const score = calculateScore(statsMap);

    // DSA Topic Analysis
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

    // Calculate rankings
    const rankings = await calculateRankings(user.id, user.course, user.section, totalProblems);

    // Build response
    const response = { 
      user: {
        name: user.name,
        email: user.email,
        registration_no: user.registration_no,
        course: user.course,
        section: user.section,
        username: user.username
      },
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

    // Only include these if data exists
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

    res.json(response);
  } catch (err) {
    console.error('Public profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions (same as dashboard.js)
function calculateStreaks(dailySubmissions) {
  if (dailySubmissions.length === 0) {
    return { maxStreak: 0, currentStreak: 0 };
  }

  const dateMap = {};
  dailySubmissions.forEach(sub => {
    const date = sub.submission_date.toISOString().split('T')[0];
    dateMap[date] = (dateMap[date] || 0) + sub.total_count;
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

function processHeatmapData(dailySubmissions) {
  const heatmap = {};
  
  dailySubmissions.forEach(sub => {
    const date = sub.submission_date.toISOString().split('T')[0];
    heatmap[date] = (heatmap[date] || 0) + parseInt(sub.total_count || 0);
  });

  return Object.entries(heatmap).map(([date, count]) => ({
    date,
    count
  }));
}

function calculateScore(statsMap) {
  const lc = statsMap['leetcode']?.problems_solved || 0;
  const cf = statsMap['codeforces']?.rating || 0;
  const gfg = statsMap['geeksforgeeks']?.score || statsMap['geeksforgeeks']?.problems_solved || 0;
  const hr = statsMap['hackerrank']?.problems_solved || 0;
  return parseFloat((lc * 1 + cf * 0.1 + gfg * 1 + hr * 1).toFixed(2));
}

function generateDSATopics(statsMap) {
  const leetcodeStats = statsMap.leetcode || {};
  const leetcodeExtra = leetcodeStats.extra_data || {};
  
  if (leetcodeExtra.topicData && leetcodeExtra.topicData.length > 0) {
    return leetcodeExtra.topicData
      .slice(0, 20)
      .map(topic => ({
        name: topic.name,
        count: topic.count,
        color: '#3b82f6'
      }));
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

async function calculateRankings(userId, userCourse, userSection, userTotalProblems) {
  try {
    // Overall ranking - count users with more problems
    const overallRankResult = await pool.query(`
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT u.id,
          (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0)) AS total_problems
        FROM users u
        LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
        LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
        LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
        LEFT JOIN stats hr ON hr.user_id = u.id AND hr.platform = 'hackerrank'
        LEFT JOIN stats cc ON cc.user_id = u.id AND cc.platform = 'codechef'
        WHERE u.role = 'user'
      ) as ranked_users
      WHERE total_problems > $1
    `, [userTotalProblems]);

    const overallTotalResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM users
      WHERE role = 'user'
    `);

    // Course-wise ranking
    const courseRankResult = await pool.query(`
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT u.id,
          (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0)) AS total_problems
        FROM users u
        LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
        LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
        LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
        LEFT JOIN stats hr ON hr.user_id = u.id AND hr.platform = 'hackerrank'
        LEFT JOIN stats cc ON cc.user_id = u.id AND cc.platform = 'codechef'
        WHERE u.role = 'user' AND u.course = $1
      ) as ranked_users
      WHERE total_problems > $2
    `, [userCourse, userTotalProblems]);

    const courseTotalResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM users
      WHERE role = 'user' AND course = $1
    `, [userCourse]);

    // Section-wise ranking
    const sectionRankResult = await pool.query(`
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT u.id,
          (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0) + COALESCE(hr.problems_solved, 0) + COALESCE(cc.problems_solved, 0)) AS total_problems
        FROM users u
        LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
        LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
        LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
        LEFT JOIN stats hr ON hr.user_id = u.id AND hr.platform = 'hackerrank'
        LEFT JOIN stats cc ON cc.user_id = u.id AND cc.platform = 'codechef'
        WHERE u.role = 'user' AND u.section = $1
      ) as ranked_users
      WHERE total_problems > $2
    `, [userSection, userTotalProblems]);

    const sectionTotalResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM users
      WHERE role = 'user' AND section = $1
    `, [userSection]);

    return {
      overall: {
        rank: parseInt(overallRankResult.rows[0].rank),
        total: parseInt(overallTotalResult.rows[0].total)
      },
      course: {
        rank: parseInt(courseRankResult.rows[0].rank),
        total: parseInt(courseTotalResult.rows[0].total),
        name: userCourse
      },
      section: {
        rank: parseInt(sectionRankResult.rows[0].rank),
        total: parseInt(sectionTotalResult.rows[0].total),
        name: userSection
      }
    };
  } catch (error) {
    console.error('Error calculating rankings:', error);
    return {
      overall: { rank: 0, total: 0 },
      course: { rank: 0, total: 0, name: userCourse },
      section: { rank: 0, total: 0, name: userSection }
    };
  }
}

module.exports = router;
