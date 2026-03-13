const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pool.query("NOTIFY pgrst, 'reload schema'");
  console.log("PostgREST schema reload notified.");
  await pool.end();
}

run();
