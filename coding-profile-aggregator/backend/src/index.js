require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const dashboardRoutes = require('./routes/dashboard');
const leaderboardRoutes = require('./routes/leaderboard');
const publicProfileRoutes = require('./routes/publicProfile');
const adminRoutes = require('./routes/admin');
const { startCronJobs } = require('./jobs/cronJobs');
const { closeBrowser: closeGFGBrowser } = require('./services/gfgScraper');
const { closeBrowser: closeHRBrowser } = require('./services/hackerRankScraper');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

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

initDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
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
  });

  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await closeGFGBrowser();
      await closeHRBrowser();
      process.exit(0);
    });
    // Force-exit after 5s if server.close() hangs
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
