require('dotenv').config();

// ─── Startup environment validation ─────────────────────────────────────────
// Fail FAST and clearly rather than silently using undefined secrets.
// Fix #5/10 — NODE_ENV, EMAIL_USER and EMAIL_PASSWORD are now required.
// Without NODE_ENV: sanitizeError() never activates, raw DB errors leak to clients.
// Without EMAIL_*: server starts 'successfully' but all signup/password-reset
//   flows throw 502 errors on the very first OTP send.
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'NODE_ENV', 'EMAIL_USER', 'EMAIL_PASSWORD'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('[FATAL] Set these in your .env file or deployment platform, then restart.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const axios = require('axios'); // Fix #27 — moved from inside setInterval callback
const { pool, initDB, getIsDBReady } = require('./config/db');
const { limiter, authLimiter, adminLimiter } = require('./middleware/rateLimiting');
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

// Fix #7 — explicit body size limit prevents DoS via oversized payloads.
// Default Express limit is 100kb but unspecified — making it explicit and tighter.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Request Timeout Protection ─────────────────────────────────────────────
// Prevent requests from hanging indefinitely
app.use((req, res, next) => {
  // Set timeout for request and response
  req.setTimeout(30000, () => {
    console.error(`[Timeout] Request timeout: ${req.method} ${req.path}`);
    res.status(408).json({ error: 'Request timeout' });
  });
  res.setTimeout(30000, () => {
    console.error(`[Timeout] Response timeout: ${req.method} ${req.path}`);
  });
  next();
});

// Performance Middlewares
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6
}));

// Rate Limiting — order matters! More specific routes MUST come before general ones.
app.use('/api/admin', adminLimiter); // More lenient for admin routes
app.use('/api/auth/login', authLimiter);  // Fix #25 — must be BEFORE general limiter
app.use('/api/auth/signup', authLimiter);
app.use('/api/', limiter); // General limiter last (catches everything else)

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

app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    database: 'unknown',
  };

  // Check database connection
  try {
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch (err) {
    health.database = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Global error handler with better logging
app.use((err, req, res, next) => {
  // Log error with context
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    path: req.path,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Send appropriate error response
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';

  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
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
