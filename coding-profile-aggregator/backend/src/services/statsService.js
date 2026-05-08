/**
 * statsService.js
 * ---------------
 * Core data-fetching engine. Pulls coding stats from LeetCode, Codeforces,
 * and GeeksforGeeks, then upserts them into the database.
 *
 * Platform strategies:
 *  - LeetCode     → Official GraphQL API (no auth needed for public profiles)
 *  - Codeforces   → Official REST API (free, no key needed)
 *  - GFG          → Unofficial community API with cheerio scrape as fallback
 *
 * Known issues & mitigations:
 *  - LeetCode blocks requests without a browser-like User-Agent + Referer
 *  - Codeforces rate-limits at ~5 req/s; we use Promise.allSettled so one
 *    failure doesn't kill the other call
 *  - GFG has no official API; the community endpoint goes down occasionally,
 *    so we always have a scrape fallback
 *  - All fetchers have explicit timeouts so a hung request doesn't block the
 *    cron job forever
 */

const axios = require('axios');
const { pool } = require('../config/db');
const { fetchGFGStats } = require('./gfgScraper');
const { fetchHackerRankStats } = require('./hackerRankScraper');
const { fetchCodeChefStats } = require('./codechefScraper');
const { delay } = require('./browserManager');
const { deleteCached, clearPattern } = require('./cacheService');

// ─── Shared axios headers ────────────────────────────────────────────────────

// LeetCode rejects requests that don't look like they come from a browser.
// The Referer header is required — without it you get a 403.
const LEETCODE_HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://leetcode.com',
};

// GFG scraping needs a real UA or it returns a bot-detection page
const GFG_SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// ─── LeetCode ────────────────────────────────────────────────────────────────

/**
 * Fetches accepted submission counts from LeetCode's public GraphQL endpoint.
 *
 * The query asks for `acSubmissionNum` which returns an array like:
 *   [{ difficulty: "All", count: 150 }, { difficulty: "Easy", count: 80 }, ...]
 *
 * Why GraphQL and not REST? LeetCode doesn't have a public REST API.
 * The GraphQL endpoint at /graphql is what their own frontend uses.
 *
 * Possible failures:
 *  - 403 if headers are wrong
 *  - `matchedUser` is null if the username doesn't exist
 *  - Rate limiting (rare for single requests)
 */
