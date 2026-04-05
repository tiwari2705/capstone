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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await closeGFGBrowser();
  await closeHRBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await closeGFGBrowser();
  await closeHRBrowser();
  process.exit(0);
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startCronJobs();
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
