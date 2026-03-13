const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const companies = await pool.query("SELECT id, company_name FROM companies");
    console.log("Companies:", JSON.stringify(companies.rows, null, 2));

    const batches = await pool.query("SELECT * FROM production_batches");
    console.log("Batches:", JSON.stringify(batches.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