const fetchLeetCodeStats = async (username) => {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        userCalendar {
          activeYears
          streak
          totalActiveDays
          submissionCalendar
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
        languageProblemCount {
          languageName
          problemsSolved
        }
        profile {
          ranking
          reputation
          userAvatar
        }
        badges {
          id
          displayName
          icon
          creationDate
        }
        upcomingBadges {
          name
          icon
        }
        tagProblemCounts {
          advanced {
            tagName
            tagSlug
            problemsSolved
          }
          intermediate {
            tagName
            tagSlug
            problemsSolved
          }
          fundamental {
            tagName
            tagSlug
            problemsSolved
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      { headers: LEETCODE_HEADERS, timeout: 15000 }
    );

    const matchedUser = res.data?.data?.matchedUser;
    if (!matchedUser) throw new Error(`LeetCode user "${username}" not found`);

    const acStats = matchedUser.submitStats?.acSubmissionNum || [];
    const find = (difficulty) => acStats.find(s => s.difficulty === difficulty)?.count || 0;

  const total     = find('All');
  const easy      = find('Easy');
  const medium    = find('Medium');
  const hard      = find('Hard');
  const ranking   = matchedUser.profile?.ranking || 0;
  const activeDays = matchedUser.userCalendar?.totalActiveDays || 0;
  const streak = matchedUser.userCalendar?.streak || 0;

  // Parse submission calendar (timestamp -> count)
  const submissionCalendar = matchedUser.userCalendar?.submissionCalendar || '{}';
  const dailySubmissions = JSON.parse(submissionCalendar);

  // Note: LeetCode removed userContestRanking and userContestRankingHistory from their API
  // Contest data is no longer available through GraphQL
  const contestRating = 0;
  const contestsAttended = 0;
  const globalRanking = 0;
  const maxContestRating = 0;

  // Extract badges
  const badges = matchedUser.badges || [];
  const badgeCount = badges.length;

  // Extract language statistics
  const languageStats = matchedUser.languageProblemCount || [];
  const languageData = languageStats
    .filter(lang => lang.problemsSolved > 0)
    .sort((a, b) => b.problemsSolved - a.problemsSolved)
    .map(lang => ({
      name: lang.languageName,
      count: lang.problemsSolved
    }));

  // Extract topic-wise data
  const topicData = [];
  const tagCounts = matchedUser.tagProblemCounts || {};
  
  ['advanced', 'intermediate', 'fundamental'].forEach(level => {
    if (tagCounts[level]) {
      tagCounts[level].forEach(tag => {
        if (tag.problemsSolved > 0) {
          topicData.push({
            name: tag.tagName,
            slug: tag.tagSlug,
            count: tag.problemsSolved,
            level: level
          });
        }
      });
    }
  });

  // Sort by count descending
  topicData.sort((a, b) => b.count - a.count);

  return {
    problems_solved: total,
    easy_solved:     easy,
    medium_solved:   medium,
    hard_solved:     hard,
    rating:          contestRating,
    submissions:     total,
    score:           total,
    active_days:     activeDays,
    badges:          badgeCount,
    extra: { 
      ranking, 
      activeDays, 
      streak,
      contestRating: contestRating,
      maxContestRating: maxContestRating,
      contestsAttended: contestsAttended,
      globalRanking: globalRanking,
      badgeList: badges.map(b => ({ name: b.displayName, icon: b.icon, date: b.creationDate })),
      topicData: topicData,
      languageData: languageData,
      dailySubmissions: dailySubmissions
    },
  };
  } catch (error) {
    console.error(`[LeetCode] Error fetching stats for ${username}:`, error.message);
    if (error.response) {
      console.error(`[LeetCode] Response status: ${error.response.status}`);
      console.error(`[LeetCode] Response data:`, JSON.stringify(error.response.data).substring(0, 500));
    }
    throw error;
  }
};

// ─── Codeforces ──────────────────────────────────────────────────────────────

const fetchCodeforcesStats = async (username) => {
  console.log(`[CF] Fetching stats for ${username}...`);
  
  // Call 1: Get rating info
  const infoRes = await axios.get(
    `https://codeforces.com/api/user.info?handles=${username}`,
    { timeout: 10000 }
  );

  console.log(`[CF] user.info response status: ${infoRes.data.status}`);

  let rating = 0, maxRating = 0, rank = '';
  const badges = [];

  if (infoRes.data.status === 'OK' && infoRes.data.result?.length > 0) {
    const user = infoRes.data.result[0];
    rating    = user.rating    || 0;
    maxRating = user.maxRating || 0;
    rank      = user.rank      || '';
    
    // Codeforces badges based on rank
    if (rank) {
      badges.push({
        name: `${rank} Rank`,
        icon: getRankIcon(rank),
        platform: 'codeforces',
        date: null
      });
    }
    
    // Add contribution badge if positive
    if (user.contribution > 0) {
      badges.push({
        name: `Contributor (+${user.contribution})`,
        icon: '🌟',
        platform: 'codeforces',
        date: null
      });
    }
    
    console.log(`[CF] Rating: ${rating}, Max: ${maxRating}, Rank: ${rank}`);
  } else if (infoRes.data.status === 'FAILED') {
    throw new Error(`Codeforces API error: ${infoRes.data.comment || 'User not found'}`);
  }

  // Wait 2.1 seconds to respect rate limit (1 req per 2 sec)
  console.log(`[CF] Waiting 2.1s for rate limit...`);
  await new Promise(resolve => setTimeout(resolve, 2100));

  // Call 2: Get submissions to count unique solved problems
  let submissions = 0, problems_solved = 0;

  try {
    const submissionsRes = await axios.get(
      `https://codeforces.com/api/user.status?handle=${username}&from=1&count=10000`,
      { timeout: 20000 }
    );

    console.log(`[CF] user.status response status: ${submissionsRes.data.status}`);

    if (submissionsRes.data.status === 'OK' && Array.isArray(submissionsRes.data.result)) {
      const subs = submissionsRes.data.result;
      submissions = subs.length;
      console.log(`[CF] Total submissions: ${submissions}`);

      // Deduplicate: same problem solved multiple times counts once
      const solvedSet = new Set(
        subs
          .filter(s => s.verdict === 'OK')
          .map(s => `${s.problem.contestId}-${s.problem.index}`)
      );
      problems_solved = solvedSet.size;
      console.log(`[CF] Unique problems solved: ${problems_solved}`);
    } else if (submissionsRes.data.status === 'FAILED') {
      console.warn(`[CF] user.status API error: ${submissionsRes.data.comment}`);
    }
  } catch (subErr) {
    // If submissions call fails (e.g., user has 0 submissions or rate limit hit),
    // we still return the rating data we got from user.info
    console.warn(`[CF] Submissions fetch failed for ${username}: ${subErr.message}`);
  }

  const result = {
    problems_solved,
    rating,
    easy_solved:   0,  // CF doesn't categorize by difficulty in the API
    medium_solved: 0,
    hard_solved:   0,
    submissions,
    score: rating * 0.1,  // score contribution = rating * 0.1
    badges: badges.length,
    extra: { maxRating, rank, badgeList: badges },
  };

  console.log(`[CF] Final result:`, result);
  return result;
};

function getRankIcon(rank) {
  const rankIcons = {
    'newbie': '🌱',
    'pupil': '📗',
    'specialist': '📘',
    'expert': '💙',
    'candidate master': '💜',
    'master': '🟠',
    'international master': '🟠',
    'grandmaster': '🔴',
    'international grandmaster': '🔴',
    'legendary grandmaster': '🏆'
  };
  return rankIcons[rank.toLowerCase()] || '⭐';
}

// ─── GeeksforGeeks, HackerRank, CodeChef ────────────────────────────────────
// These are imported from their respective scraper modules at the top of the file

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Fetches stats for a single user+platform and upserts into the stats table.
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE (upsert) so we never get duplicate
 * rows — the unique constraint is (user_id, platform).
 *
 * Returns the fetched data object so callers can use it immediately
 * (e.g. to return fresh stats in the API response after verification).
 */
const fetchAndStoreStats = async (userId, platform, username) => {
  const fetchers = {
    leetcode:      fetchLeetCodeStats,
    codeforces:    fetchCodeforcesStats,
    geeksforgeeks: fetchGFGStats,
    hackerrank:    fetchHackerRankStats,
    codechef:      fetchCodeChefStats,
  };

  const fetcher = fetchers[platform];
  if (!fetcher) throw new Error(`Unknown platform: "${platform}"`);

  console.log(`[Stats] Fetching ${platform} stats for user ${userId} (@${username})...`);

  let data;
  try {
    data = await fetcher(username);
  } catch (fetchErr) {
    console.error(`[Stats] ✗ ${platform}/@${username} fetch failed:`, fetchErr.message);
    // Log more details for debugging
    if (fetchErr.response) {
      console.error(`[Stats] Response status: ${fetchErr.response.status}`);
      console.error(`[Stats] Response data:`, JSON.stringify(fetchErr.response.data).substring(0, 500));
    }
    throw fetchErr;
  }

  // Get previous problem count BEFORE updating (for non-LeetCode platforms)
  let prevProblems = 0;
  if (platform !== 'leetcode') {
    const prevStatsResult = await pool.query(
      `SELECT problems_solved FROM stats WHERE user_id = $1 AND platform = $2`,
      [userId, platform]
    );
    prevProblems = prevStatsResult.rows[0]?.problems_solved || 0;
  }

  // Store main stats
  await pool.query(
    `INSERT INTO stats
       (user_id, platform, problems_solved, rating, easy_solved, medium_solved,
        hard_solved, submissions, score, badges, rank, active_days, extra_data, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
     ON CONFLICT (user_id, platform) DO UPDATE SET
       problems_solved = EXCLUDED.problems_solved,
       rating          = EXCLUDED.rating,
       easy_solved     = EXCLUDED.easy_solved,
       medium_solved   = EXCLUDED.medium_solved,
       hard_solved     = EXCLUDED.hard_solved,
       submissions     = EXCLUDED.submissions,
       score           = EXCLUDED.score,
       badges          = EXCLUDED.badges,
       rank            = EXCLUDED.rank,
       active_days     = EXCLUDED.active_days,
       extra_data      = EXCLUDED.extra_data,
       last_updated    = NOW()`,
    [
      userId, platform,
      data.problems_solved || 0,
      data.rating          || 0,
      data.easy_solved     || 0,
      data.medium_solved   || 0,
      data.hard_solved     || 0,
      data.submissions     || 0,
      data.score           || 0,
      data.badges          || 0,
      data.rank            || '',
      data.active_days     || 0,
      JSON.stringify(data.extra || {}),
    ]
  );

  // Store daily submissions (LeetCode only for now)
  if (platform === 'leetcode' && data.extra?.dailySubmissions) {
    console.log(`[Stats] Storing daily submissions for ${platform}/@${username}...`);
    const dailySubs = data.extra.dailySubmissions;
    const entries = Object.entries(dailySubs);

    if (entries.length > 0) {
      // Fix #6 — bulk upsert all days in a SINGLE query instead of N sequential inserts.
      // A typical user has 365+ days; the old loop issued 365+ individual DB round-trips
      // per user. With 1000 users this was 365,000+ queries on the nightly cron.
      //
      // We build a multi-row VALUES clause and send it as one parameterised query.
      // Postgres supports up to 65535 parameters; 365 days × 4 cols = 1460 params — safe.
      const paramValues = [];
      const placeholders = entries.map(([timestamp, count], idx) => {
        const date = new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0];
        const base = idx * 4;
        paramValues.push(userId, date, platform, parseInt(count));
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      });

      await pool.query(
        `INSERT INTO daily_submissions (user_id, submission_date, platform, count)
         VALUES ${placeholders.join(',')}
         ON CONFLICT (user_id, submission_date, platform)
         DO UPDATE SET count = EXCLUDED.count`,
        paramValues
      );
      console.log(`[Stats] ✓ Bulk-upserted ${entries.length} days of submissions in 1 query`);
    }
  }

  // For other platforms (Codeforces, GFG, HackerRank): Track activity based on problem count changes
  if (platform !== 'leetcode' && data.problems_solved > 0) {
    const newProblems = data.problems_solved - prevProblems;
    
    // If there are new problems solved, record activity for today
    if (newProblems > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      await pool.query(
        `INSERT INTO daily_submissions (user_id, submission_date, platform, count)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, submission_date, platform) 
         DO UPDATE SET count = GREATEST(daily_submissions.count, EXCLUDED.count)`,
        [userId, today, platform, newProblems]
      );
      
      console.log(`[Stats] ✓ Recorded ${newProblems} new problems for ${platform} on ${today}`);
    }
  }

  console.log(`[Stats] ✓ ${platform}/@${username}: ${data.problems_solved} problems, score=${data.score}`);
  
  // Fix #18 — only invalidate the user's dashboard cache here.
  // Leaderboard cache is cleared ONCE after the entire cron batch completes,
  // not 500 times per run (which previously caused Redis blocking via KEYS/SCAN).
  await deleteCached(`dashboard:${userId}`);
  // Also clear their public profile cache
  await deleteCached(`public-profile:${userId}`);
  
  return data;
};

