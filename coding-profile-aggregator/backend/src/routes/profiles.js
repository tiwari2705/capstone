const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { verifyProfile } = require('../services/verificationService');
const { fetchAndStoreStats } = require('../services/statsService');
const { getProfileUrl } = require('../utils/profileUrls');

const router = express.Router();

// Fix #4 — never expose raw DB errors to the client in production
const sanitizeError = (err, defaultMsg = 'An internal server error occurred') => {
  if (process.env.NODE_ENV === 'production') return defaultMsg;
  return err.message || defaultMsg;
};

/**
 * Generates a verification code with only alphanumeric characters (no underscores or special chars).
 * Format: VERIFY + 6 random uppercase letters/numbers (e.g., VERIFYAB12CD)
 */
const generateVerificationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VERIFY';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// POST /api/profiles/add-profile
router.post('/add-profile', authenticate, async (req, res) => {
  const { platform, username } = req.body;
  const validPlatforms = ['leetcode', 'codeforces', 'geeksforgeeks', 'hackerrank', 'codechef'];
  if (!platform || !username) return res.status(400).json({ error: 'Platform and username required' });
  if (!validPlatforms.includes(platform.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid platform. Use: leetcode, codeforces, geeksforgeeks, hackerrank, codechef' });
  }
  // Fix #12 — validate username format to prevent oversized/malicious strings
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 1 || trimmedUsername.length > 100) {
    return res.status(400).json({ error: 'Username must be between 1 and 100 characters' });
  }
  if (!/^[a-zA-Z0-9_.\-]+$/.test(trimmedUsername)) {
    return res.status(400).json({ error: 'Username contains invalid characters. Only letters, numbers, dots, hyphens, and underscores are allowed.' });
  }
  const verification_code = generateVerificationCode();
  const profile_url = getProfileUrl(platform, trimmedUsername);
  
  try {
    // Check if this platform+username is already claimed by another verified user
    const existingClaimResult = await pool.query(
      'SELECT cp.user_id, u.name, u.registration_no FROM coding_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.platform = $1 AND cp.username = $2 AND cp.user_id != $3 AND cp.verified = TRUE',
      [platform.toLowerCase(), trimmedUsername, req.user.id]
    );

    if (existingClaimResult.rows.length > 0) {
      const existingUser = existingClaimResult.rows[0];
      return res.status(409).json({
        error: 'This account is already linked',
        conflict: true,
        linkedTo: {
          name: existingUser.name,
          registration_no: existingUser.registration_no
        },
        message: `This ${platform} account is already verified and linked to ${existingUser.name} (${existingUser.registration_no}).`
      });
    }

    const result = await pool.query(
      `INSERT INTO coding_profiles (user_id, platform, username, profile_url, verification_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, platform) DO UPDATE SET 
         username = $3, profile_url = $4, verification_code = $5, verified = FALSE, updated_at = NOW()
       RETURNING *`,
      [req.user.id, platform.toLowerCase(), trimmedUsername, profile_url, verification_code]
    );
    res.status(201).json({
      profile: result.rows[0],
      message: `Add this code to your ${platform} profile bio/about section: ${verification_code}`
    });
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err, 'Failed to add profile. Please try again.') });
  }
});

// POST /api/profiles/verify-profile
router.post('/verify-profile', authenticate, async (req, res) => {
  const { platform } = req.body;
  if (!platform) return res.status(400).json({ error: 'Platform required' });
  try {
    const profileResult = await pool.query(
      'SELECT * FROM coding_profiles WHERE user_id = $1 AND platform = $2',
      [req.user.id, platform.toLowerCase()]
    );
    if (profileResult.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const profile = profileResult.rows[0];
    if (profile.verified) return res.json({ message: 'Profile already verified', profile });

    // Fix #28 — Check if this platform+username is already claimed by another user
    const existingClaimResult = await pool.query(
      'SELECT cp.id, cp.user_id, u.name, u.registration_no FROM coding_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.platform = $1 AND cp.username = $2 AND cp.user_id != $3 AND cp.verified = TRUE',
      [platform.toLowerCase(), profile.username, req.user.id]
    );
    
    if (existingClaimResult.rows.length > 0) {
      const existingUser = existingClaimResult.rows[0];
      return res.status(409).json({
        error: 'This account is already linked',
        conflict: true,
        linkedTo: {
          name: existingUser.name,
          registration_no: existingUser.registration_no
        },
        message: `This ${platform} account is already verified and linked to ${existingUser.name} (${existingUser.registration_no}).`
      });
    }

    console.log(`[Verify] Starting verification for ${platform}/@${profile.username}...`);
    const isVerified = await verifyProfile(profile.platform, profile.username, profile.verification_code);
    if (!isVerified) {
      return res.status(400).json({ error: `Verification code not found in your ${platform} profile. Make sure "${profile.verification_code}" is in your bio/about section.` });
    }
    
    console.log(`[Verify] ✓ Verification successful, updating database...`);
    await pool.query('UPDATE coding_profiles SET verified = TRUE WHERE id = $1', [profile.id]);
    
    // Fetch stats after verification
    console.log(`[Verify] Fetching stats for ${platform}/@${profile.username}...`);
    try {
      const stats = await fetchAndStoreStats(req.user.id, profile.platform, profile.username);
      console.log(`[Verify] ✓ Stats fetched and stored:`, stats);
      res.json({ 
        message: 'Profile verified successfully!', 
        verified: true,
        stats 
      });
    } catch (statsErr) {
      console.error(`[Verify] ✗ Stats fetch failed:`, statsErr.message);
      res.json({ 
        message: 'Profile verified, but stats fetch failed. Try refreshing stats manually.', 
        verified: true,
        statsError: statsErr.message 
      });
    }
  } catch (err) {
    console.error(`[Verify] ✗ Error:`, err.message);
    res.status(500).json({ error: sanitizeError(err, 'Profile verification failed. Please try again.') });
  }
});

// GET /api/profiles/user-profiles
router.get('/user-profiles', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM coding_profiles WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err, 'Failed to load profiles.') });
  }
});

