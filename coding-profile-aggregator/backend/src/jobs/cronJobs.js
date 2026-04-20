const cron = require('node-cron');
const { 
  fetchAllLeetCodeStats, 
  fetchAllCodeforcesStats, 
  fetchAllCodeChefStats, 
  fetchAllGFGStats, 
  fetchAllHackerRankStats 
} = require('../services/statsService');
const { pool } = require('../config/db');

// All times are IST (UTC+5:30)
const IST = { timezone: 'Asia/Kolkata' };

// ─── Fix #1: Overlap Guards ───────────────────────────────────────────────────
// Each platform has its own isRunning flag. If the previous day's sync is still
// in progress when the next trigger fires, we skip that cycle and log a warning
// instead of launching a second parallel sync (which causes OOM + DB thrashing).
const running = {
  leetcode:      false,
  codeforces:    false,
  codechef:      false,
  geeksforgeeks: false,
  hackerrank:    false,
  otp:           false,
};

/**
 * Wraps a cron task function with an overlap guard.
 * @param {string} key   - Key in the `running` map
 * @param {string} label - Human-readable label for log messages
 * @param {Function} fn  - Async function to execute
 */
const withGuard = (key, label, fn) => async () => {
  if (running[key]) {
    console.warn(`[CRON-${label}] ⚠ Previous run is still active — skipping this cycle to avoid overlap.`);
    return;
  }
  running[key] = true;
  const startedAt = Date.now();
  try {
    await fn();
    console.log(`[CRON-${label}] ✓ Completed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`[CRON-${label}] Error:`, err.message);
  } finally {
    running[key] = false;
  }
};

const startCronJobs = () => {
  // LeetCode at 4:00 AM IST daily
  cron.schedule('0 4 * * *', withGuard('leetcode', 'LeetCode', async () => {
    console.log('[CRON-LeetCode] 4:00 AM IST - Starting LeetCode stats update...');
    await fetchAllLeetCodeStats();
  }), IST);

  // Codeforces at 4:20 AM IST daily
  // NOTE: With 1000 CF users × (10s fetch + 2.1s delay + 2.5s sleep) ≈ 4+ hours.
  // The overlap guard ensures the next day's run is skipped if still in progress.
  cron.schedule('20 4 * * *', withGuard('codeforces', 'Codeforces', async () => {
    console.log('[CRON-Codeforces] 4:20 AM IST - Starting Codeforces stats update...');
    await fetchAllCodeforcesStats();
  }), IST);

  // CodeChef at 4:40 AM IST daily
  cron.schedule('40 4 * * *', withGuard('codechef', 'CodeChef', async () => {
    console.log('[CRON-CodeChef] 4:40 AM IST - Starting CodeChef stats update...');
    await fetchAllCodeChefStats();
  }), IST);

  // GeeksforGeeks at 5:00 AM IST daily
  cron.schedule('0 5 * * *', withGuard('geeksforgeeks', 'GFG', async () => {
    console.log('[CRON-GFG] 5:00 AM IST - Starting GeeksforGeeks stats update...');
    await fetchAllGFGStats();
  }), IST);

  // HackerRank at 5:20 AM IST daily
  cron.schedule('20 5 * * *', withGuard('hackerrank', 'HackerRank', async () => {
    console.log('[CRON-HackerRank] 5:20 AM IST - Starting HackerRank stats update...');
    await fetchAllHackerRankStats();
  }), IST);

  // ─── OTP Cleanup: Delete expired OTP codes every day at 3:00 AM IST ────────
  cron.schedule('0 3 * * *', withGuard('otp', 'OTP', async () => {
    console.log('[CRON-OTP] 3:00 AM IST - Cleaning up expired OTP codes...');
    const result = await pool.query(
      "DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour'"
    );
    console.log(`[CRON-OTP] ✓ Deleted ${result.rowCount} expired OTP record(s).`);
  }), IST);

  console.log('[CRON] ✓ Daily jobs scheduled with overlap guards (IST timezone):');
  console.log('[CRON]   • OTP Cleanup:   3:00 AM');
  console.log('[CRON]   • LeetCode:      4:00 AM');
  console.log('[CRON]   • Codeforces:    4:20 AM');
  console.log('[CRON]   • CodeChef:      4:40 AM');
  console.log('[CRON]   • GeeksforGeeks: 5:00 AM');
  console.log('[CRON]   • HackerRank:    5:20 AM');
};

/**
 * Exposes the current running state — used by the admin sync endpoint
 * to check if a manual sync is also in flight before starting one.
 */
const getCronRunningState = () => ({ ...running });

module.exports = { startCronJobs, getCronRunningState };
