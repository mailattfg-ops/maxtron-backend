const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const companies = await pool.query("SELECT * FROM companies");
    console.log("Current Companies:", companies.rows);

    const maxtron = companies.rows.find(c => c.company_name.toUpperCase() === 'MAXTRON');
    if (!maxtron) {
      console.log("MAXTRON company missing. Creating it...");
      const insertRes = await pool.query(
        "INSERT INTO companies (company_name, address, phone_number, email) VALUES ('MAXTRON', 'Maxtron Industrial Area', '1234567890', 'admin@maxtron.com') RETURNING *"
      );
      const newCo = insertRes.rows[0];
      console.log("Created MAXTRON with ID:", newCo.id);

      // Now update all batches and products to this new ID
      await pool.query("UPDATE production_batches SET company_id = $1", [newCo.id]);
      await pool.query("UPDATE finished_products SET company_id = $1", [newCo.id]);
      console.log("Re-aligned batches and products to the new MAXTRON ID.");
    } else {
      console.log("MAXTRON found with ID:", maxtron.id);
      // Even if found, let's re-align batches just in case
      const res1 = await pool.query("UPDATE production_batches SET company_id = $1", [maxtron.id]);
      const res2 = await pool.query("UPDATE finished_products SET company_id = $1", [maxtron.id]);
      console.log(`Verified and re-aligned ${res1.rowCount} batches and ${res2.rowCount} products to MAXTRON.`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