// Fix #13 — per-user cooldown to prevent simultaneous refresh abuse
const refreshCooldowns = new Map();
const REFRESH_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

// POST /api/profiles/refresh-stats
router.post('/refresh-stats', authenticate, async (req, res) => {
  const { platform } = req.body;
  const userId = req.user.id;

  // Fix #13 — enforce per-user cooldown
  const lastRefresh = refreshCooldowns.get(userId);
  if (lastRefresh && Date.now() - lastRefresh < REFRESH_COOLDOWN_MS) {
    const remaining = Math.ceil((REFRESH_COOLDOWN_MS - (Date.now() - lastRefresh)) / 1000);
    return res.status(429).json({
      error: `Please wait ${remaining} seconds before refreshing again.`,
      retryAfter: remaining
    });
  }
  refreshCooldowns.set(userId, Date.now());
  
  try {
    const query = platform
      ? 'SELECT * FROM coding_profiles WHERE user_id = $1 AND platform = $2 AND verified = TRUE'
      : 'SELECT * FROM coding_profiles WHERE user_id = $1 AND verified = TRUE';
    const params = platform ? [userId, platform.toLowerCase()] : [userId];
    const profiles = await pool.query(query, params);

    let updated = 0;
    for (const p of profiles.rows) {
      try {
        await fetchAndStoreStats(userId, p.platform, p.username);
        updated++;
      } catch (statErr) {
        console.error(`[refresh-stats] Failed ${p.platform}/@${p.username}: ${statErr.message}`);
      }
    }

    res.json({ message: 'Stats refreshed successfully', updated });
  } catch (err) {
    refreshCooldowns.delete(userId); // Allow retry on error
    res.status(500).json({ error: sanitizeError(err, 'Failed to refresh stats. Please try again.') });
  }
});

/**
 * DELETE /api/profiles/delete-profile
 *
 * Deletes a coding profile. Allows users to remove a profile if they:
 *  - Entered the wrong username
 *  - No longer want to track that platform
 *  - Want to re-add with a different username
 *
 * Also deletes associated stats via CASCADE.
 */
router.delete('/delete-profile', authenticate, async (req, res) => {
  const { platform } = req.body;
  if (!platform) return res.status(400).json({ error: 'Platform required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const platformLower = platform.toLowerCase();

    const result = await client.query(
      'DELETE FROM coding_profiles WHERE user_id = $1 AND platform = $2 RETURNING *',
      [req.user.id, platformLower]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Fix #17 — also clean up orphaned stats, daily_submissions, and contest_history
    await client.query('DELETE FROM stats WHERE user_id = $1 AND platform = $2', [req.user.id, platformLower]);
    await client.query('DELETE FROM daily_submissions WHERE user_id = $1 AND platform = $2', [req.user.id, platformLower]);
    await client.query('DELETE FROM contest_history WHERE user_id = $1 AND platform = $2', [req.user.id, platformLower]);

    await client.query('COMMIT');
    res.json({ message: `${platform} profile and associated data deleted successfully` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: sanitizeError(err, 'Failed to delete profile. Please try again.') });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/profiles/update-username
 *
 * Updates the username for an unverified profile and generates a new verification code.
 * Once a profile is verified, username changes are blocked to prevent abuse.
 */
router.patch('/update-username', authenticate, async (req, res) => {
  const { platform, username } = req.body;
  if (!platform || !username) return res.status(400).json({ error: 'Platform and username required' });

  try {
    const profileResult = await pool.query(
      'SELECT * FROM coding_profiles WHERE user_id = $1 AND platform = $2',
      [req.user.id, platform.toLowerCase()]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = profileResult.rows[0];
    if (profile.verified) {
      return res.status(400).json({ error: 'Cannot change username for verified profiles. Delete and re-add instead.' });
    }

    const verification_code = generateVerificationCode();
    const result = await pool.query(
      'UPDATE coding_profiles SET username = $1, verification_code = $2 WHERE id = $3 RETURNING *',
      [username, verification_code, profile.id]
    );

    res.json({
      profile: result.rows[0],
      message: `Username updated. New verification code: ${verification_code}`
    });
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err, 'Failed to update username. Please try again.') });
  }
});

/**
 * GET /api/profiles/test-fetch?platform=leetcode&username=neal_wu
 *
 * Debug endpoint — fetches stats from a platform without storing them.
 * Useful for testing that the fetchers work before adding a real profile.
 * Protected by auth so it can't be abused publicly.
 */
// Fix #24 — test-fetch disabled in production to prevent external API abuse
if (process.env.NODE_ENV !== 'production') {
  router.get('/test-fetch', authenticate, async (req, res) => {
    const { platform, username } = req.query;
    if (!platform || !username) return res.status(400).json({ error: 'platform and username query params required' });

    const { fetchLeetCodeStats, fetchCodeforcesStats, fetchGFGStats } = require('../services/statsService');
    const fetchers = { leetcode: fetchLeetCodeStats, codeforces: fetchCodeforcesStats, geeksforgeeks: fetchGFGStats };
    const fetcher = fetchers[platform.toLowerCase()];
    if (!fetcher) return res.status(400).json({ error: 'Invalid platform' });

    try {
      const data = await fetcher(username);
      res.json({ platform, username, data });
    } catch (err) {
      res.status(500).json({ error: sanitizeError(err, 'Fetch failed') });
    }
  });
}

module.exports = router;
