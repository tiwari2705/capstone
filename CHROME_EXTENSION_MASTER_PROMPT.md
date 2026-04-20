# CHROME EXTENSION MASTER PROMPT
## Coding Profile Aggregator - Time Tracking Extension

---

## 1. PROJECT CONTEXT

### Backend Base URL
- **Production:** `https://coding-profile-aggregator.onrender.com/api` (or your deployed URL)
- **Development:** `http://localhost:5000/api`
- **Port:** 5000

### Frontend
- **Tech:** Next.js (TypeScript)
- **Base URL:** `http://localhost:3000` (dev) or Vercel deployment
- **Storage:** Browser localStorage for tokens

### Database
- **Type:** PostgreSQL
- **Connection String:** `process.env.DATABASE_URL`
- **Pool:** 20 max connections

---

## 2. AUTHENTICATION ARCHITECTURE

### JWT Token Structure
```javascript
{
  id: number,           // User ID from database
  email: string,        // User email
  registration_no: string,  // Registration number (key identifier)
  role: string          // "user", "admin", or "superadmin"
}
```

### Token Management
- **Location:** `localStorage.getItem('token')`
- **Set on login:** `localStorage.setItem('token', token)`
- **Header format:** `Authorization: Bearer {token}`
- **Token expiration:** Check in middleware (invalidated on 401)

### API Request Pattern
```javascript
// All authenticated requests must include:
Authorization: Bearer {JWT_TOKEN}

// Example fetch:
fetch('/api/time-tracking/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

---

## 3. USER IDENTIFICATION VARIABLES

### Primary Identifier (in Extension)
```javascript
// Extension should use registration_no as PRIMARY identifier
const userRegistrationNo = "BCS-2023-001"; // Example format

// Secondary identifiers
const userId = 42;              // Numeric DB ID (from JWT)
const userEmail = "user@example.com";
const sessionToken = "eyJhbGc..."; // JWT token
```

### User Database Fields (users table)
```javascript
{
  id: SERIAL,                    // Primary key (auto-increment)
  name: VARCHAR(255),            // "John Doe"
  email: VARCHAR(255) UNIQUE,    // Must be unique
  password: VARCHAR(255),        // Hashed with bcryptjs
  username: VARCHAR(100) UNIQUE, // Optional profile username
  registration_no: VARCHAR(100) UNIQUE, // Key identifier (BCS-2023-001)
  course: VARCHAR(100),          // "B.Tech CSE"
  section: VARCHAR(50),          // "A", "B", etc.
  role: VARCHAR(20) DEFAULT 'user', // "user", "admin", "superadmin"
  email_verified: BOOLEAN DEFAULT FALSE,
  year_of_passing: INTEGER,      // 2024, 2025, etc.
  created_at: TIMESTAMP DEFAULT NOW()
}
```

---

## 4. PLATFORM DETECTION & TRACKING

### Target Platforms to Monitor
```javascript
const TARGET_PLATFORMS = [
  {
    name: 'leetcode',
    hostnames: ['leetcode.com', 'www.leetcode.com'],
    id: 'LEETCODE'
  },
  {
    name: 'codeforces',
    hostnames: ['codeforces.com', 'www.codeforces.com'],
    id: 'CODEFORCES'
  },
  {
    name: 'geeksforgeeks',
    hostnames: ['geeksforgeeks.org', 'www.geeksforgeeks.org'],
    id: 'GFG'
  },
  {
    name: 'hackerrank',
    hostnames: ['hackerrank.com', 'www.hackerrank.com'],
    id: 'HACKERRANK'
  },
  {
    name: 'codechef',
    hostnames: ['codechef.com', 'www.codechef.com'],
    id: 'CODECHEF'
  }
];
```

### Platform Detection Logic
```javascript
// Utility function to detect platform
function detectPlatform(hostname) {
  if (hostname.includes('leetcode.com')) return 'leetcode';
  if (hostname.includes('codeforces.com')) return 'codeforces';
  if (hostname.includes('geeksforgeeks.org')) return 'geeksforgeeks';
  if (hostname.includes('hackerrank.com')) return 'hackerrank';
  if (hostname.includes('codechef.com')) return 'codechef';
  return null;
}

