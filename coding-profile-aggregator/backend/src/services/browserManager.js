const puppeteer = require('puppeteer');

let browserInstance = null;
let browserPromise = null;
let browserPageCount = 0;

// ─── Fix #3: Puppeteer Concurrency Semaphore ───────────────────────────────
// Limits the number of simultaneous Puppeteer browser instances to prevent
// OOM crashes on memory-constrained hosts (e.g. Render free tier, 512MB RAM).
// verificationService.js MUST call withBrowserLimit() around every browser task.
const MAX_CONCURRENT_BROWSERS = 1;
let activeBrowserTasks = 0;

// ─── Fix: Browser Recycling ───────────────────────────────────────────────
// Restart browser after N pages to prevent memory leaks
const MAX_PAGES_BEFORE_RESTART = 50; // Restart after 50 pages

const BROWSER_CONFIG = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled'
  ],
  defaultViewport: { width: 1280, height: 720 },
  ignoreHTTPSErrors: true,
  protocolTimeout: 120000
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  if (browserPromise) {
    return browserPromise;
  }

  browserPromise = puppeteer.launch(BROWSER_CONFIG)
    .then(browser => {
      browserInstance = browser;
      browserPromise = null;
      console.log('[Browser] Launched successfully');
      
      // Don't set up disconnect handler - let it stay alive
      
      return browser;
    })
    .catch(err => {
      console.error('[Browser] Launch failed:', err.message);
      browserPromise = null;
      browserInstance = null;
      throw err;
    });

  return browserPromise;
}

async function createPage() {
  // Recycle browser if too many pages have been created
  if (browserPageCount >= MAX_PAGES_BEFORE_RESTART) {
    console.log(`[Browser] Recycling browser after ${browserPageCount} pages`);
    await closeBrowser();
    browserPageCount = 0;
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.setDefaultNavigationTimeout(90000);
  await page.setDefaultTimeout(90000);
  
  // Disable unnecessary features to improve stability
  await page.setRequestInterception(false);
  
  browserPageCount++;
  console.log(`[Browser] Created page ${browserPageCount}/${MAX_PAGES_BEFORE_RESTART}`);
  
  return page;
}

async function safeGoto(page, url, options = {}) {
  const defaultOptions = {
    timeout: 90000,
    waitUntil: ['domcontentloaded', 'networkidle2']
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    await page.goto(url, finalOptions);
    await delay(2000); // Additional delay after navigation
    return true;
  } catch (error) {
    console.error(`[SafeGoto] Navigation failed for ${url}: ${error.message}`);
    throw error;
  }
}

async function closePage(page) {
  try {
    if (page && !page.isClosed()) {
      await page.close();
    }
  } catch (error) {
    console.error('[Browser] Error closing page:', error.message);
  }
}

async function closeBrowser() {
  try {
    if (browserInstance && browserInstance.isConnected()) {
      await browserInstance.close();
      browserInstance = null;
      browserPageCount = 0; // Reset counter
      console.log('[Browser] Closed successfully');
    }
  } catch (error) {
    console.error('[Browser] Error closing browser:', error.message);
    browserInstance = null;
    browserPageCount = 0;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fix #3 — Semaphore wrapper for Puppeteer browser tasks.
 *
 * Ensures at most MAX_CONCURRENT_BROWSERS Chromium instances run at the same
 * time. If the limit is already reached, the caller waits (polling every 500ms)
 * until a slot opens up.
 *
 * Usage in verificationService.js:
 *   const result = await withBrowserLimit(async () => {
 *     const browser = await puppeteer.launch(...);
 *     // ... do work ...
 *     await browser.close();
 *     return result;
 *   });
 */
async function withBrowserLimit(fn) {
  const POLL_INTERVAL_MS = 500;
  const MAX_WAIT_MS = 120000; // 2-minute maximum wait time
  let waited = 0;

  while (activeBrowserTasks >= MAX_CONCURRENT_BROWSERS) {
    if (waited >= MAX_WAIT_MS) {
      throw new Error(
        `[BrowserLimit] Timed out after ${MAX_WAIT_MS / 1000}s waiting for a browser slot. ` +
        'Too many concurrent verifications — please try again in a moment.'
      );
    }
    console.log(
      `[BrowserLimit] Slot full (${activeBrowserTasks}/${MAX_CONCURRENT_BROWSERS} active). ` +
      `Waiting ${POLL_INTERVAL_MS}ms... (${waited}ms elapsed)`
    );
    await delay(POLL_INTERVAL_MS);
    waited += POLL_INTERVAL_MS;
  }

  activeBrowserTasks++;
  console.log(`[BrowserLimit] Slot acquired (${activeBrowserTasks}/${MAX_CONCURRENT_BROWSERS} active).`);

  try {
    return await fn();
  } finally {
    activeBrowserTasks--;
    console.log(`[BrowserLimit] Slot released (${activeBrowserTasks}/${MAX_CONCURRENT_BROWSERS} active).`);
  }
}

async function retry(fn, maxAttempts = 2, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Force browser cleanup on retry to avoid detached frame issues
      if (browserInstance) {
        try {
          if (browserInstance.isConnected()) {
            await browserInstance.close();
          }
        } catch (e) {
          console.log('[Retry] Browser close error (ignoring):', e.message);
        }
        browserInstance = null;
        browserPromise = null;
      }
      
      console.log(`[Retry] Waiting ${delayMs}ms before retry...`);
      await delay(delayMs);
    }
  }
}

module.exports = {
  getBrowser,
  createPage,
  safeGoto,
  closePage,
  closeBrowser,
  delay,
  retry,
  withBrowserLimit,
};