/**
 * Batch-fetches stats for ALL verified profiles across all users.
 * Called by the cron job every 6 hours.
 *
 * Uses Promise.allSettled so one failing profile doesn't stop the rest.
 * Logs a summary at the end.
 */
const fetchAllVerifiedStats = async () => {
  const result = await pool.query(
    'SELECT user_id, platform, username FROM coding_profiles WHERE verified = TRUE'
  );

  if (result.rows.length === 0) {
    console.log('[Cron] No verified profiles to update.');
    return;
  }

  console.log(`[Cron] Updating stats for ${result.rows.length} verified profiles SEQUENTIALLY...`);

  let succeeded = 0;
  let failed = 0;

  for (const profile of result.rows) {
    try {
      await fetchAndStoreStats(profile.user_id, profile.platform, profile.username);
      succeeded++;
      await delay(3000);
    } catch (err) {
      console.error(`[Cron] Failed ${profile.platform}/@${profile.username}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[Cron] Done. ${succeeded} succeeded, ${failed} failed.`);

  // Fix #18 — clear leaderboard cache ONCE after the entire batch,
  // not per-user (which previously called clearPattern 500× per run)
  await clearPattern('leaderboard:*');
  console.log('[Cache] Leaderboard cache cleared after cron batch.');
};

/**
 * Fetches stats for all verified LeetCode profiles
 */
const fetchAllLeetCodeStats = async () => {
  const result = await pool.query(
    'SELECT user_id, username FROM coding_profiles WHERE verified = TRUE AND platform = $1',
    ['leetcode']
  );

  if (result.rows.length === 0) {
    console.log('[CRON-LeetCode] No verified LeetCode profiles to update.');
    return;
  }

  console.log(`[CRON-LeetCode] Updating ${result.rows.length} LeetCode profiles...`);
  let succeeded = 0, failed = 0;

  for (const profile of result.rows) {
    try {
      await fetchAndStoreStats(profile.user_id, 'leetcode', profile.username);
      succeeded++;
      await delay(1000);
    } catch (err) {
      console.error(`[CRON-LeetCode] Failed @${profile.username}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[CRON-LeetCode] Done. ${succeeded} succeeded, ${failed} failed.`);
};

/**
 * Fetches stats for all verified Codeforces profiles
 */
const fetchAllCodeforcesStats = async () => {
  const result = await pool.query(
    'SELECT user_id, username FROM coding_profiles WHERE verified = TRUE AND platform = $1',
    ['codeforces']
  );

  if (result.rows.length === 0) {
    console.log('[CRON-Codeforces] No verified Codeforces profiles to update.');
    return;
  }

  console.log(`[CRON-Codeforces] Updating ${result.rows.length} Codeforces profiles...`);
  let succeeded = 0, failed = 0;

  for (const profile of result.rows) {
    try {
      await fetchAndStoreStats(profile.user_id, 'codeforces', profile.username);
      succeeded++;
      await delay(2500);
    } catch (err) {
      console.error(`[CRON-Codeforces] Failed @${profile.username}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[CRON-Codeforces] Done. ${succeeded} succeeded, ${failed} failed.`);
};

/**
 * Fetches stats for all verified CodeChef profiles
 */
const fetchAllCodeChefStats = async () => {
  const result = await pool.query(
    'SELECT user_id, username FROM coding_profiles WHERE verified = TRUE AND platform = $1',
    ['codechef']
  );

  if (result.rows.length === 0) {
    console.log('[CRON-CodeChef] No verified CodeChef profiles to update.');
    return;
  }

  console.log(`[CRON-CodeChef] Updating ${result.rows.length} CodeChef profiles...`);
  let succeeded = 0, failed = 0;

  for (const profile of result.rows) {
    try {
      await fetchAndStoreStats(profile.user_id, 'codechef', profile.username);
      succeeded++;
      await delay(2000);
    } catch (err) {
      console.error(`[CRON-CodeChef] Failed @${profile.username}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[CRON-CodeChef] Done. ${succeeded} succeeded, ${failed} failed.`);
};

/**
 * Fetches stats for all verified GeeksforGeeks profiles
 */
const fetchAllGFGStats = async () => {
  const result = await pool.query(
    'SELECT user_id, username FROM coding_profiles WHERE verified = TRUE AND platform = $1',
    ['geeksforgeeks']
  );

  if (result.rows.length === 0) {
    console.log('[CRON-GFG] No verified GeeksforGeeks profiles to update.');
    return;
  }

  console.log(`[CRON-GFG] Updating ${result.rows.length} GeeksforGeeks profiles...`);
  let succeeded = 0, failed = 0;

  for (const profile of result.rows) {
    try {
      await fetchAndStoreStats(profile.user_id, 'geeksforgeeks', profile.username);
      succeeded++;
      await delay(2000);
    } catch (err) {
      console.error(`[CRON-GFG] Failed @${profile.username}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[CRON-GFG] Done. ${succeeded} succeeded, ${failed} failed.`);
};

/**
 * Fetches stats for all verified HackerRank profiles
 */
const fetchAllHackerRankStats = async () => {
  const result = await pool.query(
    'SELECT user_id, username FROM coding_profiles WHERE verified = TRUE AND platform = $1',
    ['hackerrank']
  );

  if (result.rows.length === 0) {
    console.log('[CRON-HackerRank] No verified HackerRank profiles to update.');
    return;
  }

  console.log(`[CRON-HackerRank] Updating ${result.rows.length} HackerRank profiles...`);
  let succeeded = 0, failed = 0;

  for (const profile of result.rows) {
    try {
      await fetchAndStoreStats(profile.user_id, 'hackerrank', profile.username);
      succeeded++;
      await delay(2000);
    } catch (err) {
      console.error(`[CRON-HackerRank] Failed @${profile.username}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[CRON-HackerRank] Done. ${succeeded} succeeded, ${failed} failed.`);
};

module.exports = { fetchAndStoreStats, fetchAllVerifiedStats, fetchLeetCodeStats, fetchCodeforcesStats, fetchGFGStats, fetchHackerRankStats, fetchCodeChefStats, fetchAllLeetCodeStats, fetchAllCodeforcesStats, fetchAllCodeChefStats, fetchAllGFGStats, fetchAllHackerRankStats };