// In content script:
const platform = detectPlatform(window.location.hostname);
if (platform) {
  // Track time for this platform
}
```

---

## 5. TIME TRACKING DATA STRUCTURE

### Local Storage Schema (in Extension)
```javascript
// Key: "timeTrackingSessions" (localStorage)
// Data structure:
{
  sessionId: UUID,              // Unique session identifier
  registrationNo: string,       // User's registration number (PRIMARY KEY)
  platform: string,             // 'leetcode', 'codeforces', etc.
  date: string,                 // YYYY-MM-DD (local date)
  startTime: ISO8601,          // "2026-04-20T10:30:00Z"
  endTime: ISO8601 | null,     // "2026-04-20T11:45:00Z" or null if active
  durationSeconds: number,     // Total seconds: 4500
  isSynced: boolean,           // true if sent to backend
  syncAttempts: number,        // Number of sync attempts
  createdAt: ISO8601,          // When session was created
  syncedAt: ISO8601 | null     // When successfully synced to backend
}

// Example session:
{
  sessionId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  registrationNo: "BCS-2023-001",
  platform: "leetcode",
  date: "2026-04-20",
  startTime: "2026-04-20T10:30:00Z",
  endTime: "2026-04-20T11:45:00Z",
  durationSeconds: 4500,
  isSynced: true,
  syncAttempts: 1,
  createdAt: "2026-04-20T10:30:00Z",
  syncedAt: "2026-04-20T12:00:00Z"
}
```

### Background Script State
```javascript
// In-memory tracking (chrome.storage.local for persistence)
{
  currentSession: {
    platform: null,        // Currently tracking platform
    startTime: null,       // When current session started
    tabId: null           // Which tab is active
  },
  totalTimeToday: {        // Object: { platform: seconds }
    'leetcode': 3600,
    'codeforces': 1800
  },
  isExtensionEnabled: true, // User can disable tracking
  userRegistrationNo: null, // Set during popup login
  syncSchedule: 5 * 60 * 1000 // Sync every 5 minutes
}
```

---

## 6. BACKEND DATABASE SCHEMA (NEW TABLE)

### Create time_tracking Table
```sql
CREATE TABLE IF NOT EXISTS time_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  registration_no VARCHAR(100) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  session_id UUID NOT NULL,
  date DATE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for fast queries
  INDEX idx_user_id (user_id),
  INDEX idx_registration_no (registration_no),
  INDEX idx_date (date),
  INDEX idx_platform (platform),
  UNIQUE(session_id)
);

-- Create aggregated stats table for faster queries
CREATE TABLE IF NOT EXISTS time_tracking_daily_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  registration_no VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  
  -- Time per platform (in seconds)
  leetcode_seconds INTEGER DEFAULT 0,
  codeforces_seconds INTEGER DEFAULT 0,
  geeksforgeeks_seconds INTEGER DEFAULT 0,
  hackerrank_seconds INTEGER DEFAULT 0,
  codechef_seconds INTEGER DEFAULT 0,
  
  -- Total across all platforms
  total_seconds INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, date),
  INDEX idx_registration_no (registration_no),
  INDEX idx_date (date)
);
```

---

## 7. API ENDPOINTS (TO BE IMPLEMENTED IN BACKEND)

### Authentication Check
```
POST /api/auth/verify-registration
Headers: 
  - Authorization: Bearer {token}
Request Body: {
  registration_no: "BCS-2023-001"
}
Response: {
  success: true,
  user: {
    id: 42,
    email: "user@example.com",
    registration_no: "BCS-2023-001",
    name: "John Doe"
  }
}
```

### Sync Time Tracking Data
```
POST /api/time-tracking/sync
Headers:
  - Authorization: Bearer {token}
  - Content-Type: application/json
