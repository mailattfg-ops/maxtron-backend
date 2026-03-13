const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query("SELECT id FROM companies WHERE company_name = 'MAXTRON'");
    if (res.rows.length > 0) {
        console.log("MAXTRON_ID_FOR_FRONTEND:" + res.rows[0].id);
    } else {
        console.log("MAXTRON company not found");
    }

    const res2 = await pool.query("SELECT DISTINCT company_id FROM production_batches");
    if (res2.rows.length > 0) {
        console.log("BATCH_COMPANY_ID_IN_DB:" + res2.rows[0].company_id);
    } else {
        console.log("No batches found");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
