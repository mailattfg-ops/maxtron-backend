const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function restoreAdmin() {
  console.log('🚀 Restoring Admin User...');
  try {
    // 1. Get Maxtron Company ID
    const coRes = await pool.query("SELECT id FROM companies WHERE company_name = 'MAXTRON' LIMIT 1");
    if (coRes.rows.length === 0) {
      console.error('❌ Maxtron company not found!');
      return;
    }
    const coId = coRes.rows[0].id;

    // 2. Get Admin Role ID
    const roleRes = await pool.query("SELECT id FROM user_types WHERE name = 'admin' AND company_id = $1 LIMIT 1", [coId]);
    if (roleRes.rows.length === 0) {
      console.error('❌ Admin role not found for Maxtron!');
      return;
    }
    const roleId = roleRes.rows[0].id;

    // 3. Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 4. Insert Admin User
    const insertRes = await pool.query(
      "INSERT INTO users (type, name, username, password, company_id, employee_code, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [roleId, 'System Admin', 'admin@maxtron.com', hashedPassword, coId, 'SYS-001', false]
    );

    console.log('✅ Admin user restored successfully!');
    console.log('Username: admin@maxtron.com');
    console.log('Password: admin123');
  } catch (err) {
    console.error('❌ Error restoring admin:', err);
  } finally {
    await pool.end();
  }
}

restoreAdmin();