Request Body: {
  registrationNo: "BCS-2023-001",
  sessions: [
    {
      sessionId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      platform: "leetcode",
      date: "2026-04-20",
      startTime: "2026-04-20T10:30:00Z",
      endTime: "2026-04-20T11:45:00Z",
      durationSeconds: 4500
    }
  ]
}
Response: {
  success: true,
  synced: 5,
  message: "5 sessions synced successfully"
}
```

### Get Daily Stats
```
GET /api/time-tracking/daily?date=2026-04-20
Headers:
  - Authorization: Bearer {token}
Response: {
  date: "2026-04-20",
  registrationNo: "BCS-2023-001",
  totalSeconds: 14400, // 4 hours
  byPlatform: {
    leetcode: 7200,    // 2 hours
    codeforces: 3600,  // 1 hour
    geeksforgeeks: 3600
  }
}
```

### Get Weekly Stats
```
GET /api/time-tracking/weekly?startDate=2026-04-14&endDate=2026-04-20
Headers:
  - Authorization: Bearer {token}
Response: {
  weekStartDate: "2026-04-14",
  weekEndDate: "2026-04-20",
  registrationNo: "BCS-2023-001",
  totalSeconds: 100800, // Total for week
  dailyBreakdown: [
    {
      date: "2026-04-14",
      totalSeconds: 14400,
      byPlatform: { leetcode: 7200, ... }
    }
  ],
  byPlatform: {
    leetcode: 50400,
    codeforces: 25200,
    geeksforgeeks: 25200
  }
}
```

### Get Monthly Stats
```
GET /api/time-tracking/monthly?month=2026-04
Headers:
  - Authorization: Bearer {token}
Response: {
  month: "2026-04",
  registrationNo: "BCS-2023-001",
  totalSeconds: 432000, // Total for month (120 hours)
  weeklyBreakdown: [
    {
      week: 1,
      weekStart: "2026-04-01",
      totalSeconds: 100800,
      byPlatform: { ... }
    }
  ],
  byPlatform: {
    leetcode: 216000, // 60 hours
    codeforces: 108000,
    geeksforgeeks: 108000
  }
}
```

### Get Platform Breakdown (Pie Chart Data)
```
GET /api/time-tracking/platform-breakdown?startDate=2026-04-14&endDate=2026-04-20
Headers:
  - Authorization: Bearer {token}
Response: {
  totalSeconds: 100800,
  platforms: [
    {
      name: "leetcode",
      seconds: 50400,
      percentage: 50
    },
    {
      name: "codeforces",
      seconds: 25200,
      percentage: 25
    }
  ]
}
```

---

## 8. CHROME EXTENSION STRUCTURE

### File Architecture
```
chrome-extension/
├── manifest.json           # Extension configuration
├── public/
│   ├── icon-16.png        # 16x16 icon
│   ├── icon-48.png        # 48x48 icon
│   ├── icon-128.png       # 128x128 icon
│   └── popup.html         # Popup UI template
├── src/
│   ├── background.js      # Service Worker (time tracking, sync)
│   ├── content.js         # Content script (platform detection)
│   ├── popup.js           # Popup script (login, stats display)
│   ├── styles/
│   │   ├── popup.css      # Popup styling
│   │   └── global.css
│   └── utils/
│       ├── platform.js    # Platform detection helpers
│       ├── storage.js     # Chrome storage helpers
│       ├── api.js         # API communication
│       └── time.js        # Time calculation utilities
├── package.json
└── webpack.config.js      # Build configuration
```

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Code Time Tracker",
  "version": "1.0.0",
  "description": "Track your time spent on coding platforms",
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "*://leetcode.com/*",
    "*://www.leetcode.com/*",
    "*://codeforces.com/*",
    "*://www.codeforces.com/*",
    "*://geeksforgeeks.org/*",
    "*://www.geeksforgeeks.org/*",
    "*://hackerrank.com/*",
    "*://www.hackerrank.com/*",
    "*://codechef.com/*",
    "*://www.codechef.com/*"
  ],
  "action": {
    "default_popup": "public/popup.html",
    "default_icon": {
      "16": "public/icon-16.png",
      "48": "public/icon-48.png",
      "128": "public/icon-128.png"
    }
  },
  "background": {
    "service_worker": "src/background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://leetcode.com/*",
        "*://www.leetcode.com/*",
        "*://codeforces.com/*",
        "*://www.codeforces.com/*",
        "*://geeksforgeeks.org/*",
        "*://www.geeksforgeeks.org/*",
        "*://hackerrank.com/*",
        "*://www.hackerrank.com/*",
        "*://codechef.com/*",
        "*://www.codechef.com/*"
      ],
      "js": ["src/content.js"]
    }
  ]
}
```

