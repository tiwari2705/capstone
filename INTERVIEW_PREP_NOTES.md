# 📋 Interview Preparation Notes - Coding Profile Aggregator

---

## 1. PROJECT OVERVIEW

### What is it?
**Coding Profile Aggregator** (aka **CodeQuest**) is a full-stack web application that:
- **Aggregates** competitive programming stats from multiple platforms (LeetCode, CodeChef, Codeforces, GeeksforGeeks, HackerRank)
- **Tracks** user progress across all platforms in a unified dashboard
- **Generates** live leaderboards filtered by course/section
- **Manages** user authentication with email verification via OTP
- **Provides** admin capabilities for user management and system monitoring
- **Scrapes** real-time data using Puppeteer with anti-detection mechanisms

### Core Value Proposition
Students can link all their coding profiles, verify ownership, and see unified stats without navigating multiple platforms. Colleges can monitor student progress via leaderboards and analytics.

### Target Users
- Students: Track their competitive programming journey
- Educational Institutions: Monitor student progress and engagement
- Administrators: Manage users, leaderboards, and system configurations

---

## 2. TECH STACK

### Backend
| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js (v16+) |
| **Framework** | Express.js |
| **Database** | PostgreSQL (v12+) |
| **Cache** | Redis (v6+) |
| **Authentication** | JWT + bcryptjs |
| **Web Scraping** | Puppeteer + Puppeteer-Extra (stealth plugin) |
| **Cron Jobs** | node-cron |
| **Email** | Nodemailer |
| **Rate Limiting** | express-rate-limit |
| **HTTP Client** | Axios |
| **Other** | Cheerio (HTML parsing), compression, CORS |

### Frontend
| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (React 19) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **HTTP Client** | Axios |
| **UI Components** | Lucide React (icons) |
| **Charts** | Recharts |
| **Notifications** | React Hot Toast |
| **Data Export** | XLSX |
| **Linting** | ESLint |

### DevOps
- **Deployment**: Render (backend), Vercel (frontend)
- **Database**: PostgreSQL (hosted on Supabase/Railway)
- **Build Tool**: Webpack (via Next.js/Node.js)

---

## 3. ARCHITECTURE

### High-Level Flow
```
[Frontend (Next.js)]
         ↓ (HTTPS/JWT)
[Backend (Express)]
         ↓
[PostgreSQL Database]
         ↓
[Redis Cache]
         ↓ (Puppeteer)
[Coding Platforms APIs/Web Scraping]
```

### Database Schema (Key Tables)

#### `users`
```javascript
{
  id: SERIAL PRIMARY KEY,              // Auto-increment ID
  name: VARCHAR(255),                  // User's full name
  email: VARCHAR(255) UNIQUE,          // Email (unique)
  password: VARCHAR(255),              // Hashed with bcryptjs (salt: 12)
  username: VARCHAR(100) UNIQUE,       // Profile username
  registration_no: VARCHAR(100) UNIQUE,// Student ID (BCS-2023-001 format)
  course: VARCHAR(100),                // "B.Tech CSE"
  section: VARCHAR(50),                // "A", "B", etc.
  role: VARCHAR(20) DEFAULT 'user',    // "user", "admin", "superadmin"
  email_verified: BOOLEAN DEFAULT FALSE,
  year_of_passing: INTEGER,            // 2024, 2025, etc.
  created_at: TIMESTAMP DEFAULT NOW()
}
```

#### `coding_profiles`
```javascript
{
  id: SERIAL PRIMARY KEY,
  user_id: INTEGER (FK→users.id),
  platform: VARCHAR(50),               // "leetcode", "codechef", etc.
  username: VARCHAR(255),              // Platform-specific username
  profile_url: VARCHAR(500),           // Direct link to profile
  verified: BOOLEAN DEFAULT FALSE,     // Ownership verified?
  verification_code: VARCHAR(100),     // Random code user must set as bio
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)            // One profile per platform per user
}
```

