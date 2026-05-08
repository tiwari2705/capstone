# Installation Guide - Coding Profile Aggregator

A full-stack application that aggregates coding profiles from multiple platforms with real-time statistics, leaderboards, and administrative dashboards.

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Database Setup](#database-setup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Node.js**: v16.x or higher
- **npm**: v8.x or higher (comes with Node.js)
- **PostgreSQL**: v12 or higher
- **Redis**: v6.x or higher (for caching)
- **Git**: For cloning the repository
- **RAM**: Minimum 4GB (Puppeteer requires additional memory for web scraping)

### Installation Steps for Prerequisites

#### Windows
```bash
# Install Node.js and npm from https://nodejs.org/
# Download and install PostgreSQL from https://www.postgresql.org/download/windows/
# Download and install Redis from https://github.com/microsoftarchive/redis/releases

# Verify installation
node --version
npm --version
psql --version
```

#### macOS
```bash
# Using Homebrew
brew install node@18
brew install postgresql
brew install redis

# Verify installation
node --version
npm --version
postgres --version
redis-cli --version
```

#### Linux (Ubuntu/Debian)
```bash
# Update package manager
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Verify installation
node --version
npm --version
psql --version
redis-cli --version
```

---

## Project Structure

```
coding-profile-aggregator/
├── backend/                          # Node.js Express server
│   ├── src/
│   │   ├── index.js                 # Main server entry point
│   │   ├── config/
│   │   │   └── db.js               # Database configuration
│   │   ├── routes/                 # API endpoints
│   │   ├── middleware/             # Auth & rate limiting
│   │   ├── services/               # Business logic & scrapers
│   │   ├── jobs/                   # Cron jobs
│   │   └── utils/                  # Helper functions
│   ├── package.json
│   ├── .env                        # Environment variables (create this)
│   └── render-build.sh            # Render deployment script
│
├── frontend/                         # Next.js React application
│   ├── app/                        # Next.js 13+ app directory
│   ├── components/                 # React components
│   ├── lib/                        # Utilities & API calls
│   ├── public/                     # Static assets
│   ├── package.json
│   ├── .env.local                 # Frontend environment variables
│   ├── next.config.ts
│   └── tsconfig.json
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd coding-profile-aggregator/backend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages including:
- **Express**: Web framework
- **Puppeteer**: Web scraping
- **PostgreSQL (pg)**: Database driver
- **Redis**: Caching
- **JWT**: Authentication
- **Nodemailer**: Email service
- **Bcryptjs**: Password hashing

### Step 3: Install Chromium for Puppeteer
```bash
npm run build
```

This command runs:
```bash
npm install && npx puppeteer install
```

Puppeteer needs Chromium to scrape coding platform profiles.

### Step 4: Create `.env` File
Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/coding_profile_aggregator
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=coding_profile_aggregator

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_!
JWT_EXPIRE=7d

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@codingprofileagg.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Scraper Configuration
SCRAPER_TIMEOUT=30000
MAX_CONCURRENT_BROWSERS=3

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 5: Verify Backend Configuration
```bash
# Test if backend starts
npm run dev
```

You should see:
```
Server running on port 5000
Database connected successfully
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory
```bash
cd coding-profile-aggregator/frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- **Next.js 16**: React framework
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Recharts**: Data visualization
- **Axios**: HTTP client

### Step 3: Create `.env.local` File
Create a `.env.local` file in the `frontend/` directory:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api

# Frontend Configuration
NEXT_PUBLIC_APP_NAME=Coding Profile Aggregator
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

### Step 4: Verify Frontend Configuration
```bash
# Test if frontend builds
npm run build

# Then start the development server
npm run dev
```

You should see:
```
> ready - started server on 0.0.0.0:3000
```

---

## Environment Configuration

### Backend Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for JWT signing | Min 32 characters, use strong random string |
| `EMAIL_USER` | SMTP email for sending emails | `your_email@gmail.com` |
| `EMAIL_PASSWORD` | App-specific password (not Gmail password) | Generate in Google Account settings |
| `FRONTEND_URL` | Frontend deployment URL | `http://localhost:3000` |

### Frontend Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API endpoint | `http://localhost:5000/api` |
| `NEXT_PUBLIC_APP_URL` | Frontend application URL | `http://localhost:3000` |

### Getting Gmail App Password for Email Service
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Go to "App passwords"
4. Select "Mail" and "Windows Computer"
5. Copy the generated 16-character password
6. Use this as `EMAIL_PASSWORD` in `.env`

---

## Running the Application

### Option 1: Development Mode (Both Services Separately)

#### Terminal 1 - Backend
```bash
cd coding-profile-aggregator/backend
npm run dev
```

Expected output:
```
[nodemon] restarting due to changes...
Server running on port 5000
Database connected
Redis connected
```

#### Terminal 2 - Frontend
```bash
cd coding-profile-aggregator/frontend
npm run dev
```

Expected output:
```
> ready - started server on 0.0.0.0:3000
```

#### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Admin Dashboard**: http://localhost:3000/admin

---

### Option 2: Production Build

#### Build Backend (if needed - Node.js doesn't require building)
```bash
cd backend
npm install --production
```

#### Build Frontend
```bash
cd frontend
npm run build
npm start
```

This creates optimized production bundles.

---

## Database Setup

### Step 1: Start PostgreSQL

**Windows** (if installed as service):
```bash
# Should start automatically, or restart via Services
net start postgresql-x64-15
```

**macOS**:
```bash
brew services start postgresql
```

**Linux**:
```bash
sudo systemctl start postgresql
```

### Step 2: Create Database and User

#### Connect to PostgreSQL
```bash
psql -U postgres
```

#### Run SQL Commands
```sql
-- Create database
CREATE DATABASE coding_profile_aggregator;

-- Create user
CREATE USER coding_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE coding_profile_aggregator TO coding_user;

-- Connect to the database
\c coding_profile_aggregator

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO coding_user;

-- Exit
\q
```

### Step 3: Verify Connection

From backend directory:
```bash
# Test connection with your DATABASE_URL
npm run dev
```

The app should show:
```
Database connected successfully
```

### Step 4: Database Migrations (if applicable)

Check if there are migration files:
```bash
ls backend/src/migrations/
```

If migrations exist, run them (command depends on your migration tool):
```bash
# Example - adjust based on your migration setup
npm run migrate
```

---

## Starting Redis (Optional but Recommended)

Redis improves performance by caching profile data.

### Start Redis

**Windows** (using WSL or native):
```bash
redis-server
```

**macOS**:
```bash
brew services start redis
```

**Linux**:
```bash
sudo systemctl start redis-server
```

### Verify Redis is Running
```bash
redis-cli ping
```

Should return: `PONG`

---

## Troubleshooting

### ❌ "Module not found: Can't find 'dotenv'"
**Solution**: Run `npm install` in the respective directory (backend or frontend)

### ❌ "Port 5000 is already in use"
**Solution** (Windows):
```bash
npm run kill-port  # Backend specific script
# Or manually:
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

**Solution** (macOS/Linux):
```bash
lsof -ti:5000 | xargs kill -9
```

### ❌ "Error: connect ECONNREFUSED 127.0.0.1:5432"
**Problem**: PostgreSQL is not running
**Solution**:
```bash
# Start PostgreSQL
# Windows: net start postgresql-x64-15
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### ❌ "Error: Redis connection failed"
**Problem**: Redis is not running or not configured
**Solution**:
```bash
# Start Redis or set REDIS_URL in .env
redis-server
# Or comment out Redis-dependent code if not needed
```

### ❌ "Puppeteer: Browser download failed"
**Problem**: Chromium installation failed
**Solution**:
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install
npm run build
```

### ❌ "401 Unauthorized" on API calls
**Problem**: JWT token is missing or invalid
**Solution**:
1. Make sure you're logged in
2. Check `localStorage.getItem('token')` in browser console
3. Verify `JWT_SECRET` in backend `.env` matches

### ❌ "CORS error: Access-Control-Allow-Origin"
**Problem**: Frontend and backend URLs don't match
**Solution**: Update `FRONTEND_URL` in backend `.env` to match your frontend URL

### ❌ "npm install takes too long or fails"
**Solution**:
```bash
# Clear cache and try again
npm cache clean --force
npm install --verbose
```

---

## Quick Start Checklist

- [ ] Node.js and npm installed
- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Backend `.env` file created
- [ ] Frontend `.env.local` file created
- [ ] Database and user created
- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Puppeteer Chromium installed (`npm run build` in backend)
- [ ] Backend starts successfully (`npm run dev`)
- [ ] Frontend starts successfully (`npm run dev`)
- [ ] Access http://localhost:3000 in browser

---

## Next Steps After Installation

1. **Create Admin Account**: Register and promote your user to admin
2. **Connect Coding Profiles**: Link CodeChef, HackerRank, GeeksforGeeks accounts
3. **Configure Cron Jobs**: Set up automated profile updates in dashboard
4. **Verify Email Service**: Test password reset functionality
5. **Review Admin Panel**: Configure platform settings and filters

---

## Deployment

### Render.com (Backend)
```bash
# Backend automatically detected as Node.js
# Push to GitHub, connect repository to Render
# Set environment variables in Render dashboard
```

### Vercel (Frontend)
```bash
# Push to GitHub
# Connect to Vercel dashboard
# Set NEXT_PUBLIC_API_BASE_URL to your backend URL
```

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review error logs in the terminal
3. Check GitHub issues
4. Review environment variables are correctly set

---

**Happy Coding! 🚀**