---

## 9. EXTENSION IMPLEMENTATION DETAILS

### Popup.html (Initial Login)
```html
<html>
<head>
  <link rel="stylesheet" href="../styles/popup.css">
</head>
<body>
  <div id="app">
    <!-- Login Screen (if not authenticated) -->
    <div id="loginScreen" style="display:none;">
      <h2>Code Time Tracker</h2>
      <input type="text" id="registrationNo" placeholder="Enter Registration No." />
      <button id="loginBtn">Login</button>
      <p id="loginError" style="color:red;display:none;"></p>
    </div>

    <!-- Dashboard Screen (if authenticated) -->
    <div id="dashboardScreen" style="display:none;">
      <h2>Today's Time</h2>
      <div id="todayStats"></div>
      
      <h3>Platform Usage</h3>
      <div id="platformStats"></div>
      
      <button id="logoutBtn">Logout</button>
    </div>

    <!-- Loading Screen -->
    <div id="loadingScreen" style="display:none;">
      <p>Loading...</p>
    </div>
  </div>
  <script src="../src/popup.js"></script>
</body>
</html>
```

### Key Extension Variables & Constants
```javascript
// API Configuration
const API_BASE_URL = 'http://localhost:5000/api'; // Configurable
const API_ENDPOINTS = {
  VERIFY_REGISTRATION: '/auth/verify-registration',
  SYNC_TIME_TRACKING: '/time-tracking/sync',
  GET_DAILY_STATS: '/time-tracking/daily',
  GET_WEEKLY_STATS: '/time-tracking/weekly',
  GET_MONTHLY_STATS: '/time-tracking/monthly'
};

// Storage Keys
const STORAGE_KEYS = {
  USER_TOKEN: 'userToken',
  REGISTRATION_NO: 'registrationNo',
  USER_ID: 'userId',
  USER_EMAIL: 'userEmail',
  TIME_SESSIONS: 'timeTrackingSessions',
  EXTENSION_ENABLED: 'extensionEnabled',
  LAST_SYNC: 'lastSyncTime',
  SYNC_ERROR_LOG: 'syncErrorLog'
};

// Time Constants
const TIME_CONSTANTS = {
  SYNC_INTERVAL: 5 * 60 * 1000,        // 5 minutes
  INACTIVITY_TIMEOUT: 5 * 60 * 1000,   // 5 minutes
  MIN_SESSION_DURATION: 30 * 1000,     // 30 seconds (ignore < 30s sessions)
  SESSION_GRACE_PERIOD: 10 * 1000      // 10 seconds before ending session
};

// Platform Constants
const PLATFORMS = {
  LEETCODE: 'leetcode',
  CODEFORCES: 'codeforces',
  GFG: 'geeksforgeeks',
  HACKERRANK: 'hackerrank',
  CODECHEF: 'codechef'
};
```

---

## 10. FRONTEND DASHBOARD PAGES (TO BE ADDED)

### New Route Structure
```
/dashboard/time-tracking/
├── page.tsx              # Main time tracking dashboard
├── layout.tsx            # Layout component
└── components/
    ├── DailyStats.tsx    # Today's hours by platform
    ├── WeeklyChart.tsx   # Line chart (Mon-Sun)
    ├── MonthlyChart.tsx  # Bar chart by week
    ├── PlatformPie.tsx   # Pie chart breakdown
    └── TimeStatsCard.tsx # Individual stat cards
```

