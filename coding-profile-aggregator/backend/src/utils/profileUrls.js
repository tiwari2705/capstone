/**
 * profileUrls.js
 * --------------
 * Utility functions for generating platform profile URLs
 */

/**
 * Generates the public profile URL for a given platform and username
 */
function getProfileUrl(platform, username) {
  const urls = {
    leetcode: `https://leetcode.com/${username}`,
    codeforces: `https://codeforces.com/profile/${username}`,
    geeksforgeeks: `https://www.geeksforgeeks.org/user/${username}/`,
    hackerrank: `https://www.hackerrank.com/profile/${username}`,
    codechef: `https://www.codechef.com/users/${username}`
  };
  
  return urls[platform.toLowerCase()] || null;
}

/**
 * Validates if a platform is supported
 */
function isSupportedPlatform(platform) {
  const supported = ['leetcode', 'codeforces', 'geeksforgeeks', 'hackerrank', 'codechef'];
  return supported.includes(platform.toLowerCase());
}

/**
 * Gets all supported platforms
 */
function getSupportedPlatforms() {
  return ['leetcode', 'codeforces', 'geeksforgeeks', 'hackerrank', 'codechef'];
}

module.exports = {
  getProfileUrl,
  isSupportedPlatform,
  getSupportedPlatforms
};
