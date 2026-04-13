# Performance Optimization Guide - Handle 1000+ Users

**Priority Level Legend:** 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low

---

## 1. 🔴 Database Indexes (Implement ASAP - 5 min)

**Impact:** Queries 10-50x faster | Implementation: 5 minutes

Add these indexes to your `initDB()` function:

```javascript
// Add this to db.js after table creation
await client.query(`
  -- User lookups
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_registration_no ON users(registration_no);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

  -- Stats lookups
  CREATE INDEX IF NOT EXISTS idx_stats_user_id ON stats(user_id);
  CREATE INDEX IF NOT EXISTS idx_stats_platform ON stats(platform);
  CREATE INDEX IF NOT EXISTS idx_stats_rating ON stats(rating DESC);
  CREATE INDEX IF NOT EXISTS idx_stats_problems ON stats(problems_solved DESC);
  CREATE INDEX IF NOT EXISTS idx_stats_score ON stats(score DESC);
  CREATE INDEX IF NOT EXISTS idx_stats_user_platform ON stats(user_id, platform);

  -- Coding profiles lookups
  CREATE INDEX IF NOT EXISTS idx_coding_profiles_user_id ON coding_profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_coding_profiles_verified ON coding_profiles(verified);
  CREATE INDEX IF NOT EXISTS idx_coding_profiles_platform ON coding_profiles(platform);
  CREATE INDEX IF NOT EXISTS idx_coding_profiles_user_platform ON coding_profiles(user_id, platform);

  -- Daily submissions lookups
  CREATE INDEX IF NOT EXISTS idx_daily_submissions_user_id ON daily_submissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_daily_submissions_date ON daily_submissions(submission_date DESC);
  CREATE INDEX IF NOT EXISTS idx_daily_submissions_user_date ON daily_submissions(user_id, submission_date);

  -- OTP lookups
  CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
  CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

  -- Contest history
  CREATE INDEX IF NOT EXISTS idx_contest_history_user_id ON contest_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_contest_history_date ON contest_history(contest_date DESC);
`);
```

**Why:** Without indexes, every leaderboard query scans entire tables. With 10,000 users = 40,000 stats rows.

---

## 2. 🔴 Database Connection Pool Optimization (5 min)

**Impact:** Prevents connection exhaustion | Current: 10 connections

Update `db.js`:

```javascript
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections (was ~10)
  idleTimeoutMillis: 30000,   // Close idle after 30s
  connectionTimeoutMillis: 2000,
  statement_timeout: '30s',   // Kill queries taking >30s
  query_timeout: '30s'
});

// Add a query monitor
pool.on('error', (err, client) => {
  console.error('Unexpected DB pool error:', err);
  process.exit(-1);
});
```

**Why:** 1000 concurrent users need more connections. Default ~10 connections gets exhausted quickly.

---

## 3. 🔴 Add Response Compression (2 min)

**Impact:** 60-80% smaller API responses

In `index.js`, add after `app.use(express.json())`:

```javascript
const compression = require('compression');
app.use(compression({
  filter: (req, res) => {
    // Don't compress if request says so
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6  // Balance between speed and compression ratio
}));
```

Add to `package.json`:
```json
"compression": "^1.7.4"
```

**Why:** Reduces bandwidth by 60-80%. Leaderboard JSON with 1000 users = 5MB → 1MB.

---

## 4. 🟡 Add Redis Caching (30 min setup)

**Impact:** Reduces DB queries by 80% | Critical for leaderboard

**Step 1:** Install Redis client
```bash
npm install redis
```

**Step 2:** Create a cache service (`src/services/cacheService.js`):

```javascript
const redis = require('redis');

let client = null;

const getRedisClient = async () => {
  if (client && client.isReady) return client;
  
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      connectTimeout: 10000,
    }
  });

  client.on('error', (err) => console.error('Redis error:', err));
  client.on('connect', () => console.log('[Redis] Connected'));
  client.on('disconnect', () => console.log('[Redis] Disconnected'));

  await client.connect();
  return client;
};

const getCached = async (key) => {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[Cache] Get error for ${key}:`, err.message);
    return null;
  }
};

const setCached = async (key, value, ttlSeconds = 300) => {
  try {
    const client = await getRedisClient();
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error(`[Cache] Set error for ${key}:`, err.message);
  }
};

const deleteCached = async (key) => {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (err) {
    console.error(`[Cache] Delete error for ${key}:`, err.message);
  }
};

const clearPattern = async (pattern) => {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.error(`[Cache] Clear pattern error:`, err.message);
  }
};