### User Dashboard Component Example
```typescript
// Expected data structure from backend
interface TimeStats {
  date: string;           // "2026-04-20"
  totalSeconds: number;   // 14400
  byPlatform: {
    leetcode: number;
    codeforces: number;
    geeksforgeeks: number;
    hackerrank: number;
    codechef: number;
  };
}

interface WeeklyStats {
  weekStartDate: string;
  totalSeconds: number;
  dailyBreakdown: TimeStats[];
  byPlatform: Record<string, number>;
}
```

---

## 11. ADMIN DASHBOARD (NEW ROUTES)

### Admin Routes
```
/admin/time-tracking/
├── page.tsx              # Overview & filters
├── layout.tsx
└── components/
    ├── UserTimeLeaderboard.tsx   # Top users by hours
    ├── PlatformHeatmap.tsx       # Which platforms most used
    ├── TimeRangeFilter.tsx       # Date range selector
    └── UserDetailedStats.tsx     # Click user to see breakdown
```

### Admin Query Filters
```javascript
// Possible filters:
{
  registrationNo: "BCS-2023-001",  // Filter by user
  platform: "leetcode",             // Filter by platform
  startDate: "2026-04-01",          // Filter by date range
  endDate: "2026-04-30",
  minHours: 10,                     // Minimum hours threshold
  sortBy: "totalSeconds" | "username"
}
```

---

## 12. ERROR HANDLING & EDGE CASES

### Extension Error Scenarios
```javascript
// Scenario 1: User closes/minimizes tab
// Solution: Grace period before ending session (10 seconds)
// Check if user returns within grace period

// Scenario 2: Browser crashes/closed
// Solution: Store sessions in localStorage; sync on restart

// Scenario 3: Multiple tabs of same platform open
// Solution: Track by tab ID; merge sessions of same platform on same day

// Scenario 4: Network offline while coding
// Solution: Queue sessions locally; sync when network returns

// Scenario 5: Duplicate submissions (sync called twice)
// Solution: Use unique sessionId as idempotency key

// Scenario 6: User logs in from multiple devices
// Solution: Store registration_no; allow sync from any device

// Scenario 7: Time synchronization between client & server
// Solution: Always use UTC timestamps (ISO8601)
```

### Validation Rules
```javascript
// Session must have:
- sessionId (UUID format)
- registrationNo (matches user's registration_no from token)
- platform (one of the 5 platforms)
- date (YYYY-MM-DD format)
- startTime (ISO8601)
- endTime (ISO8601, must be > startTime)
- durationSeconds > 30 (ignore very short sessions)

// Duplicate detection:
- Check unique(sessionId) on backend
- Reject if sessionId already exists
```

---

## 13. SECURITY CONSIDERATIONS

### Extension Security
```javascript
// 1. Never store password; use JWT token only
// 2. Clear token on logout
// 3. Use https only for API calls (in production)
// 4. Validate registration_no matches JWT claim
// 5. Include CSRF-like protection (token in every request)
// 6. Don't log sensitive data to console in production
// 7. Validate all API responses before storing

// CORS Configuration (Backend)
// Allow extension origin:
// chrome-extension://{EXTENSION_ID}/*
// + FRONTEND_URL
// + localhost:3000 (dev)
```

### Data Privacy
```javascript
// What IS tracked:
- Platform names
- Time spent (duration)
- Dates and times
- Registration number (encrypted association)

// What IS NOT tracked:
- Keystrokes
- Problem content
- Code written
- Personal browsing history
// (only these 5 platforms)
```

---

## 14. DEPLOYMENT CHECKLIST

### Before Publishing Extension
- [ ] Update manifest.json with correct version
- [ ] Change API_BASE_URL to production backend
- [ ] Remove all console.logs for production
- [ ] Test with multiple users
- [ ] Verify all 5 platforms detected correctly
- [ ] Test offline -> online sync
- [ ] Test token expiration handling
- [ ] Create privacy policy
- [ ] Add extension icon (128x128)
- [ ] Write clear description
- [ ] Test on Chrome, Edge, Brave browsers

