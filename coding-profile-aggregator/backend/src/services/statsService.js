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
const cheerio = require('cheerio');
const { pool } = require('../config/db');
const { fetchGFGStatsWithRetry } = require('./gfgScraper');
const { fetchHackerRankStatsWithRetry } = require('./hackerRankScraper');
const { fetchCodeChefStatsWithRetry } = require('./codechefScraper');

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
        userContestRanking {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
        }
        userContestRankingHistory {
          attended
          rating
          ranking
          trendDirection
          problemsSolved
          totalProblems
          finishTimeInSeconds
          contest {
            title
            startTime
          }
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

  // Extract contest rating
  const contestRanking = matchedUser.userContestRanking || {};
  const contestRating = Math.round(contestRanking.rating || 0);
  const contestsAttended = contestRanking.attendedContestsCount || 0;
  const globalRanking = contestRanking.globalRanking || 0;
  
  // Extract contest history to find max rating
  const contestHistory = matchedUser.userContestRankingHistory || [];
  const maxContestRating = contestHistory.length > 0
    ? Math.round(Math.max(...contestHistory.map(c => c.rating || 0)))
    : contestRating;

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
};

// ─── Codeforces ──────────────────────────────────────────────────────────────

/**
 * Fetches rating and solved problem count from the official Codeforces API.
 *
 * Two API calls run in parallel:
 *  1. user.info  → current rating, max rating, rank title
 *  2. user.status → last 10,000 submissions (we deduplicate to count unique solved)
 *
 * Why deduplicate? A user might solve the same problem 5 times.
 * We use a Set keyed by `contestId-problemIndex` to count unique problems.
 *
 * Why Promise.allSettled instead of Promise.all?
 * If submissions call fails (e.g. user has 0 submissions), we still want
 * the rating from user.info. allSettled lets both resolve independently.
 *
 * Codeforces API returns status: "FAILED" for invalid handles — we check that.
 */
/**
 * Fetches rating and solved problem count from the official Codeforces API.
 *
 * Two API calls made SEQUENTIALLY (not parallel) to respect rate limit:
 *  1. user.info  → current rating, max rating, rank title
 *  2. user.status → last 10,000 submissions (we deduplicate to count unique solved)
 *
 * Why deduplicate? A user might solve the same problem 5 times.
 * We use a Set keyed by `contestId-problemIndex` to count unique problems.
 *
 * CRITICAL: Codeforces API rate limit is 1 request per 2 seconds.
 * We add a 2.1-second delay between calls to avoid "Call limit exceeded" errors.
 */
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

// ─── GeeksforGeeks ───────────────────────────────────────────────────────────

// ─── GeeksforGeeks ───────────────────────────────────────────────────────────

/**
 * Fetches GFG stats using Puppeteer-based scraping.
 * 
 * WHY PUPPETEER?
 * GFG renders stats dynamically with JavaScript. The data is NOT in the static
 * HTML response, so cheerio/axios scraping returns empty values.
 * 
 * APPROACH:
 * 1. Try community API first (fast, but unreliable)
 * 2. Fall back to Puppeteer scraping (slower, but works)
 * 
 * CACHING:
 * The gfgScraper module has built-in 5-minute caching to reduce browser launches.
 * 
 * PERFORMANCE:
 * - First request: ~3-5 seconds (browser launch + page load)
 * - Cached requests: <100ms
 * - Subsequent requests (browser reused): ~1-2 seconds
 */
