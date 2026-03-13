const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const companies = await pool.query("SELECT id, company_name FROM companies");
    console.log("--- COMPANIES ---");
    console.table(companies.rows);

    const batches = await pool.query("SELECT id, batch_number, company_id, product_id FROM production_batches");
    console.log("\n--- BATCHES ---");
    console.table(batches.rows);

    const products = await pool.query("SELECT id, product_name, company_id FROM finished_products");
    console.log("\n--- PRODUCTS ---");
    console.table(products.rows);

    if (companies.rows.length > 0 && batches.rows.length > 0) {
        const maxtron = companies.rows.find(c => c.company_name === 'MAXTRON');
        if (maxtron) {
            const wrongBatch = batches.rows.filter(b => b.company_id !== maxtron.id);
            if (wrongBatch.length > 0) {
                console.log(`\nFound ${wrongBatch.length} batches with WRONG company_id. Fixing...`);
                await pool.query("UPDATE production_batches SET company_id = $1", [maxtron.id]);
                console.log("Batches fixed.");
            } else {
                console.log("\nAll batches have correct company_id.");
            }
        }
    } else if (batches.rows.length === 0) {
        console.log("\n[!] NO BATCHES FOUND IN DATABASE.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
