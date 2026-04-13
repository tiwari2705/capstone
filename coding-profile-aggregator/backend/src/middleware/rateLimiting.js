/**
 * rateLimiting.js - API Rate Limiting Middleware
 * Prevents abuse and cascading failures
 */

const rateLimit = require('express-rate-limit');

// Standard limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/api/health';
  }
});

// Strict limiter for auth: 5 requests per minute per IP
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: 'Too many login/signup attempts, please try again in a few minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful attempts
});

// Api limiter for public endpoints: 200 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many API requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { limiter, authLimiter, apiLimiter };
