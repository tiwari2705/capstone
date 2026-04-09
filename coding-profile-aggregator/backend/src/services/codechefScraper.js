/**
 * codechefScraper.js
 * ------------------
 * Scrapes CodeChef profile data using Puppeteer
 * 
 * CodeChef doesn't have a public API, so we use browser automation
 * to extract profile stats from the rendered page.
 * 
 * EXTRACTED DATA:
 * - Problems solved (total, partially solved, fully solved)
 * - Contest rating (current and highest)
 * - Stars/rank
 * - Badges
 * - Problem categories
 */

const puppeteer = require('puppeteer');

// Cache to reduce browser launches
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log('[CodeChef] Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });
  }
  return browser;
}

async function fetchCodeChefStatsWithRetry(username, maxRetries = 2) {
  // Clear cache for this user to force fresh fetch
  const cacheKey = `codechef:${username}`;
  cache.delete(cacheKey);
  console.log(`[CodeChef] Cache cleared for ${username}`);

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[CodeChef] Attempt ${attempt}/${maxRetries} for ${username}`);
      const data = await scrapeCodeChefProfile(username);
      
      // Cache the result
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      lastError = error;
      console.error(`[CodeChef] Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff
        console.log(`[CodeChef] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

async function scrapeCodeChefProfile(username) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const url = `https://www.codechef.com/users/${username}`;
    console.log(`[CodeChef] Navigating to ${url}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Check if profile exists
    const notFound = await page.$('.error-page, .not-found');
    if (notFound) {
      throw new Error(`CodeChef profile not found: ${username}`);
    }

    // Wait for profile content to load
    await page.waitForSelector('.rating-number, .user-details-container, .rating-header', { timeout: 10000 });

    // Take a screenshot for debugging (optional)
    // await page.screenshot({ path: `codechef-${username}.png` });

    // Extract data with multiple selector strategies
    const data = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };

      const getNumber = (text) => {
        if (!text) return 0;
        const match = text.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      };

      // Try multiple selectors for rating
      let currentRating = 0;
      const ratingSelectors = [
        '.rating-number',
        '.rating-header .rating',
        '[class*="rating-number"]',
        '.rating-data-section .rating'
      ];
      
      for (const selector of ratingSelectors) {
        const ratingText = getText(selector);
        if (ratingText) {
          currentRating = getNumber(ratingText);
          if (currentRating > 0) break;
        }
      }

      // Try multiple selectors for highest rating
      let highestRating = currentRating;
      const highestSelectors = [
        '.rating-header .small',
        '.rating-header small',
        '[class*="highest"]'
      ];
      
      for (const selector of highestSelectors) {
        const text = getText(selector);
        const num = getNumber(text);
        if (num > highestRating) {
          highestRating = num;
          break;
        }
      }

      // Extract stars
      let stars = 0;
      const starSelectors = [
        '.rating-star span',
        '.rating-star',
        '[class*="star"]'
      ];
      
      for (const selector of starSelectors) {
        const starText = getText(selector);
        const match = starText.match(/(\d+)★/);
        if (match) {
          stars = parseInt(match[1]);
          break;
        }
      }

      // Extract problems solved - try multiple approaches
      let problemsSolved = 0;
      
      // Strategy 1: Look for "Fully Solved" or "Problems Solved" heading
      const headers = Array.from(document.querySelectorAll('h3, h5, .heading, [class*="heading"]'));
      for (const header of headers) {
        const text = header.textContent.trim();
        if (text.includes('Fully Solved') || text.includes('Problems Solved')) {
          // Get the number from the header or next sibling
          const num = getNumber(text);
          if (num > 0) {
            problemsSolved = num;
            break;
          }
          // Try next sibling
          const next = header.nextElementSibling;
          if (next) {
            const nextNum = getNumber(next.textContent);
            if (nextNum > 0) {
              problemsSolved = nextNum;
              break;
            }
          }
        }
      }

      // Strategy 2: Look in rating data sections
      if (problemsSolved === 0) {
        const sections = document.querySelectorAll('.rating-data-section, .problems-solved, [class*="problem"]');
        for (const section of sections) {
          const text = section.textContent;
          if (text.includes('Fully Solved') || text.includes('Problems')) {
            const num = getNumber(text);
            if (num > 0) {
              problemsSolved = num;
              break;
            }
          }
        }
      }

      // Extract fully solved and partially solved
      let fullySolved = 0;
      let partiallySolved = 0;
      
      const problemTexts = Array.from(document.querySelectorAll('h5, .content, [class*="problem"]'));
      for (const el of problemTexts) {
        const text = el.textContent.trim();
        if (text.includes('Fully Solved')) {
          fullySolved = getNumber(text);
        } else if (text.includes('Partially Solved')) {
          partiallySolved = getNumber(text);
        }
      }

      // If we found fully solved, use it as problems solved
      if (fullySolved > 0 && problemsSolved === 0) {
        problemsSolved = fullySolved;
      }

      // Extract contests attended
      let contestsAttended = 0;
      const contestTexts = Array.from(document.querySelectorAll('[class*="contest"], .rating-data-section'));
      for (const el of contestTexts) {
        const text = el.textContent;
        if (text.includes('Contest') && text.includes('Attended')) {
          contestsAttended = getNumber(text);
          break;
        }
      }

      // Extract problem categories
      const categories = [];
      const categoryCards = document.querySelectorAll('.problem-category-container .category-card, [class*="category"]');
      categoryCards.forEach(card => {
        const nameEl = card.querySelector('.category-name, [class*="name"]');
        const countEl = card.querySelector('.category-count, [class*="count"]');
        if (nameEl && countEl) {
          const name = nameEl.textContent.trim();
          const count = getNumber(countEl.textContent);
          if (name && count > 0) {
            categories.push({ name, count });
          }
        }
      });

      // Debug: Return all text content for analysis
      const allText = document.body.innerText;
      
      return {
        currentRating,
        highestRating,
        stars,
        problemsSolved,
        fullySolved,
        partiallySolved,
        contestsAttended,
        categories,
        debugText: allText.substring(0, 500) // First 500 chars for debugging
      };
    });

    console.log(`[CodeChef] Raw scraped data for ${username}:`, data);

    // If we still have no data, log the debug text
    if (data.problemsSolved === 0 && data.currentRating === 0) {
      console.log(`[CodeChef] Debug text from page:`, data.debugText);
    }

    return {
      ...data,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[CodeChef] Error scraping ${username}:`, error.message);
    throw error;
  } finally {
    await page.close();
  }
}

// Cleanup function to close browser
async function cleanup() {
  if (browser) {
    console.log('[CodeChef] Closing browser...');
    await browser.close();
    browser = null;
  }
}

// Cleanup on process exit
process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
  fetchCodeChefStatsWithRetry,
  cleanup
};
