const cron = require('node-cron');
const { 
  fetchAllLeetCodeStats, 
  fetchAllCodeforcesStats, 
  fetchAllCodeChefStats, 
  fetchAllGFGStats, 
  fetchAllHackerRankStats 
} = require('../services/statsService');

const startCronJobs = () => {
  // LeetCode at 4:00 AM daily
  cron.schedule('0 4 * * *', async () => {
    console.log('[CRON-LeetCode] 4:00 AM - Starting LeetCode stats update...');
    try {
      await fetchAllLeetCodeStats();
    } catch (err) {
      console.error('[CRON-LeetCode] Error:', err.message);
    }
  });

  // Codeforces at 4:20 AM daily
  cron.schedule('20 4 * * *', async () => {
    console.log('[CRON-Codeforces] 4:20 AM - Starting Codeforces stats update...');
    try {
      await fetchAllCodeforcesStats();
    } catch (err) {
      console.error('[CRON-Codeforces] Error:', err.message);
    }
  });

  // CodeChef at 4:40 AM daily
  cron.schedule('40 4 * * *', async () => {
    console.log('[CRON-CodeChef] 4:40 AM - Starting CodeChef stats update...');
    try {
      await fetchAllCodeChefStats();
    } catch (err) {
      console.error('[CRON-CodeChef] Error:', err.message);
    }
  });

  // GeeksforGeeks at 5:00 AM daily
  cron.schedule('0 5 * * *', async () => {
    console.log('[CRON-GFG] 5:00 AM - Starting GeeksforGeeks stats update...');
    try {
      await fetchAllGFGStats();
    } catch (err) {
      console.error('[CRON-GFG] Error:', err.message);
    }
  });

  // HackerRank at 5:20 AM daily
  cron.schedule('20 5 * * *', async () => {
    console.log('[CRON-HackerRank] 5:20 AM - Starting HackerRank stats update...');
    try {
      await fetchAllHackerRankStats();
    } catch (err) {
      console.error('[CRON-HackerRank] Error:', err.message);
    }
  });

  console.log('[CRON] ✓ Daily jobs scheduled:');
  console.log('[CRON]   • LeetCode: 4:00 AM');
  console.log('[CRON]   • Codeforces: 4:20 AM');
  console.log('[CRON]   • CodeChef: 4:40 AM');
  console.log('[CRON]   • GeeksforGeeks: 5:00 AM');
  console.log('[CRON]   • HackerRank: 5:20 AM');
};

module.exports = { startCronJobs };