#### `stats`
```javascript
{
  id: SERIAL PRIMARY KEY,
  user_id: INTEGER (FK→users.id),
  platform: VARCHAR(50),
  problems_solved: INTEGER DEFAULT 0,
  rating: INTEGER DEFAULT 0,
  easy_solved: INTEGER,
  medium_solved: INTEGER,
  hard_solved: INTEGER,
  submissions: INTEGER DEFAULT 0,
  score: NUMERIC(10,2) DEFAULT 0,
  badges: INTEGER DEFAULT 0,
  rank: VARCHAR(100),
  extra_data: JSONB DEFAULT '{}',      // Platform-specific data
  last_updated: TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
}
```

#### `daily_submissions`
```javascript
{
  id: SERIAL PRIMARY KEY,
  user_id: INTEGER (FK→users.id),
  submission_date: DATE,
  platform: VARCHAR(50),
  count: INTEGER DEFAULT 0,            // Submissions on that day
  created_at: TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, submission_date, platform)
}
```

#### `otp_codes`
```javascript
{
  id: SERIAL PRIMARY KEY,
  email: VARCHAR(255),
  registration_no: VARCHAR(100),
  otp: VARCHAR(6),                     // 6-digit random code
  purpose: VARCHAR(50),                // "verification", "password_reset"
  expires_at: TIMESTAMP,               // 10 minutes from creation
  used: BOOLEAN DEFAULT FALSE,
  created_at: TIMESTAMP DEFAULT NOW()
}
```

---

## 4. KEY FEATURES & IMPLEMENTATION

### 4.1 Authentication Flow

#### Signup Process
1. **Validation**: Email format, password strength (≥8 chars + letter + number), registration_no length
2. **OTP Generation**: 6-digit random code generated
3. **Email Dispatch**: Nodemailer sends OTP to user's email
4. **User Creation**: Account created with `email_verified = false` (password hashed with bcryptjs, salt: 12)
5. **Response**: Success message with instructions to verify email

```javascript
// Validation Example
const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
};
```

#### Login Process
1. **Email/Password Check**: Verify user exists and password matches
2. **Email Verification Check**: Reject if email not verified
3. **JWT Generation**: Create token with user ID, email, registration_no, role
4. **Token Return**: Send token to frontend (stored in localStorage)

#### Email Verification
1. User receives OTP via email
2. User enters OTP in verification page
3. Backend validates: OTP exists, not expired (10 min), purpose is "verification", not already used
4. Mark OTP as used, set `email_verified = true`

#### Token Structure
```javascript
{
  id: number,                  // User ID from database
  email: string,               // User email
  registration_no: string,     // Registration number (BCS-2023-001)
  role: string                 // "user", "admin", or "superadmin"
}
// Signed with JWT_SECRET, expires in 7 days (default)
```

#### Rate Limiting
- **Auth Routes** (`/api/auth/*`): 5 requests/15 mins per IP
- **Admin Routes** (`/api/admin/*`): 20 requests/15 mins (more lenient)
- **General** (`/api/*`): 100 requests/15 mins per IP
- Purpose: Prevent brute-force attacks, DoS

### 4.2 Profile Verification

#### Verification System
1. **User Links Profile**: Provides LeetCode/CodeChef/etc username
2. **Backend Generates Code**: Unique verification code (UUID)
3. **User Sets Bio**: User must add code to their coding platform's bio
4. **Backend Validates**: 
   - Scrapes user's profile
   - Checks if bio contains verification code
   - Sets `verified = true` if found
5. **Stats Tracking**: Only verified profiles are included in leaderboard

#### Supported Platforms
- LeetCode
- CodeChef
- Codeforces
- GeeksforGeeks (GFG)
- HackerRank

### 4.3 Web Scraping & Stats Fetching

#### Technology Stack
- **Puppeteer**: Headless browser automation
- **Puppeteer-Extra + Stealth Plugin**: Bypass anti-bot detection
- **Cheerio**: HTML parsing (alternative to page.evaluate)
- **Retry Logic**: Auto-retry on network failures (up to 3 times)

