const axios = require('axios');
const { createPage, safeGoto, closePage, delay, retry } = require('./browserManager');

async function fetchGFGStats(username) {
  console.log(`[GFG] Fetching stats for ${username}...`);
  console.log('[GFG] Trying community API...');
  
  try {
    const apiUrl = `https://geeksforgeeks-api.vercel.app/${username}`;
    const response = await axios.get(apiUrl, { timeout: 10000 });
    
    if (response.data && response.data.info) {
      const info = response.data.info;
      const result = {
        problems_solved: parseInt(info.totalProblemsSolved) || 0,
        rating: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        submissions: parseInt(info.totalProblemsSolved) || 0,
        score: parseInt(info.totalProblemsSolved) || 0,
        badges: 0,
        extra: {
          instituteRank: info.instituteRank || 0,
          currentStreak: info.currentStreak || 0,
          maxStreak: info.maxStreak || 0,
          badgeList: []
        }
      };
      
      console.log(`[GFG] ✓ API success for ${username}: ${result.problems_solved} problems`);
      return result;
    }
  } catch (error) {
    console.log(`[GFG] Community API failed: ${error.message}`);
  }
  
  console.log('[GFG] Falling back to Puppeteer scraping...');
  return fetchGFGStatsWithRetry(username);
}

async function fetchGFGStatsWithRetry(username) {
  return retry(async () => {
    let page = null;
    
    try {
      console.log(`[GFG] Scraping profile for ${username}...`);
      
      page = await createPage();
      const url = `https://www.geeksforgeeks.org/user/${username}/`;
      
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
        
        const problemsSolved = getNumber('.score_card_value') ||
                              getNumber('.problemSolvedSection span') ||
                              getNumber('[class*="problem"]');
        
        const streak = getNumber('.streakSection span') ||
                      getNumber('[class*="streak"]');
        
        return {
          problemsSolved,
          streak,
          pageTitle: document.title
        };
      });
      
      console.log(`[GFG] Raw data for ${username}:`, data);
      
      const result = {
        problems_solved: data.problemsSolved || 0,
        rating: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        submissions: data.problemsSolved || 0,
        score: data.problemsSolved || 0,
        badges: 0,
        extra: {
          currentStreak: data.streak || 0,
          maxStreak: data.streak || 0,
          badgeList: []
        }
      };
      
      console.log(`[GFG] ✓ ${username}: ${result.problems_solved} problems`);
      return result;
      
    } catch (error) {
      console.error(`[GFG] ✗ Error for ${username}:`, error.message);
      throw new Error(`GFG fetch failed for "${username}": ${error.message}`);
    } finally {
      await closePage(page);
      await delay(2000);
    }
  }, 2, 3000);
}

module.exports = { fetchGFGStats, fetchGFGStatsWithRetry };
