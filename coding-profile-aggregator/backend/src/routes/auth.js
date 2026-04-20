const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateOTP, sendOTPEmail } = require('../services/emailService');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fix #5 — Returns a safe error message.
 * In production, raw DB/Node errors are never sent to the client.
 */
const sanitizeError = (err, defaultMsg = 'An internal server error occurred') => {
  if (process.env.NODE_ENV === 'production') return defaultMsg;
  return err.message || defaultMsg;
};

/** Fix #4 — Basic email format check */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));

/** Fix #16 — Password must be ≥ 8 chars with at least one letter and one number */
const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, registration_no, course, section, year_of_passing } = req.body;

  // Fix #4 & #16 — validate all inputs before touching the database
  if (!name || !email || !password || !registration_no) {
    return res.status(400).json({ error: 'Name, email, password, and Registration Number are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  }
  if (registration_no.trim().length < 3 || registration_no.trim().length > 50) {
    return res.status(400).json({ error: 'Registration number must be 3–50 characters' });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and contain at least one letter and one number' });
  }
  if (year_of_passing && (parseInt(year_of_passing) < 2000 || parseInt(year_of_passing) > 2050)) {
    return res.status(400).json({ error: 'Year of passing must be between 2000 and 2050' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR registration_no = $2', [email, registration_no]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or Registration Number already registered' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Fix #10 & #11 — Send email FIRST before any DB writes.
    // If the email service fails, no ghost user or orphaned OTP is created.
    try {
      await sendOTPEmail(email, otp, registration_no, 'verification');
    } catch (emailErr) {
      console.error('[Signup] Email send failed:', emailErr.message);
      return res.status(502).json({
        error: 'Could not send verification email. Please check your email address and try again.',
      });
    }

    // Store OTP (only after email confirmed sent)
    await pool.query(
      'INSERT INTO otp_codes (email, registration_no, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [email, registration_no, otp, 'verification', expiresAt]
    );

    // Create user account (unverified)
    const hashed = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (name, email, password, registration_no, course, section, year_of_passing, role, email_verified) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [name.trim(), email.toLowerCase().trim(), hashed, registration_no.trim(), course, section, year_of_passing || null, 'user', false]
    );

    res.status(201).json({
      message: 'Account created. Please check your email for OTP verification.',
      email: email,
      requiresVerification: true,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Signup failed. Please try again.') });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  // Allow registration_no, email OR identifier (frontend sends 'email' field containing registration_no or email)
  const identifier = req.body.registration_no || req.body.identifier || req.body.email;
  const { password } = req.body;

  if (!identifier || !password) return res.status(400).json({ error: 'Registration Number/Email and password required' });
  try {
    // Check users table using registration_no (primary) or email
    const result = await pool.query('SELECT * FROM users WHERE registration_no = $1 OR email = $1 OR username = $1', [identifier]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];

    // Check if email is verified
    if (!user.email_verified && user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'Email not verified. Please verify your email first.',
        requiresVerification: true,
        email: user.email,
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, registration_no: user.registration_no, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Reduced from 7d to 1 day for better security
    );

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Login failed. Please try again.') });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, username, email, registration_no, course, section, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to fetch user profile.') });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    // Find valid OTP
    const otpResult = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND otp = $2 AND purpose = $3 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp, 'verification']
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

    // Update user email_verified status
    const userResult = await pool.query(
      'UPDATE users SET email_verified = TRUE WHERE email = $1 RETURNING id, name, email, registration_no, course, section, role',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Reduced from 7d to 1 day
    );

    res.json({ message: 'Email verified successfully', token, user });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Email verification failed. Please try again.') });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT registration_no, email_verified FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const registrationNo = userResult.rows[0].registration_no;

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Send email first
    try {
      await sendOTPEmail(email, otp, registrationNo, 'verification');
    } catch (emailErr) {
      console.error('[Resend OTP] Email send failed:', emailErr.message);
      return res.status(502).json({ error: 'Could not send OTP email. Please try again later.' });
    }

    // Store OTP only after email confirmed sent
    await pool.query(
      'INSERT INTO otp_codes (email, registration_no, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [email, registrationNo, otp, 'verification', expiresAt]
    );

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to resend OTP. Please try again.') });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { identifier } = req.body; // Can be email or registration_no
  if (!identifier) return res.status(400).json({ error: 'Email or Registration Number is required' });

  try {
    // Find user by email or registration_no
    const userResult = await pool.query(
      'SELECT email, registration_no FROM users WHERE email = $1 OR registration_no = $1',
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { email, registration_no } = userResult.rows[0];

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Send email first
    try {
      await sendOTPEmail(email, otp, registration_no, 'password_reset');
    } catch (emailErr) {
      console.error('[Forgot Password] Email send failed:', emailErr.message);
      return res.status(502).json({ error: 'Could not send reset email. Please try again later.' });
    }

    // Store OTP only after email confirmed sent
    await pool.query(
      'INSERT INTO otp_codes (email, registration_no, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [email, registration_no, otp, 'password_reset', expiresAt]
    );

    res.json({ message: 'OTP sent to your email', email });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Failed to send reset OTP. Please try again.') });
  }
});

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    // Find valid OTP
    const otpResult = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND otp = $2 AND purpose = $3 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp, 'password_reset']
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

    // Generate a temporary token for password reset
    const resetToken = jwt.sign({ email, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    res.json({ message: 'OTP verified', resetToken });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    res.status(500).json({ error: sanitizeError(err, 'OTP verification failed. Please try again.') });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ error: 'Reset token and new password are required' });

  // Fix #16 — validate new password strength
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: 'New password must be at least 8 characters and contain at least one letter and one number' });
  }

  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, decoded.email]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    console.error('Reset password error:', err);
    res.status(500).json({ error: sanitizeError(err, 'Password reset failed. Please try again.') });
  }
});

module.exports = router;
