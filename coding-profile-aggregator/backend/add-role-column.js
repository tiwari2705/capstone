require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function addRoleColumn() {
  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    console.log('Adding role column to users table...');
    
    // Add role column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='role'
        ) THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
          RAISE NOTICE 'Role column added successfully';
        ELSE
          RAISE NOTICE 'Role column already exists';
        END IF;
      END $$;
    `);
    
    console.log('✅ Role column check complete\n');
    
    // Verify the column exists
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Role column verified:');
      console.log('   Column name:', result.rows[0].column_name);
      console.log('   Data type:', result.rows[0].data_type);
      console.log('   Default value:', result.rows[0].column_default);
    } else {
      console.log('❌ Role column not found');
    }
    
    console.log('\n✅ Database migration complete!');
    console.log('You can now run: node create-admins.js\n');
    
  } catch (err) {
    console.error('\n❌ Error adding role column:');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    process.exit(0);
  }
}

addRoleColumn();
