require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function fixDatabaseSchema() {
  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Check current columns
    console.log('Checking current users table columns...');
    const columns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent columns in users table:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Add role column with ALTER TABLE
    console.log('\n\nAdding role column...');
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`);
      console.log('✅ Role column added');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✅ Role column already exists');
      } else {
        throw err;
      }
    }
    
    // Verify again
    console.log('\nVerifying columns after update...');
    const updatedColumns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\nUpdated columns in users table:');
    updatedColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Set default role for existing users
    console.log('\n\nSetting default role for existing users...');
    const updateResult = await client.query(`
      UPDATE users SET role = 'user' WHERE role IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} users with default role\n`);
    
    console.log('✅ Database schema fixed!');
    console.log('You can now run: node create-admins.js\n');
    
  } catch (err) {
    console.error('\n❌ Error fixing database schema:');
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

fixDatabaseSchema();
