# CodeQuest Mobile App - Master Development Prompt

## 📱 Project Overview

Develop a **cross-platform mobile application** for CodeQuest that replicates and enhances the web version's functionality. The mobile app connects to the **same backend API and PostgreSQL database** as the web application, ensuring real-time data synchronization across all platforms. The app aggregates competitive programming statistics from multiple platforms (LeetCode, CodeForces, GeeksforGeeks, HackerRank, CodeChef) and displays them in a unified dashboard with leaderboard features.

### 🔗 Database Architecture

```
┌─────────────────────────────────────────────────┐
│         PostgreSQL Database (Shared)             │
│  users | coding_profiles | stats | contest_history │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼─────┐ ┌──▼──────┐ ┌─▼──────────┐
│ Backend API │ │ Web App  │ │ Mobile App │
│  (Node.js)  │ │(Next.js) │ │(React Nat) │
└─────────────┘ └──────────┘ └────────────┘

All three applications share the SAME database
```

**Key Point:** The mobile app does NOT have its own database. It communicates with the existing backend API and reads/writes to the same PostgreSQL database used by the web app.

---

## 🎯 Technology Stack

**Framework:** React Native with Expo  
**Language:** TypeScript  
**State Management:** Redux Toolkit + RTK Query (for api calls)  
**Navigation:** React Navigation (bottom tabs + stack navigators)  
**UI Components:** React Native Paper or NativeBase  
**Styling:** Tailwind RN or StyleSheet  
**Local Storage:** AsyncStorage + SQLite  
**Authentication:** JWT (from existing backend)  
**Date/Charts:** Victory Charts or Recharts Native  
**Analytics:** Firebase Analytics  

---

## 📂 Project Structure

```
codequest-mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── verify-email.tsx
│   │   └── forgot-password.tsx
│   ├── (main)/
│   │   ├── dashboard.tsx
│   │   ├── leaderboard.tsx
│   │   ├── profile/
│   │   │   └── [username].tsx
│   │   ├── profiles.tsx
│   │   └── settings.tsx
│   ├── admin/
│   │   ├── dashboard.tsx
│   │   ├── users.tsx
│   │   └── analytics.tsx
│   └── _layout.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── OTPVerification.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── ActivityHeatmap.tsx
│   │   ├── PlatformCard.tsx
│   │   ├── ContestRankings.tsx
│   │   └── AwardsSection.tsx
│   ├── leaderboard/
│   │   ├── LeaderboardList.tsx
│   │   ├── FilterBar.tsx
│   │   └── UserRankCard.tsx
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── BottomNavigation.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── Toast.tsx
│   └── admin/
│       ├── UserSearchBar.tsx
│       ├── UserTable.tsx
│       └── StatsOverview.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useDashboard.ts
│   ├── useLeaderboard.ts
│   ├── useLocalStorage.ts
│   └── usePlatformSync.ts
├── services/
│   ├── api.ts
│   ├── authService.ts
│   ├── profileService.ts
│   ├── statsService.ts
│   ├── leaderboardService.ts
│   └── storageService.ts
├── store/
│   ├── authSlice.ts
│   ├── dashboardSlice.ts
│   ├── leaderboardSlice.ts
│   └── store.ts
├── utils/
│   ├── constants.ts
│   ├── formatters.ts
│   ├── validators.ts
│   ├── colors.ts
│   └── helpers.ts
├── types/
│   ├── auth.ts
│   ├── user.ts
│   ├── stats.ts
│   ├── profile.ts
│   └── leaderboard.ts
├── config/
│   ├── api.ts
│   ├── storage.ts
│   └── env.ts
├── app.json
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🔐 Authentication Flow

1. **Login/Signup Screen**
   - Email/Registration Number + Password
   - OTP verification (via email)
   - JWT token stored in AsyncStorage
   - Biometric auth option (optional enhancement)

2. **Token Management**
   - Store JWT in secure AsyncStorage
   - Auto-logout on token expiration
   - Refresh token mechanism
   - Axios interceptor for adding token to requests

3. **Protected Routes**
   - Auth middleware for private screens
   - Redirect to login if unauthorized

---

## 📊 Core Features to Implement

### **1. Authentication**
- [ ] Login with email/registration number
- [ ] OTP-based signup verification
- [ ] Password reset functionality
- [ ] Persistent login (AsyncStorage)
- [ ] Logout functionality

### **2. Dashboard**
- [ ] Display user profile info (name, course, section)
- [ ] Show aggregated stats from all platforms
- [ ] Activity heatmap (365-day visualization)
- [ ] Platform-specific cards (LeetCode, CodeForces, etc.)
- [ ] Personal streak counter (max & current)
- [ ] Total problems solved
- [ ] Contest rankings
- [ ] DSA topic analysis
- [ ] Refresh/sync stats button

### **3. Profiles Management**
- [ ] Link coding profiles (LeetCode, CodeForces, etc.)
- [ ] Show verification code
- [ ] Display verification status
- [ ] Unlink profiles

### **4. Leaderboard**
- [ ] Display global rankings
- [ ] Filter by course
- [ ] Filter by section
- [ ] Search by name/registration number
- [ ] Sort by score, problems, etc.
- [ ] Pagination/infinite scroll
- [ ] Tap to view user profile

### **5. User Profile (Public)**
- [ ] View other user's stats
- [ ] See their platforms and scores
- [ ] View their activity heatmap
- [ ] Share profile link

### **6. Contest Tracking**
- [ ] Display recent contests
- [ ] Show contest ratings and rankings
- [ ] Historical contest data
- [ ] Performance trends

### **7. Awards & Badges**
- [ ] Display earned badges
- [ ] Show platform-specific achievements
- [ ] Achievement animations

### **8. Admin Dashboard** (Admin users only)
- [ ] Overview statistics
- [ ] User management
- [ ] Search/filter users
- [ ] View user details
- [ ] Platform usage analytics
- [ ] Course/section distribution

### **9. Settings**
- [ ] Profile settings
- [ ] Notification preferences
- [ ] Push notification toggle
- [ ] Biometric authentication
- [ ] Logout
- [ ] About / Help

### **10. Offline Support**
- [ ] Cache dashboard data locally
- [ ] Cache leaderboard data
- [ ] Show cached data when offline
- [ ] Sync when connection restored

---

## 🔌 API Integration

The mobile app connects to the **same backend API** used by the web app. All data reads/writes go through the existing Node.js Express backend, which manages the PostgreSQL database:

```typescript
// Base API configuration (Same as web app)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-render-backend.com/api';
// Example: https://coding-profile-backend.onrender.com/api