#### Scraper Architecture
```javascript
// Example: CodeChef Scraper
async function fetchCodeChefStats(username) {
  // 1. Create headless browser page
  let page = await createPage();
  
  // 2. Navigate to profile URL
  await safeGoto(page, `https://www.codechef.com/users/${username}`);
  
  // 3. Wait for content load
  await delay(2000);
  
  // 4. Extract stats via page.evaluate() or Cheerio
  const data = await page.evaluate(() => {
    // DOM manipulation to extract problems_solved, rating, badges, etc.
  });
  
  // 5. Close page and return
  await closePage(page);
  return data;
}
```

#### Data Extracted Per Platform
- **LeetCode**: Easy/Medium/Hard solved, acceptance rate, total questions, ranking
- **CodeChef**: Problems solved, rating, highest rating, global rank
- **Codeforces**: Rating, max rating, contest count, user rank
- **GFG**: Total problems, difficulty-wise breakdown, score
- **HackerRank**: Problems solved, badges, languages, level

### 4.4 Cron Jobs (Scheduled Updates)

#### Job Schedule (All IST Timezone)
| Platform | Time | Frequency | Duration | Guard |
|----------|------|-----------|----------|-------|
| LeetCode | 4:00 AM | Daily | ~30 mins (1000 users) | Yes |
| Codeforces | 4:20 AM | Daily | 4+ hours (slow API) | Yes |
| CodeChef | 5:00 AM | Daily | ~30 mins | Yes |
| GFG | 5:20 AM | Daily | ~20 mins | Yes |
| HackerRank | 5:40 AM | Daily | ~15 mins | Yes |
| OTP Cleanup | 3:00 AM | Daily | ~1 min | Yes |

#### Overlap Guards (Critical)
```javascript
const running = { leetcode: false, codeforces: false, ... };

const withGuard = (key, label, fn) => async () => {
  if (running[key]) {
    console.warn(`[CRON-${label}] Previous run still active — skipping`);
    return;
  }
  running[key] = true;
  try {
    await fn(); // Execute task
  } finally {
    running[key] = false;
  }
};
```

**Why Guards?** Prevents memory exhaustion and database connection pool depletion from parallel runs.

### 4.5 Admin Dashboard

#### Features
- **User Management**: View, search, filter all users
- **User Details**: See individual user stats, profiles, activity
- **Leaderboard Management**: Edit, delete, regenerate leaderboards
- **Admin Actions**: Ban users, reset stats, force refresh
- **Analytics**: System health, scraper status, sync times
- **Section/Course Management**: Add/edit courses and sections

#### Admin-Only Routes
- `GET /api/admin/users` - List all users with filters
- `GET /api/admin/users/:id` - Get specific user details
- `POST /api/admin/users/:id/admin` - Promote to admin
- `DELETE /api/admin/users/:id` - Delete user account
- `POST /api/admin/refresh/:userId` - Force stats refresh
- `GET /api/admin/courses` - List all courses
- `POST /api/admin/courses` - Create new course

### 4.6 Leaderboard

#### Features
- **Live Rankings**: Users ranked by combined score
- **Filtering**: By course, section, platform
- **Time Period**: All-time, weekly, monthly views
- **Score Calculation**: Weighted sum of platform ratings and problems solved
- **Profile Cards**: Click to view detailed user profile

#### Scoring Formula (Example)
```
Total Score = (LeetCode_Rank_Score * 0.3) 
            + (CodeChef_Rating * 0.3) 
            + (Codeforces_Rating * 0.2) 
            + (GFG_Score * 0.1) 
            + (HackerRank_Score * 0.1)
