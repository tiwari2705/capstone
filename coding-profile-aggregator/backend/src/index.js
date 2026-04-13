require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { initDB, getIsDBReady } = require('./config/db');
const { limiter, authLimiter } = require('./middleware/rateLimiting');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const dashboardRoutes = require('./routes/dashboard');
const leaderboardRoutes = require('./routes/leaderboard');
const publicProfileRoutes = require('./routes/publicProfile');
const adminRoutes = require('./routes/admin');
const { startCronJobs } = require('./jobs/cronJobs');
const { closeBrowser } = require('./services/browserManager');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ 
  origin: function (origin, callback) {
    const allowed = [process.env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean);
    const isAllowed = !origin || allowed.some(url => url === origin || url.replace(/\/$/, '') === origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS REJECTED] Origin: "${origin}" | Allowed (from env): ${process.env.FRONTEND_URL}`);
      console.warn(`[CORS TIP] Ensure FRONTEND_URL in Render matches your Vercel URL exactly (including https://).`);
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json());

// Performance Middlewares
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6
}));

// Rate Limiting
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Readiness middleare (skip for health check)
app.use((req, res, next) => {
  if (!getIsDBReady() && req.path.startsWith('/api/') && req.path !== '/api/health') {
    return res.status(503).json({ error: 'Backend is starting up and initializing database...' });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', publicProfileRoutes); // Public profile route
app.use('/api/admin', adminRoutes); // Admin routes

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Environment Validation Logs
console.log('--- Environment Check ---');
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'NOT SET (defaulting to localhost:3000)'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'PRESENT' : 'MISSING'}`);
console.log(`BACKEND_URL (for self-ping): ${process.env.BACKEND_URL || 'NOT SET'}`);
console.log(`PORT: ${PORT}`);
console.log('-------------------------');

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize DB in background
  initDB().then(() => {
    startCronJobs();
    
    // Self-ping to keep Render instance alive
    const BACKEND_URL = process.env.BACKEND_URL;
    if (BACKEND_URL) {
      console.log(`[Keep-Alive] Starting self-ping for: ${BACKEND_URL}`);
      setInterval(async () => {
        try {
          const axios = require('axios');
          await axios.get(`${BACKEND_URL}/api/health`);
          console.log('[Keep-Alive] Self-ping successful');
        } catch (err) {
          console.error('[Keep-Alive] Self-ping failed:', err.message);
        }
      }, 10 * 60 * 1000); // Ping every 10 minutes
    }
  }).catch(err => {
    console.error('Failed to initialize DB:', err);
    // Don't exit process here, let the status 503 handle it for the frontend
  });
});

const shutdown = async (signal) => {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await closeBrowser();
    process.exit(0);
  });
  // Force-exit after 5s if server.close() hangs
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled rejections (common with Puppeteer/Chromium crashes)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
  // Don't crash the server, just log it
});