### Before Frontend Deployment
- [ ] Add new routes: /dashboard/time-tracking
- [ ] Add admin routes: /admin/time-tracking
- [ ] Implement all chart components
- [ ] Add API endpoints in backend
- [ ] Create time_tracking_daily_stats aggregation job
- [ ] Test with sample data
- [ ] Verify CORS headers include extension origin
- [ ] Load test new API endpoints

### Before Backend Deployment
- [ ] Run migration for time_tracking table
- [ ] Run migration for time_tracking_daily_stats table
- [ ] Implement all 5 new API endpoints
- [ ] Add rate limiting to time-tracking endpoints
- [ ] Add cron job to aggregate daily stats
- [ ] Test with production data volume
- [ ] Set up database backups
- [ ] Monitor for sync errors

---

## 15. KEYWORDS & TERMINOLOGY REFERENCE

| Term | Definition | Example |
|------|-----------|---------|
| **Registration No** | Primary user identifier | BCS-2023-001 |
| **Session** | Continuous time on one platform | Started 10:30, ended 11:45 |
| **Platform** | Coding website being tracked | leetcode, codeforces, etc. |
| **Duration** | Time in seconds for one session | 4500 seconds (75 minutes) |
| **Daily Stats** | Time breakdown for one day | 4 hours total, 2h LeetCode |
| **Weekly Stats** | Time breakdown for 7 days | 28 hours total week |
| **Monthly Stats** | Time breakdown for 30 days | 120 hours total month |
| **Sync** | Send local data to backend | Upload sessions to server |
| **Grace Period** | Allow re-activation within X seconds | 10 seconds after tab closes |
| **Idempotency Key** | Unique ID to prevent duplicates | sessionId (UUID format) |
| **Heatmap** | Visual calendar of activity | Green squares for active days |
| **Pie Chart** | Platform breakdown by percentage | 50% LeetCode, 25% CodeForces |

---

## 16. EXAMPLE WORKFLOW

### User Journey
```
1. Student installs extension from Chrome Web Store
2. Opens popup → sees login screen
3. Enters registration number (BCS-2023-001)
4. Extension verifies with backend: POST /auth/verify-registration
5. Backend checks if registration_no exists
6. Returns JWT token
7. Extension stores token in localStorage
8. Popup shows "Logged in" message

9. Student opens LeetCode tab
10. Content script detects: leetcode.com
11. Background script starts timer
12. User codes for 1 hour 15 minutes
13. User switches to different tab
14. Background script stops timer (+ grace period)
15. Creates session: { sessionId, platform: 'leetcode', durationSeconds: 4500, ... }
16. Stores in localStorage under 'timeTrackingSessions'

17. Every 5 minutes, background script syncs:
18. Checks for unsynced sessions
19. Sends POST /time-tracking/sync with array of sessions
20. Backend validates & stores in time_tracking table
21. Returns success with count of synced sessions

22. Student opens Dashboard in webapp
23. Sees: "Today: 4h 15m on coding platforms"
24. Breakdown: "2h 15m LeetCode, 1h CodeForces, 45m GeeksforGeeks"
25. Sees weekly chart: Mon-Sun line graph showing daily totals
26. Sees monthly chart: 4 bars (each week of month)
27. Sees pie chart: visual breakdown of platform usage %
```

---

## 17. TESTING CHECKLIST

### Extension Testing
- [ ] Login with valid registration number
- [ ] Login with invalid registration number
- [ ] Platform detection works for all 5 sites
- [ ] Timer starts when page loads
- [ ] Timer stops when tab is closed
- [ ] Timer pauses when browser minimized
- [ ] Sync works while online
- [ ] Data queues while offline, syncs when online
- [ ] Duplicate sessions are not created
- [ ] Very short sessions (< 30s) are ignored
- [ ] Token expiration is handled gracefully
- [ ] Extension works in incognito mode

