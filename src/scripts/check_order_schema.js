const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type, is_generated 
      FROM information_schema.columns 
      WHERE table_name = 'rm_order_items'
    `);
    console.log('Schema for rm_order_items:');
    console.table(res.rows);

    const res2 = await pool.query(`
      SELECT table_name, column_name, data_type, is_generated 
      FROM information_schema.columns 
      WHERE table_name = 'rm_orders'
    `);
    console.log('\nSchema for rm_orders:');
    console.table(res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