```

---

## 5. API ENDPOINTS

### Authentication Routes (`/api/auth`)
```
POST   /auth/signup              - Create new account
POST   /auth/verify-email        - Verify OTP
POST   /auth/login               - Login with email + password
POST   /auth/forgot-password     - Initiate password reset
POST   /auth/reset-password      - Verify OTP + set new password
POST   /auth/refresh-token       - Get new JWT token
GET    /auth/me                  - Get current user (requires JWT)
```

### Profile Routes (`/api/profiles`)
```
GET    /profiles                 - Get user's linked profiles
POST   /profiles                 - Link new coding profile
GET    /profiles/:platform       - Get specific platform profile
POST   /profiles/:platform/verify - Verify platform ownership
DELETE /profiles/:platform       - Unlink platform profile
```

### Dashboard Routes (`/api/dashboard`)
```
GET    /dashboard                - Get user's dashboard data
GET    /dashboard/stats          - Get aggregated stats
GET    /dashboard/activity       - Get activity heatmap data
POST   /dashboard/refresh        - Force manual refresh
```

### Leaderboard Routes (`/api/leaderboard`)
```
GET    /leaderboard              - Get ranked users
GET    /leaderboard/filters      - Get available filters
GET    /leaderboard/courses      - List all courses
GET    /leaderboard/sections     - List sections for a course
```

### Public Profile Routes (`/api/public`)
```
GET    /public/:username         - Get public profile view
GET    /public/:username/badges  - Get user's earned badges
```

### Admin Routes (`/api/admin`)
```
GET    /admin/users              - List all users
GET    /admin/users/:id          - Get user details
DELETE /admin/users/:id          - Delete user
POST   /admin/users/:id/admin    - Promote to admin
POST   /admin/refresh/:userId    - Force stats refresh
GET    /admin/courses            - List all courses
POST   /admin/courses            - Create course
GET    /admin/analytics          - System analytics
```

---

## 6. SECURITY CONSIDERATIONS

### Authentication & Authorization
✅ **JWT-based**: Stateless authentication  
✅ **Password Hashing**: bcryptjs with salt rounds = 12  
✅ **Email Verification**: OTP prevents fake emails  
✅ **Rate Limiting**: Brute-force protection  
✅ **Role-Based Access**: user, admin, superadmin  

### Validation & Input Sanitization
✅ **Email Format**: Regex validation before DB queries  
✅ **Password Strength**: Min 8 chars + letter + number  
✅ **Registration Number**: 3-50 chars, unique  
✅ **Error Sanitization**: Production mode hides error details  

### Database Security
✅ **Connection Pooling**: 20 max connections, 2 min, 30s idle timeout  
✅ **Statement Timeout**: 30 seconds (prevents hanging queries)  
✅ **Request Timeout**: 30 seconds per request  
✅ **Body Size Limit**: 10KB max (prevents DoS)  

### CORS & Cross-Site Protection
✅ **CORS Whitelist**: Only allows frontend origin  
✅ **Credentials Flag**: Enabled for token passing  

### Data Privacy
✅ **Cascade Deletes**: User deletion removes all linked data  
✅ **No Sensitive Leaks**: Raw errors caught and sanitized  

---

## 7. PERFORMANCE OPTIMIZATIONS

### Caching Strategy
- **Redis**: Cache frequently accessed data (user stats, leaderboards)
- **Browser Cache**: Static assets cached on CDN (Vercel)
- **Database Indexes**: On `user_id`, `platform`, `email`, `registration_no`

### Rate Limiting Tiers
```
Auth endpoints:        5 req/15 min
Admin endpoints:      20 req/15 min
General endpoints:   100 req/15 min
```

### Scraping Optimizations
1. **Retry Logic**: Auto-retry failed scrapes (max 3 attempts)
2. **Delay Injection**: 2000ms between scrapes to avoid rate limits
3. **Stealth Mode**: Puppeteer-Extra-Stealth prevents bot detection
4. **Connection Pooling**: Reuse browser pages where possible
5. **Overlap Guards**: Prevent parallel job execution

### Frontend Optimizations
- **Next.js Image Optimization**: Automatic format conversion
- **Code Splitting**: Route-based lazy loading
- **Compression**: gzip at 6 compression level
- **Recharts**: Lazy-load chart components

---

## 8. COMMON ISSUES & FIXES

### Issue #1: Database Connection Pool Exhaustion
**Problem**: "FATAL: remaining connection slots are reserved"  
**Root Cause**: Supabase free tier (~20-60 connections limit), Puppeteer uses many connections  
**Fix**: Set pool `max: 20, min: 2, idleTimeoutMillis: 30000`  

### Issue #2: Scraper Overlap (Memory Leak)
**Problem**: Multiple cron jobs running in parallel → OOM  
**Root Cause**: Puppeteer browsers × 1000 users = 10+ GB RAM  
**Fix**: Add overlap guards (`running[key]` flag checks)  

### Issue #3: OTP Email Failures
**Problem**: Signup API returns 201 but email never arrives  
**Root Cause**: EMAIL_USER/EMAIL_PASSWORD not set, or sent to spam  
**Fix**: Validate email config, check spam folder, regenerate app password  

### Issue #4: CORS Errors on Deployment
**Problem**: Frontend can't reach backend API  
**Root Cause**: FRONTEND_URL env var doesn't match actual Vercel URL  
**Fix**: Set `FRONTEND_URL=https://your-vercel-domain.vercel.app` on Render  