const fetchGFGStats = async (username) => {
  console.log(`[GFG] Fetching stats for ${username}...`);
  
  // ── Attempt 1: Community API (fast but often fails) ──────────────────────
  try {
    console.log(`[GFG] Trying community API...`);
    const res = await axios.get(
      `https://geeks-for-geeks-stats-api.vercel.app/?raw=Y&userName=${username}`,
      { timeout: 10000 }
    );
    const d = res.data;

    console.log(`[GFG] Community API response status:`, d.status || 'success');

    // Check if API returned valid data
    if (d.status !== 'error' && (d.totalProblemsSolved || d.codingScore)) {
      const problems_solved = parseInt(d.totalProblemsSolved) || 0;
      const score = parseInt(d.codingScore) || problems_solved;

      const safeInt = (v) => parseInt(v) || 0;

      // GFG badges based on score milestones
      const badges = [];
      if (score >= 1000) badges.push({ name: '1000+ Score', icon: '🏆', platform: 'gfg' });
      if (score >= 500) badges.push({ name: '500+ Score', icon: '🥇', platform: 'gfg' });
      if (score >= 100) badges.push({ name: '100+ Score', icon: '🥈', platform: 'gfg' });
      if (d.currentStreak >= 30) badges.push({ name: '30 Day Streak', icon: '🔥', platform: 'gfg' });
      if (d.currentStreak >= 7) badges.push({ name: '7 Day Streak', icon: '⚡', platform: 'gfg' });

      const result = {
        problems_solved,
        rating: 0,
        easy_solved: safeInt(d.School) + safeInt(d.Basic),
        medium_solved: safeInt(d.Easy) + safeInt(d.Medium),
        hard_solved: safeInt(d.Hard),
        submissions: problems_solved,
        score,
        badges: badges.length,
        extra: {
          codingScore: score,
          currentStreak: d.currentStreak || 0,
          maxStreak: d.maxStreak || 0,
          monthlyScore: d.monthlyScore || 0,
          source: 'community-api',
          badgeList: badges
        },
      };

      console.log(`[GFG] ✓ Community API success:`, result);
      return result;
    }
  } catch (apiErr) {
    console.warn(`[GFG] Community API failed: ${apiErr.message}`);
  }

  // ── Attempt 2: Puppeteer Scraping (reliable but slower) ──────────────────
  console.log(`[GFG] Falling back to Puppeteer scraping...`);
  
  try {
    const scrapedData = await fetchGFGStatsWithRetry(username);
    
    if (!scrapedData) {
      throw new Error(`Profile not found or stats not available for "${username}"`);
    }

    const problems_solved = scrapedData.problemsSolved || 0;
    const score = scrapedData.codingScore || problems_solved;

    // GFG badges based on score
    const badges = [];
    if (score >= 1000) badges.push({ name: '1000+ Score', icon: '🏆', platform: 'gfg' });
    if (score >= 500) badges.push({ name: '500+ Score', icon: '🥇', platform: 'gfg' });
    if (score >= 100) badges.push({ name: '100+ Score', icon: '🥈', platform: 'gfg' });

    const result = {
      problems_solved,
      rating: 0,
      easy_solved: 0,
      medium_solved: 0,
      hard_solved: 0,
      submissions: problems_solved,
      score,
      badges: badges.length,
      extra: {
        codingScore: score,
        scrapedAt: scrapedData.scrapedAt,
        source: 'puppeteer',
        badgeList: badges
      },
    };

    console.log(`[GFG] ✓ Puppeteer success:`, result);
    return result;

  } catch (scrapeErr) {
    console.error(`[GFG] ✗ Puppeteer scraping failed:`, scrapeErr.message);
    throw new Error(`GFG fetch failed for "${username}": ${scrapeErr.message}`);
  }
};

// ─── HackerRank ──────────────────────────────────────────────────────────────

/**
 * Fetches HackerRank stats using Puppeteer-based scraping.
 * 
 * WHY PUPPETEER?
 * HackerRank doesn't have a public API. We use browser automation to extract
 * profile stats from the rendered page.
 * 
 * EXTRACTED DATA:
 * - Problems solved
 * - Badges/certificates
 * - Rank
 * 
 * CACHING:
 * Built-in 5-minute caching to reduce browser launches.
 */
const fetchHackerRankStats = async (username) => {
  console.log(`[HackerRank] Fetching stats for ${username}...`);
  
  try {
    const scrapedData = await fetchHackerRankStatsWithRetry(username);
    
    if (!scrapedData) {
      throw new Error(`Profile not found or stats not available for "${username}"`);
    }

    // HackerRank badges based on stars/certificates
    const badges = [];
    const badgeCount = scrapedData.badges || 0;
    
    if (badgeCount >= 10) badges.push({ name: '10+ Badges', icon: '🏆', platform: 'hackerrank' });
    if (badgeCount >= 5) badges.push({ name: '5+ Badges', icon: '🥇', platform: 'hackerrank' });
    if (badgeCount >= 1) badges.push({ name: 'Certified', icon: '⭐', platform: 'hackerrank' });
    
    if (scrapedData.problemsSolved >= 100) badges.push({ name: '100+ Problems', icon: '💯', platform: 'hackerrank' });
    if (scrapedData.problemsSolved >= 50) badges.push({ name: '50+ Problems', icon: '🎯', platform: 'hackerrank' });

    const result = {
      problems_solved: scrapedData.problemsSolved || 0,
      rating: 0,
      easy_solved: 0,
      medium_solved: 0,
      hard_solved: 0,
      submissions: scrapedData.problemsSolved || 0,
      score: scrapedData.problemsSolved || 0,
      badges: badges.length,
      rank: scrapedData.rank || '',
      extra: {
        badges: badgeCount,
        scrapedAt: scrapedData.scrapedAt,
        source: 'puppeteer',
        badgeList: badges
      },
    };

    console.log(`[HackerRank] ✓ Success:`, result);
    return result;

  } catch (err) {
    console.error(`[HackerRank] ✗ Error:`, err.message);
    throw new Error(`HackerRank fetch failed for "${username}": ${err.message}`);
  }
};

// ─── CodeChef ────────────────────────────────────────────────────────────────

/**
 * Fetches CodeChef stats using Puppeteer-based scraping.
 * 
 * WHY PUPPETEER?
 * CodeChef doesn't have a public API. We use browser automation to extract
 * profile stats from the rendered page.
 * 
 * EXTRACTED DATA:
 * - Problems solved (total, fully solved, partially solved)
 * - Contest rating (current and highest)
 * - Stars/rank
 * - Badges
 * - Problem categories
 * 
 * CACHING:
 * Built-in 5-minute caching to reduce browser launches.
 */
