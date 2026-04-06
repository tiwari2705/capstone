require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Create a new pool instance with the connection string
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function createAdmins() {
  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    console.log('Creating admin users...\n');

    // Admin 1
    const admin1Email = 'admin1@example.com';
    const admin1Password = 'admin123'; // Change this to a secure password
    console.log('Hashing password for Admin 1...');
    const admin1Hash = await bcrypt.hash(admin1Password, 12);

    // Admin 2
    const admin2Email = 'admin2@example.com';
    const admin2Password = 'admin456'; // Change this to a secure password
    console.log('Hashing password for Admin 2...');
    const admin2Hash = await bcrypt.hash(admin2Password, 12);

    // Check if admins already exist
    console.log('\nChecking for existing admin users...');
    const existing1 = await client.query('SELECT id, email FROM users WHERE email = $1', [admin1Email]);
    const existing2 = await client.query('SELECT id, email FROM users WHERE email = $1', [admin2Email]);

    // Create or update Admin 1
    if (existing1.rows.length > 0) {
      await client.query(
        'UPDATE users SET role = $1, password = $2 WHERE email = $3',
        ['admin', admin1Hash, admin1Email]
      );
      console.log('✅ Admin 1 updated (existing user):');
    } else {
      await client.query(
        `INSERT INTO users (name, email, password, role, registration_no, course, section) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Admin User 1', admin1Email, admin1Hash, 'admin', 'ADMIN001', 'Administration', 'A']
      );
      console.log('✅ Admin 1 created (new user):');
    }
    console.log(`   Email: ${admin1Email}`);
    console.log(`   Password: ${admin1Password}`);
    console.log(`   Reg No: ADMIN001\n`);

    // Create or update Admin 2
    if (existing2.rows.length > 0) {
      await client.query(
        'UPDATE users SET role = $1, password = $2 WHERE email = $3',
        ['admin', admin2Hash, admin2Email]
      );
      console.log('✅ Admin 2 updated (existing user):');
    } else {
      await client.query(
        `INSERT INTO users (name, email, password, role, registration_no, course, section) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Admin User 2', admin2Email, admin2Hash, 'admin', 'ADMIN002', 'Administration', 'B']
      );
      console.log('✅ Admin 2 created (new user):');
    }
    console.log(`   Email: ${admin2Email}`);
    console.log(`   Password: ${admin2Password}`);
    console.log(`   Reg No: ADMIN002\n`);

    // Verify admins were created
    console.log('Verifying admin users...');
    const admins = await client.query(
      "SELECT id, name, email, role, registration_no FROM users WHERE role = 'admin' ORDER BY id"
    );
    console.log(`\n✅ Found ${admins.rows.length} admin user(s) in database:`);
    admins.rows.forEach((admin, index) => {
      console.log(`\n${index + 1}. ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Reg No: ${admin.registration_no || 'N/A'}`);
      console.log(`   Role: ${admin.role}`);
    });

    console.log('\n🎉 Admin users created successfully!\n');
    console.log('You can now login with either admin account at:');
    console.log('http://localhost:3000/login\n');
    console.log('Then access the admin panel at:');
    console.log('http://localhost:3000/admin\n');

  } catch (err) {
    console.error('\n❌ Error creating admin users:');
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

createAdmins();