### Issue #5: Token Invalidation
**Problem**: Frontend token stored in localStorage but backend rejects  
**Root Cause**: JWT_SECRET changed or token expired  
**Fix**: Re-login to get new token, or extend expiration in JWT config  

---

## 9. DEPLOYMENT

### Backend (Render)
```bash
# Environment Variables Required
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-specific-password
FRONTEND_URL=https://your-frontend.vercel.app
PORT=5000
```

**Build Command**: `npm run build` (installs Puppeteer)  
**Start Command**: `npm start`  

### Frontend (Vercel)
```bash
# Auto-deploys from GitHub
# No special config needed (Next.js auto-detected)
```

### Database (Supabase/Railway)
```bash
# Backup & Restore
pg_dump -U postgres DATABASE_URL > backup.sql
psql -U postgres DATABASE_URL < backup.sql
```

---

## 10. POTENTIAL INTERVIEW QUESTIONS & ANSWERS

### Q1: How do you handle web scraping at scale?
**A:** Use Puppeteer with stealth plugin to bypass bot detection. Implement:
- Delay injection (2s between requests)
- Retry logic (max 3 attempts)
- Connection pooling
- Overlap guards to prevent parallel execution
- Browser page reuse

### Q2: Why did you choose PostgreSQL + Redis?
**A:** 
- **PostgreSQL**: ACID-compliant, handles relational data (users ↔ profiles ↔ stats), supports JSONB for flexible data
- **Redis**: Fast caching for frequently accessed data (leaderboards, stats), reduces DB load

### Q3: How do you authenticate users securely?
**A:** JWT tokens + email verification:
- Sign up with strong password (8+ chars, letter + number)
- Send OTP via email for verification
- On login, return JWT token (stateless)
- Rate limiting prevents brute-force
- Password hashed with bcryptjs (salt: 12)

### Q4: How do you prevent the cron jobs from overlapping?
**A:** Use a `running` flag per platform:
```javascript
if (running[key]) {
  console.warn(`Previous run still active — skipping`);
  return;
}
```
This prevents memory exhaustion and DB connection pool depletion.

### Q5: How would you scale this to 100,000 users?
**A:**
- Use message queue (Bull, RabbitMQ) instead of node-cron
- Distribute scraping across multiple workers
- Implement database read replicas for analytics queries
- Use CDN for static assets
- Implement aggressive caching (Redis)
- Batch stats updates instead of real-time

### Q6: How do you handle 3rd-party API rate limits?
**A:**
- **CodeChef/LeetCode**: Scrape at specific hours (4 AM IST)
- **Codeforces**: Slower API → longer intervals between requests
- **Retries**: Exponential backoff on 429/503 errors
- **Delays**: 2000ms between sequential requests

### Q7: What's the biggest challenge you faced?
**A:** Web scraping reliability. Platforms change DOM structure, add anti-bot measures, rate-limit requests. Solution: Use stealth plugins, handle selector changes gracefully, implement robust error handling.

### Q8: How do you ensure data consistency?
**A:**
- Unique constraints on (user_id, platform) for stats/profiles
- Foreign key relationships (cascade delete)
- Transaction handling for multi-step operations (signup: email → OTP → user)
- One profile per platform per user

### Q9: What would you do differently next time?
**A:**
- Use GraphQL instead of REST for flexible queries
- Implement WebSocket for real-time leaderboard updates
- Add more comprehensive logging and monitoring (Sentry, DataDog)
- Separate scraping into microservice
- Add integration tests and E2E tests
- Implement database migrations (Knex.js, TypeORM)

---

## 11. QUICK REFERENCE

### Important Files
- **Backend Entry**: `backend/src/index.js` (Express setup)
- **Auth Logic**: `backend/src/routes/auth.js` (signup, login, verification)
- **Scrapers**: `backend/src/services/*Scraper.js` (LeetCode, CodeChef, etc.)
- **Cron Jobs**: `backend/src/jobs/cronJobs.js` (scheduled tasks)
- **DB Schema**: `backend/src/config/db.js` (table definitions)
- **Frontend Entry**: `frontend/app/page.tsx` (homepage)
- **Dashboard**: `frontend/app/dashboard/page.tsx` (user dashboard)

