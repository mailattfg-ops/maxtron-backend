const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🚀 Migrating rm_order_items for GST support...');

    await pool.query('BEGIN');

    // 1. Add GST columns
    await pool.query(`
      ALTER TABLE rm_order_items 
      ADD COLUMN IF NOT EXISTS gst_percent NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;
    `);

    // 2. Convert 'amount' from generated to regular
    // We check if it's currently generated first in a more robust way if needed, 
    // but we know from schema it is.
    await pool.query('ALTER TABLE rm_order_items DROP COLUMN amount CASCADE');
    await pool.query('ALTER TABLE rm_order_items ADD COLUMN amount NUMERIC DEFAULT 0');

    // 3. Populate existing data
    await pool.query('UPDATE rm_order_items SET amount = quantity * rate');

    await pool.query('COMMIT');
    console.log('✅ Migration successful!');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