module.exports = { getCached, setCached, deleteCached, clearPattern, getRedisClient };
```

**Step 3:** Update leaderboard route (`routes/leaderboard.js`):

```javascript
const { getCached, setCached, deleteCached } = require('../services/cacheService');

router.get('/', optionalAuth, async (req, res) => {
  const { sort = 'score', order = 'desc', course, section, limit = 50, offset = 0 } = req.query;
  
  try {
    // Create cache key
    const cacheKey = `leaderboard:${sort}:${order}:${course || 'all'}:${section || 'all'}:${limit}:${offset}`;
    
    // Try cache first
    const cached = await getCached(cacheKey);
    if (cached) {
      console.log(`[Cache] HIT: ${cacheKey}`);
      return res.json(cached);
    }

    console.log(`[Cache] MISS: ${cacheKey}`);

    const validSorts = ['score', 'total_problems', 'name'];
    const sortCol = validSorts.includes(sort) ? sort : 'score';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = '';
    const params = [];
    if (course) { params.push(course); whereClause += ` AND u.course = $${params.length}`; }
    if (section) { params.push(section); whereClause += ` AND u.section = $${params.length}`; }

    params.push(parseInt(limit), parseInt(offset));

    const query = `
      SELECT u.id, u.name, u.course, u.section, u.registration_no,
             COALESCE(lc.problems_solved, 0) AS leetcode_problems,
             COALESCE(cf.rating, 0) AS codeforces_rating,
             COALESCE(cf.problems_solved, 0) AS codeforces_problems,
             COALESCE(gfg.problems_solved, 0) AS gfg_problems,
             (COALESCE(lc.problems_solved, 0) + COALESCE(cf.problems_solved, 0) + COALESCE(gfg.problems_solved, 0)) AS total_problems,
             ROUND(COALESCE(lc.problems_solved, 0) * 1.0 + COALESCE(cf.rating, 0) * 0.1 + COALESCE(gfg.problems_solved, 0) * 1.0, 2) AS score
      FROM users u
      LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
      LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
      LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
      WHERE u.role = 'user' ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);
    const ranked = result.rows.map((row, idx) => ({ rank: parseInt(offset) + idx + 1, ...row }));
    const response = { leaderboard: ranked, total: ranked.length };

    // Cache for 5 minutes
    await setCached(cacheKey, response, 300);
    
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Step 4:** Invalidate cache when stats update

In `statsService.js`, add after stats update:

```javascript
const { deleteCached, clearPattern } = require('./cacheService');

// After fetchAndStoreStats() completes:
await clearPattern('leaderboard:*');
console.log('[Cache] Invalidated all leaderboard caches');
```

---

## 5. 🟡 Add API Rate Limiting (10 min)

**Impact:** Prevents abuse | Prevents cascading failures

Install:
```bash
npm install express-rate-limit redis-rate-limit
```

Create `src/middleware/rateLiming.js`:

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../services/cacheService');

const limiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl-strict:',
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,                   // 5 requests per minute
  message: 'Too many login attempts',
});

module.exports = { limiter, strictLimiter };
```

Use in `index.js`:

```javascript
const { limiter, strictLimiter } = require('./middleware/rateLimiting');

app.use('/api/', limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/signup', strictLimiter);
```

---

## 6. 🟡 Optimize Dashboard Query (5 min)

**Current issue:** Selects all stats columns including `active_days` which is expensive

Update `routes/dashboard.js`:

```javascript
// BEFORE: Gets ALL stats columns
pool.query('SELECT * FROM stats WHERE user_id = $1', [req.user.id])

// AFTER: Get only needed columns
pool.query(`
  SELECT user_id, platform, problems_solved, rating, easy_solved, 
         medium_solved, hard_solved, submissions, score, badges, 
         last_updated, extra_data
  FROM stats 
  WHERE user_id = $1
`, [req.user.id])
```

Also add caching:

```javascript
const { getCached, setCached } = require('../services/cacheService');

router.get('/', authenticate, async (req, res) => {
  try {
    const cacheKey = `dashboard:${req.user.id}`;
    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    // ... existing query code ...

    const response = {
      user, profiles, stats: statsMap, 
      dailySubmissions, contestHistory, 
      totalProblems, totalActiveDays, 
      totalSubmissions, totalBadges,
      streaks: { maxStreak, currentStreak },
      heatmapData, contests, contestRankings
    };

    await setCached(cacheKey, response, 600); // Cache 10 min
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## 7. 🟡 Add Query Timeouts (2 min)

**Impact:** Prevents long-running queries from blocking server

Update `db.js`:

```javascript
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: '30s',  // Kill queries after 30s
  query_timeout: '30s'
});

// Add query wrapper to log slow queries
const queryWithTimeout = async (query, params, timeoutMs = 30000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  );
  return Promise.race([
    pool.query(query, params),
    timeoutPromise
  ]);
};

