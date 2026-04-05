/**
 * hackerRankScraper.js
 * --------------------
 * HackerRank profile scraper using Puppeteer
 * 
 * HackerRank doesn't have a public API, so we use browser automation
 * to extract profile stats from the rendered page.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// ─── Browser Pool ────────────────────────────────────────────────────────────

let browserInstance = null;
let browserLaunchPromise = null;

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  browserLaunchPromise = puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  browserInstance = await browserLaunchPromise;
  browserLaunchPromise = null;

  console.log('[HackerRank Browser] Launched new browser instance');
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[HackerRank Browser] Closed browser instance');
  }
}

// ─── In-Memory Cache ─────────────────────────────────────────────────────────

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(username) {
  const entry = cache.get(username);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(username);
    return null;
  }
  
  console.log(`[HackerRank Cache] Hit for ${username} (age: ${Math.round(age/1000)}s)`);
  return entry.data;
}

function setCache(username, data) {
  cache.set(username, { data, timestamp: Date.now() });
  console.log(`[HackerRank Cache] Stored for ${username}`);
}

// ─── Scraper ─────────────────────────────────────────────────────────────────

async function scrapeHackerRankProfile(username, options = {}) {
  const { skipCache = false, timeout = 20000 } = options;

  // Check cache first
  if (!skipCache) {
    const cached = getCached(username);
    if (cached) return cached;
  }

  console.log(`[HackerRank Scraper] Fetching profile for ${username}...`);

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const url = `https://www.hackerrank.com/profile/${username}`;
    console.log(`[HackerRank Scraper] Navigating to ${url}...`);
    
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    if (!response || response.status() === 404) {
      console.log(`[HackerRank Scraper] ✗ Profile not found (404)`);
      return null;
    }

    // Wait for profile content to load — try several selectors
    try {
      await page.waitForSelector(
        '.profile-card, .hacker-profile, [class*="profile"], .ph-16, [data-analytics]',
        { timeout: 12000 }
      );
    } catch {
      // If no specific selector found, wait a flat extra 3 seconds for JS
      console.log(`[HackerRank Scraper] Selector timeout — waiting 3s for JS render`);
      await new Promise(r => setTimeout(r, 3000));
    }

    // Extract data
    const stats = await page.evaluate(() => {
      const extractNumber = (text) => {
        if (!text) return null;
        const match = text.replace(/,/g, '').match(/\d+/);
        return match ? parseInt(match[0]) : null;
      };

      let problems = 0;
      let badges = 0;
      let rank = '';

      // Strategy 1: Look for problems solved
      const problemsSelectors = [
        '[data-test-id="profile-problems-solved"]',
        '.profile-problems-solved',
        '.hacker-profile-problems-solved',
      ];

      for (const sel of problemsSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const num = extractNumber(el.textContent);
          if (num !== null && num > 0) {
            problems = num;
            break;
          }
        }
      }

      // Strategy 2: Count badges
      const badgeElements = document.querySelectorAll('.badge, [class*="badge"], .hacker-badge');
      badges = badgeElements.length;

      // Strategy 3: Get rank
      const rankSelectors = [
        '.profile-rank',
        '.hacker-rank',
        '[class*="rank"]',
      ];

      for (const sel of rankSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 0 && el.textContent.trim().length < 50) {
          rank = el.textContent.trim();
          break;
        }
      }

      // Fallback: Search all text for patterns
      if (problems === 0) {
        const allText = document.body.textContent;
        const problemMatch = allText.match(/(\d+)\s*problems?\s*solved/i);
        if (problemMatch) {
          problems = parseInt(problemMatch[1]);
        }
      }

      return { problems, badges, rank };
    });

    console.log(`[HackerRank Scraper] Extracted:`, stats);

    // Check if the page indicates profile doesn't exist
    // (404 is caught above; if page has no recognizable profile elements, 
    //  badges may be 0 for real users — don't treat 0 as "not found")
    const profileExists = await page.evaluate(() => {
      // HackerRank shows an error state if profile doesn't exist
      const errorEl = document.querySelector('.error-404, [class*="notFound"], [class*="not-found"]');
      if (errorEl) return false;
      // If page has title with username or profile-related content it exists
      const title = document.title || '';
      return !title.toLowerCase().includes('page not found') && 
             !title.toLowerCase().includes('error');
    });

    if (!profileExists) {
      console.log(`[HackerRank Scraper] ✗ Profile page not found or error state`);
      await page.close();
      return null;
    }

    const result = {
      problemsSolved: stats.problems || 0,
      badges: stats.badges || 0,
      rank: stats.rank || '',
      scrapedAt: new Date().toISOString(),
    };

    setCache(username, result);
    await page.close();
    console.log(`[HackerRank Scraper] ✓ Success:`, result);
    return result;

  } catch (err) {
    console.error(`[HackerRank Scraper] ✗ Error for ${username}:`, err.message);
    if (page) await page.close().catch(() => {});
    return null;
  }
}

async function fetchHackerRankStatsWithRetry(username, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[HackerRank] Attempt ${attempt}/${maxRetries} for ${username}`);
    
    const result = await scrapeHackerRankProfile(username, {
      skipCache: attempt > 1,
    });

    if (result !== null) {
      return result;
    }

    if (attempt < maxRetries) {
      console.log(`[HackerRank] Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`Failed to fetch HackerRank stats after ${maxRetries} attempts`);
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  await closeBrowser();
});

process.on('SIGTERM', async () => {
  await closeBrowser();
});

module.exports = {
  scrapeHackerRankProfile,
  fetchHackerRankStatsWithRetry,
  closeBrowser,
};
