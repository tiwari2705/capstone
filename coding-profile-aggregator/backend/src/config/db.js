const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Max connections (was ~10 default)
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout for acquiring connection
  statement_timeout: 60000,     // Kill long-running queries after 60s
  query_timeout: 60000          // Kill queries after 60s
});

// Monitor pool errors
pool.on('error', (err, client) => {
  console.error('[DB Pool] Unexpected error:', err);
  process.exit(-1);
});

let isDBReady = false;

const initDB = async () => {
  // Create a client with longer timeout for initialization
  const client = await pool.connect();
  try {
    // Set longer timeout for initial setup queries
    await client.query('SET statement_timeout = 300000'); // 5 minutes for init
    // 1. Basic Table setup
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE,
        registration_no VARCHAR(100) UNIQUE,
        course VARCHAR(100),
        section VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS coding_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        username VARCHAR(255) NOT NULL,
        profile_url VARCHAR(500),
        verified BOOLEAN DEFAULT FALSE,
        verification_code VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, platform)
      );

      CREATE TABLE IF NOT EXISTS stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        problems_solved INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 0,
        easy_solved INTEGER DEFAULT 0,
        medium_solved INTEGER DEFAULT 0,
        hard_solved INTEGER DEFAULT 0,
        submissions INTEGER DEFAULT 0,
        score NUMERIC(10,2) DEFAULT 0,
        badges INTEGER DEFAULT 0,
        rank VARCHAR(100),
        extra_data JSONB DEFAULT '{}',
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, platform)
      );

      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        registration_no VARCHAR(100),
        otp VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        submission_date DATE NOT NULL,
        platform VARCHAR(50) NOT NULL,
        count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, submission_date, platform)
      );

      CREATE TABLE IF NOT EXISTS contest_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        contest_name VARCHAR(255),
        contest_date TIMESTAMP,
        rank INTEGER,
        rating_change INTEGER,
        new_rating INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Safe Migrations
    try {
      await client.query(`
        DO $$ 
        BEGIN
          -- Add username
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
            ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
          END IF;

          -- Add registration_no
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='registration_no') THEN
            ALTER TABLE users ADD COLUMN registration_no VARCHAR(100) UNIQUE;
          END IF;

          -- Add email_verified
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
            ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
          END IF;

          -- Add year_of_passing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='year_of_passing') THEN
            ALTER TABLE users ADD COLUMN year_of_passing INTEGER;
          END IF;

          -- Safe Data Migration: Copy registration_no to registration_no ONLY if unique
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='registration_no') THEN
            UPDATE users u 
            SET registration_no = registration_no 
            WHERE u.registration_no IS NULL 
            AND u.registration_no IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.registration_no = u.registration_no)
            AND u.id IN (SELECT MIN(id) FROM users u3 GROUP BY u3.registration_no);
          END IF;
          
          -- Other columns
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coding_profiles' AND column_name='profile_url') THEN
            ALTER TABLE coding_profiles ADD COLUMN profile_url VARCHAR(500);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coding_profiles' AND column_name='updated_at') THEN
            ALTER TABLE coding_profiles ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stats' AND column_name='badges') THEN
            ALTER TABLE stats ADD COLUMN badges INTEGER DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stats' AND column_name='rank') THEN
            ALTER TABLE stats ADD COLUMN rank VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stats' AND column_name='active_days') THEN
            ALTER TABLE stats ADD COLUMN active_days INTEGER DEFAULT 0;
          END IF;
        END $$;
      `);
    } catch (migErr) {
      console.warn('Migration warning (non-fatal):', migErr.message);
    }

    // 3. Create Indexes for Performance
    console.log('[DB] Creating indexes for performance...');
    try {
      await client.query(`
        -- User indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_registration_no ON users(registration_no);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        -- Stats indexes
        CREATE INDEX IF NOT EXISTS idx_stats_user_id ON stats(user_id);
        CREATE INDEX IF NOT EXISTS idx_stats_platform ON stats(platform);
        CREATE INDEX IF NOT EXISTS idx_stats_rating ON stats(rating DESC);
        CREATE INDEX IF NOT EXISTS idx_stats_problems ON stats(problems_solved DESC);
        CREATE INDEX IF NOT EXISTS idx_stats_score ON stats(score DESC);
        CREATE INDEX IF NOT EXISTS idx_stats_user_platform ON stats(user_id, platform);
        CREATE INDEX IF NOT EXISTS idx_stats_last_updated ON stats(last_updated DESC);

        -- Coding profiles indexes
        CREATE INDEX IF NOT EXISTS idx_coding_profiles_user_id ON coding_profiles(user_id);
        CREATE INDEX IF NOT EXISTS idx_coding_profiles_verified ON coding_profiles(verified);
        CREATE INDEX IF NOT EXISTS idx_coding_profiles_platform ON coding_profiles(platform);
        CREATE INDEX IF NOT EXISTS idx_coding_profiles_user_platform ON coding_profiles(user_id, platform);

        -- Daily submissions indexes
        CREATE INDEX IF NOT EXISTS idx_daily_submissions_user_id ON daily_submissions(user_id);
        CREATE INDEX IF NOT EXISTS idx_daily_submissions_date ON daily_submissions(submission_date DESC);
        CREATE INDEX IF NOT EXISTS idx_daily_submissions_user_date ON daily_submissions(user_id, submission_date);

        -- OTP indexes
        CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
        CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

        -- Contest history indexes
        CREATE INDEX IF NOT EXISTS idx_contest_history_user_id ON contest_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_contest_history_date ON contest_history(contest_date DESC);
      `);
      console.log('[DB] ✓ All indexes created successfully');
    } catch (indexErr) {
      console.warn('[DB] Index creation warning (non-fatal):', indexErr.message);
    }

    // 4. Superadmin Seeding
    // try {
    //   const hashedX = await bcrypt.hash('Admin@789', 12);
      
    //   const admins = [
    //     { name: 'Root Admin X', user: 'admin_x', email: 'admin_x@codequest.app', pass: hashedX, reg: 'ADMIN_X_01' },
    //     { name: 'Root Admin Y', user: 'admin_y', email: 'admin_y@codequest.app', pass: hashedX, reg: 'ADMIN_Y_02' }
    //   ];

    //   for (const admin of admins) {
    //     await client.query(
    //       `INSERT INTO users (name, username, email, password, registration_no, role, email_verified) 
    //        VALUES ($1, $2, $3, $4, $5, 'admin', TRUE) 
    //        ON CONFLICT (email) DO UPDATE SET 
    //          registration_no = EXCLUDED.registration_no,
    //          password = EXCLUDED.password,
    //          role = 'admin',
    //          email_verified = TRUE`,
    //       [admin.name, admin.user, admin.email, admin.pass, admin.reg]
    //     );
    //   }
    //   console.log('Synchronized 2 fresh admin accounts (X and Y).');
    // } catch (seedErr) {
    //   console.warn('Seeding warning (non-fatal):', seedErr.message);
    // }

    console.log('Database initialized successfully.');
    
    // Reset statement timeout back to normal
    await client.query('RESET statement_timeout');
    isDBReady = true;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB, getIsDBReady: () => isDBReady };
