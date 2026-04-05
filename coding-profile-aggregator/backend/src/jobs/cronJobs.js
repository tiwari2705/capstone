const cron = require('node-cron');
const { fetchAllVerifiedStats } = require('../services/statsService');

const startCronJobs = () => {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[CRON] Fetching stats for all verified profiles...');
    await fetchAllVerifiedStats();
  });
  console.log('[CRON] Jobs scheduled (every 6 hours)');
};

module.exports = { startCronJobs };
