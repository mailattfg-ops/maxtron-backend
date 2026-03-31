const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearData() {
  const tablesToPreserve = [
    'permissions',
    'role_permissions',
    'user_types',
    'employee_categories',
    'finished_products',
    'raw_materials',
    'companies'
  ];

  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    const allTables = res.rows.map(r => r.table_name);
    
    const tablesToClear = allTables.filter(t => !tablesToPreserve.includes(t));

    console.log('Preserving:', tablesToPreserve);
    console.log('Clearing:', tablesToClear);

    // TRUNCATE CASCADE is safe for many but might fail if there are certain dependencies.
    // Instead of truncate, delete with CASCADE is safer.
    
    // We also need to be careful with 'users' as it contains the admin.
    // We'll delete non-admin users separately.
    
    console.log('🚀 Clearing operational data...');

    for (const table of tablesToClear) {
      if (table === 'users') {
        console.log('⚠️ Sanitizing users table (preserving admin)...');
        await pool.query("DELETE FROM users WHERE username != 'admin@maxtron.com'");
      } else {
        console.log(`🧹 Truncating ${table}...`);
        await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }
    }

    console.log('✅ All target tables cleared successfully!');
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  } finally {
    await pool.end();
  }
}

clearData();
