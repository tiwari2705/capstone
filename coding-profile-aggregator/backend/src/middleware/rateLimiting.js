/**
 * rateLimiting.js - API Rate Limiting Middleware
 * Prevents abuse and cascading failures
 */

const rateLimit = require('express-rate-limit');

// Skip rate limiting for localhost in development — checks IP only, NOT NODE_ENV,
// so production traffic is always rate-limited even if NODE_ENV is misconfigured.
const skipLocalhost = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1'
  );
};


// Standard limiter: 1000 requests per 15 minutes per IP (increased for 1000 users)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 300
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit health checks or localhost
    return req.path === '/api/health' || skipLocalhost(req);
  }
});

// Auth limiter: 50 requests per minute per IP (was 5 — too strict for dev)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: 'Too many login/signup attempts, please try again in a few minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful attempts
  skip: skipLocalhost,
});

// Api limiter for public endpoints: 500 requests per 15 minutes (increased)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Increased from 200
  message: 'Too many API requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalhost,
});

// Admin limiter: More lenient for authenticated admin users - 1000 requests per 15 minutes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 500
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalhost,
});

module.exports = { limiter, authLimiter, apiLimiter, adminLimiter };