### Useful Commands
```bash
# Backend
npm install
npm run dev                  # Start with auto-reload
npm run kill-port          # Kill process on port 5000
npm run build              # Install Puppeteer

# Frontend
npm install
npm run dev                # Start Next.js dev server
npm run build              # Production build
npm run lint               # Run ESLint

# Database
psql -U postgres -d database_name  # Connect
\dt                                # List tables
```

### Environment Variables Checklist
- ✅ `DATABASE_URL`: PostgreSQL connection string
- ✅ `JWT_SECRET`: Secret for signing tokens (min 32 chars)
- ✅ `NODE_ENV`: "production" or "development"
- ✅ `EMAIL_USER`: Gmail address
- ✅ `EMAIL_PASSWORD`: Gmail app-specific password
- ✅ `FRONTEND_URL`: Next.js deployment URL
- ✅ `PORT`: Server port (default 5000)
- ✅ `REDIS_URL`: Redis connection (if using caching)

---

## 12. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  - Home, Dashboard, Leaderboard, Profile                │
│  - Tailwind CSS, Recharts, React Hot Toast              │
└─────────────────────────────────────────────────────────┘
                            ↓ (HTTP/JWT)
┌─────────────────────────────────────────────────────────┐
│                  Backend (Express.js)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Routes: Auth, Profiles, Dashboard, Leaderboard    │ │
│  │ Middleware: Auth, Rate Limit, Error Handler       │ │
│  │ Services: Scrapers (Puppeteer), Email, Cache      │ │
│  │ Jobs: Cron tasks (overlap guards)                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
            ↓ (SQL)          ↓ (Puppeteer)      ↓ (SMTP)
┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
│   PostgreSQL     │  │ Coding Platforms │  │  Gmail SMTP  │
│ (stats, users,   │  │ (LeetCode,       │  │ (OTP Emails) │
│  profiles)       │  │  CodeChef, etc)  │  │              │
└──────────────────┘  └──────────────────┘  └──────────────┘
```

---

## 13. DEVELOPMENT WORKFLOW

### Local Setup
```bash
# 1. Clone repo
git clone <repo>
cd coding-profile-aggregator

# 2. Backend setup
cd backend
cp .env.example .env  # Fill in secrets
npm install
npm run build
npm run dev

# 3. Frontend setup (new terminal)
cd ../frontend
npm install
npm run dev

# 4. Visit http://localhost:3000
```

### Testing Signup Flow
1. Visit http://localhost:3000/signup
2. Enter email, strong password, registration number
3. Check terminal/logs for OTP (development mode)
4. Enter OTP in verification page
5. Redirect to login → dashboard

### Testing Profile Verification
1. Login to dashboard
2. Click "Add Profile" → Select LeetCode
3. Enter LeetCode username
4. Add verification code to LeetCode bio
5. Click "Verify Ownership"
6. Backend scrapes profile, checks bio, marks verified

---

## 14. GLOSSARY

| Term | Meaning |
|------|---------|
| **JWT** | JSON Web Token — stateless authentication method |
| **OTP** | One-Time Password — 6-digit code for email verification |
| **Puppeteer** | Headless Chrome/Chromium browser automation library |
| **Stealth Plugin** | Puppeteer-Extra plugin to bypass bot detection |
| **CORS** | Cross-Origin Resource Sharing — security policy |
| **Rate Limiting** | Restrict request frequency to prevent abuse |
| **Cron Job** | Scheduled task that runs at fixed times |
| **Overlap Guard** | Flag to prevent parallel execution of same task |
| **Connection Pool** | Reuse database connections for efficiency |
| **Cascade Delete** | Delete child records when parent is deleted |
| **JSONB** | JSON Binary format in PostgreSQL (queryable) |
| **bcryptjs** | Password hashing library (CPU-intensive) |

---

**Last Updated**: April 26, 2026  
**Project Status**: Production-Ready  
**Maintained By**: You (Harsh Tiwari)

Good luck with your interviews! 🚀
