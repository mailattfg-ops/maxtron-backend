const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const maxtron = await pool.query("SELECT id FROM companies WHERE company_name = 'MAXTRON' LIMIT 1");
    if (maxtron.rows.length === 0) {
      console.log("MAXTRON company not found");
      return;
    }
    const coId = maxtron.rows[0].id;
    console.log("Current MAXTRON ID:", coId);

    const updateRes = await pool.query("UPDATE production_batches SET company_id = $1", [coId]);
    console.log(`Updated ${updateRes.rowCount} batches to company_id ${coId}`);

    const updateProdRes = await pool.query("UPDATE finished_products SET company_id = $1", [coId]);
    console.log(`Updated ${updateProdRes.rowCount} products to company_id ${coId}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