### Backend Testing
- [ ] POST /time-tracking/sync rejects invalid sessions
- [ ] GET /time-tracking/daily returns correct aggregation
- [ ] GET /time-tracking/weekly calculates 7-day period correctly
- [ ] GET /time-tracking/monthly calculates full month correctly
- [ ] Platform breakdown adds to 100%
- [ ] Sessions from different tabs don't duplicate
- [ ] Concurrent sync requests are handled safely
- [ ] Rate limiting prevents abuse
- [ ] Database queries are optimized with indexes

### Frontend Testing
- [ ] Dashboard loads time tracking data
- [ ] Weekly chart displays 7 data points
- [ ] Monthly chart displays 4-5 bars
- [ ] Pie chart shows all platforms with percentages
- [ ] Admin can filter by registration number
- [ ] Admin can filter by date range
- [ ] Admin can filter by platform
- [ ] Leaderboard ranks users by total hours
- [ ] Charts update in real-time after sync

---

## 18. VARIABLES QUICK REFERENCE

### From JWT Token (decoded from localStorage token)
```javascript
jwt.id              // User's numeric ID
jwt.email           // User's email
jwt.registration_no // User's registration number (PRIMARY)
jwt.role            // "user" or "admin"
```

### From API Responses
```javascript
session.sessionId    // UUID
session.platform     // "leetcode" | "codeforces" | "geeksforgeeks" | "hackerrank" | "codechef"
session.date         // "2026-04-20"
session.startTime    // "2026-04-20T10:30:00Z"
session.endTime      // "2026-04-20T11:45:00Z"
session.durationSeconds // 4500

stats.totalSeconds   // Total seconds tracked
stats.byPlatform     // Object with platform keys
stats.date           // "2026-04-20"
```

### Extension Storage Keys
```javascript
localStorage.getItem('userToken')       // JWT
localStorage.getItem('registrationNo')  // User reg no
localStorage.getItem('timeTrackingSessions') // Array of session objects
chrome.storage.local.get('extensionEnabled') // Boolean
```

---

## 19. NEXT STEPS FOR IMPLEMENTATION

### Phase 1: Backend (Week 1)
1. [ ] Create time_tracking table
2. [ ] Create time_tracking_daily_stats table
3. [ ] Create migration files
4. [ ] Implement POST /api/time-tracking/sync
5. [ ] Implement GET /api/time-tracking/daily
6. [ ] Implement GET /api/time-tracking/weekly
7. [ ] Implement GET /api/time-tracking/monthly
8. [ ] Test all endpoints with Postman
9. [ ] Add cron job to aggregate daily stats

### Phase 2: Extension (Week 1-2)
1. [ ] Set up project structure with webpack
2. [ ] Implement content.js (platform detection)
3. [ ] Implement background.js (time tracking & sync)
4. [ ] Create popup.html UI
5. [ ] Implement popup.js (login logic)
6. [ ] Implement storage utilities
7. [ ] Implement API communication
8. [ ] Test locally
9. [ ] Test on actual platform websites
10. [ ] Publish to Chrome Web Store

### Phase 3: Frontend (Week 2)
1. [ ] Create /dashboard/time-tracking route
2. [ ] Implement DailyStats component
3. [ ] Implement WeeklyChart component
4. [ ] Implement MonthlyChart component
5. [ ] Implement PlatformPie component
6. [ ] Create /admin/time-tracking routes
7. [ ] Implement admin filters
8. [ ] Implement leaderboard
9. [ ] Test integration with backend API
10. [ ] Deploy to Vercel

---

## 20. IMPORTANT NOTES

- **Registration Number is the PRIMARY identifier** - use this to match extension users with dashboard users
- **Always use UTC timestamps** - store as ISO8601, convert to local time on frontend
- **JWT tokens expire** - handle 401 errors gracefully, prompt re-login
- **Time tracking must be battery-efficient** - use efficient interval checks
- **Privacy first** - only track platform name and time, nothing else
- **Offline-first design** - extension must work offline and sync when online
- **Validate all inputs** - never trust extension data directly, validate on backend
- **Test extensively** - time tracking is sensitive; test edge cases thoroughly