module.exports = { pool, queryWithTimeout };
```

---

## 8. 🟢 Query Optimization - Leaderboard (5 min)

**Issue:** JOINing 6 tables for every leaderboard request

**Option A: Simple column removal** (Implement now)
```javascript
// Remove: active_days, badges, rank - not used in leaderboard
SELECT u.id, u.name, u.course, u.section, u.registration_no,
       COALESCE(lc.problems_solved, 0) AS lc_problems,
       COALESCE(cf.rating, 0) AS cf_rating,
       COALESCE(cf.problems_solved, 0) AS cf_problems,
       COALESCE(gfg.problems_solved, 0) AS gfg_problems,
       (... calc score ...) AS score
FROM users u
LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks'
WHERE u.role = 'user'
ORDER BY score DESC
LIMIT 50
```

**Option B: Materialized view** (Advanced - implement if needed)
```javascript
// Create a cached table that updates every 10 minutes
CREATE MATERIALIZED VIEW leaderboard_view AS
  SELECT u.id, u.name, u.course, u.section, u.registration_no,
         (COALESCE(lc.problems_solved, 0) + 
          COALESCE(cf.rating, 0) * 0.1 + 
          COALESCE(gfg.problems_solved, 0)) AS score,
         -- ... other columns
  FROM users u
  LEFT JOIN stats lc ON lc.user_id = u.id AND lc.platform = 'leetcode'
  LEFT JOIN stats cf ON cf.user_id = u.id AND cf.platform = 'codeforces'
  LEFT JOIN stats gfg ON gfg.user_id = u.id AND gfg.platform = 'geeksforgeeks';

CREATE INDEX idx_leaderboard_score ON leaderboard_view(score DESC);
```

---

## 9. 🟢 Implement Pagination API Standard (2 min)

**Update leaderboard response:**

```javascript
const total = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
const totalCount = parseInt(total.rows[0].count);

res.json({
  leaderboard: ranked,
  pagination: {
    page: Math.floor(offset / limit) + 1,
    limit: parseInt(limit),
    offset: parseInt(offset),
    total: totalCount,
    pages: Math.ceil(totalCount / limit)
  }
});
```

---

## 10. 🟢 Add Error Tracking/Monitoring (Optional)

Use Sentry for error tracking:

```bash
npm install @sentry/node
```

In `index.js`:

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## 11. 🔵 Environment Variables to Add

Update `.env`:

```env
# Database
REDIS_URL=redis://localhost:6379
STATEMENT_TIMEOUT=30s

# API
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Caching
CACHE_TTL_LEADERBOARD=300
CACHE_TTL_DASHBOARD=600

# Monitoring
SENTRY_DSN=https://xxxxx@xxxx.ingest.sentry.io/xxxxx
```

---

## Quick Wins (Implement in Order)

| # | Task | Time | Impact | Difficulty |
|---|------|------|--------|------------|
| 1 | Add Database Indexes | 5 min | 🔴 Critical | Easy |
| 2 | Increase Connection Pool | 2 min | 🔴 Critical | Easy |
| 3 | Add Response Compression | 2 min | 🟡 High | Easy |
| 4 | Add Redis Caching | 30 min | 🔴 Critical | Medium |
| 5 | Add Rate Limiting | 10 min | 🟡 High | Easy |
| 6 | Query Timeouts | 2 min | 🟡 High | Easy |
| 7 | Remove unused columns | 5 min | 🟢 Medium | Easy |
| 8 | Add Monitoring | 15 min | 🟢 Medium | Easy |

---

## Expected Performance Improvement

**Current Setup (No optimization):**
- 100 users: ✅ Works
- 300 users: ⚠️ Degrading
- 1000 users: 💥 Broken

**After Implementing #1-5:**
- 100 users: ✅ Excellent
- 300 users: ✅ Stable
- 1000 users: ⚠️ Handling (with caching)
- 5000 users: ⚠️ Possible with load balancing

**After Full Implementation (#1-11):**
- 1000 users: ✅ Stable
- 5000 users: ✅ Works
- 10000+ users: Need horizontal scaling

---

## Next Steps

1. Start with **#1-3** (30 min, easy wins)
2. Add **Redis + Caching** (#4)
3. Monitor with **Sentry** (#10)
4. Then consider load balancing / horizontal scaling

Would you like me to implement any of these?
