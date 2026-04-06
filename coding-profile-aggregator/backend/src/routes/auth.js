const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

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
    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, registration_no, course, section, role) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, email, registration_no, course, section, role',
      [name, email, hashed, registration_no, course, section, 'user']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ token, user });
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

module.exports = router;
