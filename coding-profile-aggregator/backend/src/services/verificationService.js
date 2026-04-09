/**
 * verificationService.js
 * ----------------------
 * Verifies that a user actually owns a coding profile by checking whether
 * a unique verification code exists in their profile bio/about section.
 *
 * Flow:
 *  1. User adds a profile → backend generates a code like "VERIFY_AB12CD"
 *  2. User pastes that code into their platform bio/about
 *  3. User clicks "Verify" → this service fetches their profile and checks
 *     if the code string appears anywhere in the bio text
 *
 * Platform strategies:
 *  - LeetCode     → GraphQL query for profile.aboutMe field
 *  - Codeforces   → REST API user.info, checks firstName + lastName + organization
 *  - GFG          → Scrape the profile page HTML and search for the code string
 */

const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cheerio = require('cheerio');

const LEETCODE_HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://leetcode.com',
};

// ─── LeetCode ────────────────────────────────────────────────────────────────

/**
 * Queries the LeetCode GraphQL API for the user's "About Me" section.
 *
 * The `profile.aboutMe` field is the bio text users write on their profile.
 * We check if the verification code appears anywhere in that string.
 *
 * Why GraphQL? Same reason as statsService — no public REST API exists.
 * The `aboutMe` field is publicly readable without authentication.
 */
const verifyLeetCode = async (username, code) => {
  const query = `
    query getProfile($username: String!) {
      matchedUser(username: $username) {
        profile {
          aboutMe
        }
      }
    }
  `;

  const res = await axios.post(
    'https://leetcode.com/graphql',
    { query, variables: { username } },
    { headers: LEETCODE_HEADERS, timeout: 10000 }
  );

  const aboutMe = res.data?.data?.matchedUser?.profile?.aboutMe || '';

  // Simple substring check — the code is unique enough that false positives
  // are essentially impossible (e.g. "VERIFY_AB12CD")
  return aboutMe.includes(code);
};

// ─── Codeforces ──────────────────────────────────────────────────────────────

/**
 * Uses the Codeforces user.info API to check the user's public fields.
 *
 * Codeforces doesn't have a dedicated "bio" field, so we check:
 *  - firstName
 *  - lastName
 *  - organization (the "Organization" field on their profile, which users
 *    can freely edit — this is the most practical place to put the code)
 *
 * We concatenate all fields and do a single includes() check.
 * Users should be instructed to put the code in their "Organization" field.
 *
 * RATE LIMIT: Codeforces allows 1 request per 2 seconds. This function only
 * makes 1 call, so it's safe.
 */
const verifyCodeforces = async (username, code) => {
  const res = await axios.get(
    `https://codeforces.com/api/user.info?handles=${username}`,
    { timeout: 10000 }
  );

  if (res.data.status !== 'OK') {
    throw new Error(`Codeforces user "${username}" not found`);
  }

  const user = res.data.result[0];

  // Combine all editable text fields into one searchable string
  const searchableText = [
    user.firstName    || '',
    user.lastName     || '',
    user.organization || '',
    user.city         || '',
    user.country      || '',
  ].join(' ');

  return searchableText.includes(code);
};

// ─── GeeksforGeeks ───────────────────────────────────────────────────────────

/**
 * Scrapes the GFG profile page and searches the raw HTML for the code.
 *
 * GFG has no API for profile bio. We fetch the full profile page HTML
 * and do a raw string search — if the code appears anywhere on the page,
 * it means the user has placed it in their profile (institution, bio, etc.)
 *
 * This is intentionally broad: we search the entire page HTML rather than
 * a specific element, because GFG's HTML structure changes frequently.
 * The verification code is unique enough that a false positive is impossible.
 *
 * Users should be instructed to put the code in their "Institute" or
 * "About" field on GFG.
 */
const verifyGFG = async (username, code) => {
  const res = await axios.get(
    `https://www.geeksforgeeks.org/user/${username}/`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
    }
  );

  // Search raw HTML — GFG embeds profile data in the page source
  return res.data.includes(code);
};

// ─── HackerRank ──────────────────────────────────────────────────────────────

