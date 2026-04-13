const { createPage, safeGoto, closePage, delay, retry } = require('./browserManager');

async function fetchCodeChefStats(username) {
  return retry(async () => {
    let page = null;
    
    try {
      console.log(`[CodeChef] Fetching stats for ${username}...`);
      
      page = await createPage();
      const url = `https://www.codechef.com/users/${username.trim()}`;
      
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
          return match ? parseInt(match[0], 10) : 0;
        };
        
        let problemsSolved = 0;
        const h3Elements = document.querySelectorAll('h3');
        for (const h3 of h3Elements) {
          if (h3.textContent.includes('Total Problems Solved') || h3.textContent.includes('Fully Solved')) {
            const match = h3.textContent.match(/(\d+)/);
            if (match) {
              problemsSolved = parseInt(match[1], 10);
              break;
            }
          }
        }
        
        // Fallback for problems solved if not found
        if (problemsSolved === 0) {
           const texts = Array.from(document.querySelectorAll('section.rating-data-section.problems-solved h3')).map(el => el.textContent);
           for (const t of texts) {
               if (t.includes('Total Problems Solved') || t.includes('Fully Solved')) {
                   const m = t.match(/\d+/);
                   if (m) problemsSolved = parseInt(m[0], 10);
               }
           }
        }
        
        const ratingText = getText('.rating-number');
        const ratingMatch = ratingText.match(/\d+/);
        const currentRating = ratingMatch ? parseInt(ratingMatch[0], 10) : 0;
        
        const starsText = getText('.rating-star') || getText('.rating');
        const starsMatch = starsText.match(/(\d+)/);
        const stars = starsMatch ? parseInt(starsMatch[1], 10) : 0;
        
        return {
          problemsSolved,
          currentRating,
          stars,
          pageTitle: document.title
        };
      });
      
      console.log(`[CodeChef] Raw data for ${username}:`, data);
      
      const result = {
        problems_solved: data.problemsSolved || 0,
        rating: data.currentRating || 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        submissions: data.problemsSolved || 0,
        score: (data.currentRating || 0) * 0.1,
        badges: 0,
        extra: {
          currentRating: data.currentRating || 0,
          maxRating: data.currentRating || 0,
          stars: data.stars || 0,
          badgeList: []
        }
      };
      
      console.log(`[CodeChef] ✓ ${username}: ${result.problems_solved} problems, rating=${result.rating}`);
      return result;
      
    } catch (error) {
      console.error(`[CodeChef] ✗ Error for ${username}:`, error.message);
      throw new Error(`CodeChef fetch failed for "${username}": ${error.message}`);
    } finally {
      await closePage(page);
      await delay(2000);
    }
  }, 2, 3000);
}

module.exports = { fetchCodeChefStats };
