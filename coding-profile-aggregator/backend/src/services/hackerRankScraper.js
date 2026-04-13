const { createPage, safeGoto, closePage, delay, retry } = require('./browserManager');

async function fetchHackerRankStats(username) {
  return retry(async () => {
    let page = null;
    
    try {
      console.log(`[HackerRank] Fetching stats for ${username}...`);
      
      page = await createPage();
      const url = `https://www.hackerrank.com/profile/${username}`;
      
      await safeGoto(page, url);
      await delay(2000);
      
      const data = await page.evaluate(() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : '';
        };
        
        const getNumber = (selector) => {
          const text = getText(selector);
          const match = text.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        };
        
        const badges = document.querySelectorAll('.badge-title, [class*="badge"]').length;
        
        const problemsSolved = getNumber('.profile-stats-card .stat-value') ||
                              getNumber('[class*="challenges-solved"]') ||
                              getNumber('[class*="problem"]');
        
        const rank = getText('.profile-rank') || getText('[class*="rank"]');
        
        return {
          problemsSolved,
          badges,
          rank,
          pageTitle: document.title
        };
      });
      
      console.log(`[HackerRank] Raw data for ${username}:`, data);
      
      const result = {
        problems_solved: data.problemsSolved || 0,
        rating: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        submissions: data.problemsSolved || 0,
        score: data.problemsSolved || 0,
        badges: data.badges || 0,
        extra: {
          rank: data.rank || '',
          badgeList: []
        }
      };
      
      console.log(`[HackerRank] ✓ ${username}: ${result.problems_solved} problems, ${result.badges} badges`);
      return result;
      
    } catch (error) {
      console.error(`[HackerRank] ✗ Error for ${username}:`, error.message);
      throw new Error(`HackerRank fetch failed for "${username}": ${error.message}`);
    } finally {
      await closePage(page);
      await delay(2000);
    }
  }, 2, 3000);
}

module.exports = { fetchHackerRankStats, fetchHackerRankStatsWithRetry: fetchHackerRankStats };