// Endpoints to integrate:
POST   /auth/signup               // User registration
POST   /auth/login                // User login
POST   /auth/verify-otp           // OTP verification
POST   /auth/resend-otp           // Resend OTP email
POST   /auth/forgot-password       // Password reset request
POST   /auth/reset-password        // Reset password with token

GET    /dashboard                  // User dashboard data (authenticated)
POST   /dashboard/refresh-stats     // Manual stats refresh

GET    /profiles                    // List user's linked profiles
POST   /profiles/link              // Link new platform profile
POST   /profiles/verify            // Verify profile ownership
DELETE /profiles/:platform         // Unlink platform

GET    /leaderboard                // Global leaderboard with filters
GET    /profile/:username          // View specific user profile

GET    /admin/stats                // Admin statistics
GET    /admin/users                // Admin user list with search/filter
GET    /admin/users/:id            // Admin view user details
POST   /admin/users/:id/role       // Change user role
```

---

## 🎨 UI/UX Guidelines

### **Design System**
- **Colors:** Match web version (indigo, blue, yellow accents)
- **Typography:** Consistent font sizes and weights
- **Spacing:** 8px base unit grid
- **Border Radius:** 12px for cards, 8px for buttons
- **Shadows:** Subtle elevation on cards

### **Mobile-First Design**
- Touch targets: 44x44px minimum
- Bottom tabs for main navigation
- Modals for secondary flows
- Swipe-to-refresh for data updates
- Pull-to-refresh patterns

### **Responsive Layouts**
- Adapt for phones (360px - 480px wide)
- Tablet support (600px+ wide)
- Portrait & landscape orientations

---

## 🛠️ Development Roadmap

### **Phase 1: Project Setup** (Week 1)
- [ ] Initialize Expo project with TypeScript
- [ ] Set up folder structure
- [ ] Configure Redux store (with cache tracking)
- [ ] Set up API client with Axios (to connect to existing backend)
- [ ] Configure environment variables with backend URL
- [ ] Set up ESLint & Prettier
- [ ] Verify connection to existing backend API
- [ ] Test database connectivity through backend

### **Phase 2: Authentication** (Week 2)
- [ ] Login screen UI
- [ ] Signup screen UI
- [ ] OTP verification screen
- [ ] Implement auth logic (use existing backend endpoints)
- [ ] Token storage & refresh (JWT from PostgreSQL)
- [ ] Auth middleware
- [ ] Test login syncs with existing users in database

### **Phase 3: Dashboard & Stats** (Week 3-4)
- [ ] Dashboard layout
- [ ] API integration for user data (from PostgreSQL via backend)
- [ ] Platform stats cards (render PostgreSQL stats table data)
- [ ] Activity heatmap (from daily_submissions table)
- [ ] Contest rankings (from contest_history table)
- [ ] Stats refresh functionality (pull latest from shared database)
- [ ] Sync verification (ensure mobile data matches database)

### **Phase 4: Leaderboard** (Week 4-5)
- [ ] Leaderboard list UI
- [ ] Filter/search functionality
- [ ] Pagination/infinite scroll
- [ ] User profile view
- [ ] Sorting options

### **Phase 5: Profile Management** (Week 5)
- [ ] Link platform profiles
- [ ] Show verification codes
- [ ] Unlink profiles
- [ ] Verification status display

### **Phase 6: Admin Features** (Week 6)
- [ ] Admin authentication check
- [ ] Admin dashboard UI
- [ ] User search/filter
- [ ] Admin stats view

### **Phase 7: Polish & Testing** (Week 7)
- [ ] Error handling
- [ ] Loading states
- [ ] Offline support
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance optimization

### **Phase 8: Deployment** (Week 8)
- [ ] Build Android APK
- [ ] Build iOS IPA
- [ ] Firebase setup
- [ ] App signing
- [ ] Submit to stores

---

## 🔄 State Management Strategy

```typescript
// Redux Store Structure (Local State + Shared DB)
{
  auth: {
    token: string | null,        // JWT from PostgreSQL users table
    user: User | null,            // From PostgreSQL users table
    loading: boolean,
    error: string | null,
    isAuthenticated: boolean,
    lastSyncTime: timestamp       // When user data was last synced from DB
  },
  dashboard: {
    user: User,                   // From PostgreSQL users
    profiles: CodingProfile[],    // From PostgreSQL coding_profiles
    stats: Record<string, Stats>, // From PostgreSQL stats table
    heatmapData: HeatmapEntry[],  // From PostgreSQL daily_submissions
    streaks: { max: number, current: number },
    loading: boolean,
    lastUpdated: timestamp,       // When data was last synced from backend
    isSynced: boolean             // Is local cache in sync with database?
  },
  leaderboard: {
    users: LeaderboardUser[],     // From PostgreSQL (calculated scores)
    filter: { course: string, section: string },
    sort: string,
    pagination: { page: number, limit: number },
    total: number,
    loading: boolean,
    lastSyncTime: timestamp
  },
  app: {
    theme: 'light' | 'dark',
    offline: boolean,             // Network connectivity status
    networkConnected: boolean,
    pendingSyncQueue: any[]       // Queue of actions waiting to sync to DB
  }
}
```

**Important:** All state data ultimately comes from PostgreSQL. Local Redux state is a cache that gets refreshed from the API.

---

## 📡 Offline & Sync Strategy

The mobile app uses **local caching** to provide offline functionality while syncing with the shared PostgreSQL database:

### 1. **Local Cache (AsyncStorage + SQLite)**
   - Cache API responses when online
   - Store user auth token (JWT)
   - Save user preferences locally
   - Store leaderboard snapshots
   - Cache stats history for offline viewing
   - Offline profile viewing

### 2. **Sync with Shared Database**
   - Check network connectivity on app launch
   - Fetch fresh data from backend when online
   - Compare local cache timestamp with backend
   - Show "last updated" timestamp
   - Queue sync requests when offline
   - Auto-sync when connection restored
   - **Data is always authoritative in PostgreSQL** - mobile cache is secondary

### 3. **Real-Time Sync Across Platforms**
   ```
   User actions on Mobile App
          ↓
   API Request to Backend
        ↓
   PostgreSQL DB Updated
        ↓
   Web App sees changes (through API)
   ```
   - When you update profile on mobile → web app sees it
   - When you update stats on web → mobile sees it (after refresh)
   - Leaderboard always reflects latest data from shared database

---

## 🧪 Testing Strategy

```typescript
// Unit Tests
- Auth logic (login, validation)
- Stats calculations
- Filter/sort leaderboard
- Data formatting utilities

