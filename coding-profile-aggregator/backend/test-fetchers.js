/**
 * Debug script to test platform fetchers directly
 * Run: node test-fetchers.js <platform> <username>
 * Example: node test-fetchers.js codeforces tourist
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Test Codeforces
async function testCodeforces(username) {
  console.log('\n=== TESTING CODEFORCES ===');
  console.log(`Username: ${username}\n`);

  try {
    // Call 1: user.info
    console.log('Fetching user.info...');
    const infoRes = await axios.get(
      `https://codeforces.com/api/user.info?handles=${username}`,
      { timeout: 10000 }
    );
    
    console.log('Raw response:', JSON.stringify(infoRes.data, null, 2));
    
    if (infoRes.data.status === 'OK' && infoRes.data.result?.length > 0) {
      const user = infoRes.data.result[0];
      console.log('\n✓ User found:');
      console.log(`  Rating: ${user.rating || 0}`);
      console.log(`  Max Rating: ${user.maxRating || 0}`);
      console.log(`  Rank: ${user.rank || 'N/A'}`);
    } else {
      console.log('✗ User not found or invalid response');
      return;
    }

    // Wait for rate limit
    console.log('\nWaiting 2.1 seconds for rate limit...');
    await new Promise(resolve => setTimeout(resolve, 2100));

    // Call 2: user.status
    console.log('Fetching user.status...');
    const statusRes = await axios.get(
      `https://codeforces.com/api/user.status?handle=${username}&from=1&count=100`,
      { timeout: 20000 }
    );

    console.log(`\nStatus response status: ${statusRes.data.status}`);
    
    if (statusRes.data.status === 'OK' && Array.isArray(statusRes.data.result)) {
      const subs = statusRes.data.result;
      console.log(`Total submissions fetched: ${subs.length}`);
      
      const solvedSet = new Set(
        subs
          .filter(s => s.verdict === 'OK')
          .map(s => `${s.problem.contestId}-${s.problem.index}`)
      );
      
      console.log(`Unique problems solved: ${solvedSet.size}`);
      console.log('\nSample solved problems:');
      Array.from(solvedSet).slice(0, 5).forEach(p => console.log(`  - ${p}`));
    }

  } catch (err) {
    console.error('✗ Error:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  }
}

// Test GFG
async function testGFG(username) {
  console.log('\n=== TESTING GEEKSFORGEEKS ===');
  console.log(`Username: ${username}\n`);

  // Test 1: Community API
  try {
    console.log('Testing community API...');
    const res = await axios.get(
      `https://geeks-for-geeks-stats-api.vercel.app/?raw=Y&userName=${username}`,
      { timeout: 15000 }
    );
    
    console.log('Raw response:', JSON.stringify(res.data, null, 2));
    
    if (res.data.status === 'error') {
      console.log('✗ User not found in community API');
    } else {
      console.log('\n✓ Community API success:');
      console.log(`  Total Problems: ${res.data.totalProblemsSolved || 0}`);
      console.log(`  Coding Score: ${res.data.codingScore || 0}`);
      console.log(`  School: ${res.data.School || 0}`);
      console.log(`  Basic: ${res.data.Basic || 0}`);
      console.log(`  Easy: ${res.data.Easy || 0}`);
      console.log(`  Medium: ${res.data.Medium || 0}`);
      console.log(`  Hard: ${res.data.Hard || 0}`);
    }
  } catch (err) {
    console.error('✗ Community API error:', err.message);
  }

  // Test 2: Puppeteer Scraping
  console.log('\n\nTesting Puppeteer scraping...');
  try {
    const { scrapeGFGProfile } = require('./src/services/gfgScraper');
    const result = await scrapeGFGProfile(username, { skipCache: true });
    
    if (result) {
      console.log('\n✓ Puppeteer scraping success:');
      console.log(`  Coding Score: ${result.codingScore}`);
      console.log(`  Problems Solved: ${result.problemsSolved}`);
      console.log(`  Scraped At: ${result.scrapedAt}`);
    } else {
      console.log('✗ Puppeteer scraping returned null (no data found)');
    }
  } catch (err) {
    console.error('✗ Puppeteer scraping error:', err.message);
  }
}

// Test LeetCode
async function testLeetCode(username) {
  console.log('\n=== TESTING LEETCODE ===');
  console.log(`Username: ${username}\n`);

  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
        profile {
          ranking
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://leetcode.com',
        },
        timeout: 15000
      }
    );

    console.log('Raw response:', JSON.stringify(res.data, null, 2));

    const matchedUser = res.data?.data?.matchedUser;
    if (!matchedUser) {
      console.log('✗ User not found');
      return;
    }

    const acStats = matchedUser.submitStats?.acSubmissionNum || [];
    console.log('\n✓ User found:');
    acStats.forEach(s => {
      console.log(`  ${s.difficulty}: ${s.count}`);
    });
    console.log(`  Ranking: ${matchedUser.profile?.ranking || 'N/A'}`);

  } catch (err) {
    console.error('✗ Error:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  }
}

// Main
const platform = process.argv[2];
const username = process.argv[3];

if (!platform || !username) {
  console.log('Usage: node test-fetchers.js <platform> <username>');
  console.log('Platforms: leetcode, codeforces, geeksforgeeks');
  console.log('\nExamples:');
  console.log('  node test-fetchers.js leetcode neal_wu');
  console.log('  node test-fetchers.js codeforces tourist');
  console.log('  node test-fetchers.js geeksforgeeks username');
  process.exit(1);
}

(async () => {
  switch (platform.toLowerCase()) {
    case 'leetcode':
      await testLeetCode(username);
      break;
    case 'codeforces':
    case 'cf':
      await testCodeforces(username);
      break;
    case 'geeksforgeeks':
    case 'gfg':
      await testGFG(username);
      break;
    default:
      console.log('Invalid platform. Use: leetcode, codeforces, geeksforgeeks');
  }
})();