const fetchCodeChefStats = async (username) => {
  console.log(`[CodeChef] Fetching stats for ${username}...`);
  
  try {
    const scrapedData = await fetchCodeChefStatsWithRetry(username);
    
    if (!scrapedData) {
      throw new Error(`Profile not found or stats not available for "${username}"`);
    }

    const problemsSolved = scrapedData.problemsSolved || 0;
    const currentRating = scrapedData.currentRating || 0;
    const highestRating = scrapedData.highestRating || currentRating;
    const stars = scrapedData.stars || 0;

    // CodeChef badges based on stars and rating
    const badges = [];
    
    if (stars >= 7) badges.push({ name: '7★ Coder', icon: '🌟', platform: 'codechef' });
    else if (stars >= 6) badges.push({ name: '6★ Coder', icon: '⭐', platform: 'codechef' });
    else if (stars >= 5) badges.push({ name: '5★ Coder', icon: '⭐', platform: 'codechef' });
    else if (stars >= 4) badges.push({ name: '4★ Coder', icon: '⭐', platform: 'codechef' });
    else if (stars >= 3) badges.push({ name: '3★ Coder', icon: '⭐', platform: 'codechef' });
    else if (stars >= 2) badges.push({ name: '2★ Coder', icon: '⭐', platform: 'codechef' });
    else if (stars >= 1) badges.push({ name: '1★ Coder', icon: '⭐', platform: 'codechef' });
    
    if (currentRating >= 2500) badges.push({ name: 'Grandmaster', icon: '🏆', platform: 'codechef' });
    else if (currentRating >= 2200) badges.push({ name: 'Master', icon: '🥇', platform: 'codechef' });
    else if (currentRating >= 1800) badges.push({ name: 'Expert', icon: '🥈', platform: 'codechef' });
    
    if (problemsSolved >= 500) badges.push({ name: '500+ Problems', icon: '💯', platform: 'codechef' });
    else if (problemsSolved >= 100) badges.push({ name: '100+ Problems', icon: '🎯', platform: 'codechef' });
    else if (problemsSolved >= 50) badges.push({ name: '50+ Problems', icon: '✅', platform: 'codechef' });

    // Get rank name based on stars
    const rankNames = {
      7: '7 Star',
      6: '6 Star',
      5: '5 Star',
      4: '4 Star',
      3: '3 Star',
      2: '2 Star',
      1: '1 Star'
    };
    const rank = rankNames[stars] || 'Unrated';

    const result = {
      problems_solved: problemsSolved,
      rating: currentRating,
      easy_solved: 0, // CodeChef doesn't categorize by difficulty in the same way
      medium_solved: 0,
      hard_solved: 0,
      submissions: problemsSolved,
      score: currentRating * 0.1, // Score contribution
      badges: badges.length,
      rank: rank,
      extra: {
        currentRating: currentRating,
        highestRating: highestRating,
        maxRating: highestRating,
        stars: stars,
        fullySolved: scrapedData.fullySolved || 0,
        partiallySolved: scrapedData.partiallySolved || 0,
        contestsAttended: scrapedData.contestsAttended || 0,
        categories: scrapedData.categories || [],
        scrapedAt: scrapedData.scrapedAt,
        source: 'puppeteer',
        badgeList: badges
      },
    };

    console.log(`[CodeChef] ✓ Success:`, result);
    return result;

  } catch (err) {
    console.error(`[CodeChef] ✗ Error:`, err.message);
    throw new Error(`CodeChef fetch failed for "${username}": ${err.message}`);
  }
};

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
    
    for (const [timestamp, count] of Object.entries(dailySubs)) {
      const date = new Date(parseInt(timestamp) * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      await pool.query(
        `INSERT INTO daily_submissions (user_id, submission_date, platform, count)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, submission_date, platform) 
         DO UPDATE SET count = EXCLUDED.count`,
        [userId, dateStr, platform, parseInt(count)]
      );
    }
    console.log(`[Stats] ✓ Stored ${Object.keys(dailySubs).length} days of submissions`);
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

  console.log(`[Cron] Updating stats for ${result.rows.length} verified profiles...`);

  const jobs = result.rows.map(p =>
    fetchAndStoreStats(p.user_id, p.platform, p.username)
      .catch(err => console.error(`[Cron] Failed ${p.platform}/@${p.username}: ${err.message}`))
  );

  const results = await Promise.allSettled(jobs);
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed    = results.filter(r => r.status === 'rejected').length;

  console.log(`[Cron] Done. ${succeeded} succeeded, ${failed} failed.`);
};

module.exports = { fetchAndStoreStats, fetchAllVerifiedStats, fetchLeetCodeStats, fetchCodeforcesStats, fetchGFGStats, fetchHackerRankStats, fetchCodeChefStats };