// Integration Tests
- API calls with mock backend
- Auth flow end-to-end
- Dashboard data fetching
- Filter + pagination

// E2E Tests (with Detox)
- Sign up flow
- Login flow
- Link platform
- View dashboard
- View leaderboard
```

---

## 📦 Key Dependencies

```json
{
  "dependencies": {
    "expo": "^52.0.0",
    "react-native": "0.76.0",
    "react": "^19.0.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/stack": "^7.0.0",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "axios": "^1.6.0",
    "@react-native-async-storage/async-storage": "^1.24.0",
    "expo-secure-store": "^14.0.0",
    "react-native-paper": "^5.12.0",
    "react-native-svg": "^15.0.0",
    "recharts": "^2.10.0",
    "expo-linear-gradient": "^13.0.0",
    "date-fns": "^3.0.0",
    "@react-native-community/netinfo": "^11.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-native": "^0.73.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@testing-library/react-native": "^12.0.0",
    "detox": "^20.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 🚀 Getting Started Commands

```bash
# Initialize project
npx create-expo-app@latest codequest-mobile --template
cd codequest-mobile

# Install dependencies
npm install

# Start development
npm start

# Build Android
eas build --platform android

# Build iOS
eas build --platform ios

# Run tests
npm test

# Lint code
npm run lint
```

---

## 🔒 Security Considerations

1. **Secure Token Storage**
   - Use Expo Secure Store (not AsyncStorage for sensitive data)
   - Never log sensitive data

2. **API Security**
   - All API calls via HTTPS
   - Add rate limiting headers
   - Validate JWT on every request

3. **Data Privacy**
   - Cache non-sensitive data only
   - Clear cache on logout
   - Sanitize user inputs

4. **Biometric Auth**
   - Use expo-local-authentication
   - Require main auth on first setup
   - Fallback to password if biometric fails

---

## 📈 Analytics & Monitoring

- **Firebase Analytics:** Track user events
- **Crash Reporting:** Firebase Crashlytics
- **Performance Monitoring:** Firebase Performance
- **Events to track:**
  - App launch
  - Login/signup completion
  - Dashboard views
  - Leaderboard filters
  - Profile links
  - Errors

---

## 🎯 Success Metrics

- ✅ 90%+ app launch success rate
- ✅ <3s dashboard load time
- ✅ <2s leaderboard initial load
- ✅ Offline functionality works
- ✅ Cross-platform parity with web
- ✅ All core features implemented

---

## 📝 Environment Variables (.env)

```
# Backend API (Same as web app backend)
EXPO_PUBLIC_API_URL=https://coding-profile-backend.onrender.com/api

# Or local development
# EXPO_PUBLIC_API_URL=http://localhost:5000/api

EXPO_PUBLIC_APP_NAME=CodeQuest
EXPO_PUBLIC_VERSION=1.0.0
FIREBASE_API_KEY=your_firebase_key
FIREBASE_APP_ID=your_firebase_app_id

# Database info (for reference - backend handles actual connection)
EXPO_PUBLIC_DB_NAME=coding_profile
EXPO_PUBLIC_DB_HOST=database.render.com  # Same PostgreSQL as web app
```

---

## 📚 Documentation References

- [React Native Docs](https://reactnative.dev)
- [Expo Documentation](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [React Native Paper](https://callstack.github.io/react-native-paper)

---

## ✅ Pre-Launch Checklist

- [ ] All screens implemented
- [ ] All API endpoints integrated
- [ ] Offline functionality tested
- [ ] Cross-platform tested (iOS & Android)
- [ ] Performance optimized
- [ ] Security review completed
- [ ] Unit tests written & passing
- [ ] E2E tests written & passing
- [ ] Analytics configured
- [ ] Error tracking configured
- [ ] App signing configured
- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] Deployment pipeline set up

---

## 🎓 Learning Resources

- Set up Expo project and understand project structure
- Learn Redux Toolkit for state management
- Master React Navigation for mobile navigation
- Understand async operations in React Native
- Learn about native platform differences
- Practice responsive design for mobile

---

## 💡 Nice-to-Have Features (Post-Launch)

- [ ] Push notifications for ranking changes
- [ ] Home screen widgets (iOS/Android 12+)
- [ ] Share profile as image
- [ ] Dark mode toggle
- [ ] Language localization
- [ ] Speech-to-text search
- [ ] AR features for achievements
- [ ] Animated transitions
- [ ] Skill assessment quizzes
- [ ] Social features (follow, messaging)

---

## 📞 Support & Maintenance

- Regular dependency updates
- Monthly security patches
- User feedback collection
- Bug tracking & fixes
- Performance monitoring
- Server-side API versioning
