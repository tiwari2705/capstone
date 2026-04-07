const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateOTP, sendOTPEmail } = require('../services/emailService');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, registration_no, course, section } = req.body;
  if (!name || !email || !password || !registration_no) {
    return res.status(400).json({ error: 'Name, email, password, and Registration Number are required' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR registration_no = $2', [email, registration_no]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or Registration Number already registered' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store OTP
    await pool.query(
      'INSERT INTO otp_codes (email, registration_no, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [email, registration_no, otp, 'verification', expiresAt]
    );
    
    // Send OTP email
    await sendOTPEmail(email, otp, registration_no, 'verification');
    
    // Create user account (unverified)
    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, registration_no, course, section, role, email_verified) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, email, registration_no, course, section, role, email_verified',
      [name, email, hashed, registration_no, course, section, 'user', false]
    );
    
    res.status(201).json({ 
      message: 'Account created. Please check your email for OTP verification.',
      email: email,
      requiresVerification: true
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
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
        email: user.email
      });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, registration_no: user.registration_no, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, username, email, registration_no, course, section, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ error: err.message });
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
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.json({ message: 'Email verified successfully', token, user });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: err.message });
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
    
    // Store OTP
    await pool.query(
      'INSERT INTO otp_codes (email, registration_no, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [email, registrationNo, otp, 'verification', expiresAt]
    );
    
    // Send OTP email
    await sendOTPEmail(email, otp, registrationNo, 'verification');
    
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: err.message });
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
    
    // Store OTP
    await pool.query(
      'INSERT INTO otp_codes (email, registration_no, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [email, registration_no, otp, 'password_reset', expiresAt]
    );
    
    // Send OTP email
    await sendOTPEmail(email, otp, registration_no, 'password_reset');
    
    res.json({ message: 'OTP sent to your email', email });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ error: 'Reset token and new password are required' });
  
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