/**
 * Verifies HackerRank profile by scraping the profile page with Puppeteer.
 *
 * WHY PUPPETEER?
 * HackerRank's internal REST endpoints (e.g. /rest/hackers/{user}/profile)
 * now return 404 or require authentication cookies. There is no public API.
 * We use Puppeteer to render the page and search the body text for the code.
 *
 * The user should place the verification code in their HackerRank profile
 * "About" section. We scan the entire rendered page text since the HTML
 * structure changes frequently.
 */
const verifyHackerRank = async (username, code) => {
  let browser = null;
  let page    = null;
  try {
    console.log(`[Verify] Launching Puppeteer for HackerRank @${username}...`);
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const url = `https://www.hackerrank.com/profile/${username}`;
    console.log(`[Verify] Navigating to ${url}...`);
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    if (!response || response.status() === 404) {
      console.warn(`[Verify] HackerRank profile not found for @${username}`);
      return false;
    }

    // Wait a moment for JS-rendered content to settle
    await new Promise(r => setTimeout(r, 2000));

    // Extract all visible text from the page
    const pageText = await page.evaluate(() => document.body.innerText || '');
    const pageHTML = await page.evaluate(() => document.body.innerHTML || '');

    // Check both visible text and raw HTML (some fields are in attributes)
    const found = pageText.includes(code) || pageHTML.includes(code);
    console.log(`[Verify] HackerRank code search: ${found ? '✓ FOUND' : '✗ NOT FOUND'}`);
    return found;

  } catch (err) {
    console.error(`[Verify] HackerRank Puppeteer failed for @${username}:`, err.message);
    return false;
  } finally {
    if (page)    await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
};

// ─── CodeChef ────────────────────────────────────────────────────────────────

/**
 * Verifies CodeChef profile by scraping the profile page with Puppeteer.
 *
 * WHY PUPPETEER?
 * CodeChef doesn't have a public API. We use browser automation to render
 * the profile page and search for the verification code.
 *
 * The user should place the verification code in their CodeChef profile
 * "About Yourself" section (Edit Profile → About Yourself).
 */
const verifyCodeChef = async (username, code) => {
  let browser = null;
  let page    = null;
  try {
    console.log(`[Verify] Launching Puppeteer for CodeChef @${username}...`);
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const url = `https://www.codechef.com/users/${username}`;
    console.log(`[Verify] Navigating to ${url}...`);
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    if (!response || response.status() === 404) {
      console.warn(`[Verify] CodeChef profile not found for @${username}`);
      return false;
    }

    // Wait for profile content to load
    await new Promise(r => setTimeout(r, 2000));

    // Extract all visible text from the page
    const pageText = await page.evaluate(() => document.body.innerText || '');
    const pageHTML = await page.evaluate(() => document.body.innerHTML || '');

    // Check both visible text and raw HTML
    const found = pageText.includes(code) || pageHTML.includes(code);
    console.log(`[Verify] CodeChef code search: ${found ? '✓ FOUND' : '✗ NOT FOUND'}`);
    return found;

  } catch (err) {
    console.error(`[Verify] CodeChef Puppeteer failed for @${username}:`, err.message);
    return false;
  } finally {
    if (page)    await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
};

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Entry point called by the profiles route.
 *
 * Returns true if verified, false if not found.
 * Throws if the platform is unknown or the network request fails.
 *
 * The caller (profiles route) handles the false case by returning a 400
 * with instructions telling the user where to place the code.
 */
const verifyProfile = async (platform, username, code) => {
  const verifiers = {
    leetcode:      verifyLeetCode,
    codeforces:    verifyCodeforces,
    geeksforgeeks: verifyGFG,
    hackerrank:    verifyHackerRank,
    codechef:      verifyCodeChef,
  };

  const verifier = verifiers[platform];
  if (!verifier) throw new Error(`Unknown platform: "${platform}"`);

  console.log(`[Verify] Checking ${platform}/@${username} for code "${code}"...`);

  const result = await verifier(username, code);

  console.log(`[Verify] ${platform}/@${username}: ${result ? '✓ verified' : '✗ code not found'}`);
  return result;
};

module.exports = { verifyProfile };
