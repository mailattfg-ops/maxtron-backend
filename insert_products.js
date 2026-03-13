const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

const products = [
    { name: "Green 16 x 16", color: "Green", size: "16 x 16" },
    { name: "Green 19 x 22", color: "Green", size: "19 x 22" },
    { name: "Green 24 x 30", color: "Green", size: "24 x 30" },
    { name: "Green 30 x 35", color: "Green", size: "30 x 35" },
    { name: "Green 33 x 50", color: "Green", size: "33 x 50" },
    { name: "Black 19 x 22", color: "Black", size: "19 x 22" },
    { name: "Black 24 x 30", color: "Black", size: "24 x 30" },
    { name: "Black 30 x 35", color: "Black", size: "30 x 35" },
    { name: "YELLOW 19 X 22", color: "Yellow", size: "19 x 22" },
    { name: "YELLOW 24 X 30", color: "Yellow", size: "24 x 30" },
    { name: "YELLOW 30 X 35", color: "Yellow", size: "30 x 35" },
    { name: "RED 19 X 22", color: "Red", size: "19 x 22" },
    { name: "RED 24 X 30", color: "Red", size: "24 x 30" },
    { name: "RED 30 X 35", color: "Red", size: "30 x 35" },
    { name: "YELLOW 18 X 20", color: "Yellow", size: "18 x 20" },
    { name: "RED 18 X 20", color: "Red", size: "18 x 20" },
    { name: "RED 24 X 26", color: "Red", size: "24 x 26" },
    { name: "RED 26 X 30", color: "Red", size: "26 x 30" },
    { name: "RED 30 X 36", color: "Red", size: "30 x 36" },
    { name: "BLUE 19 X 22", color: "Blue", size: "19 x 22" },
    { name: "BLUE 24 X 30", color: "Blue", size: "24 x 30" },
    { name: "BLUE 30 X 35", color: "Blue", size: "30 x 35" },
    { name: "YELLOW 18 X 20", color: "Yellow", size: "18 x 20" }, // duplicate in list
    { name: "YELLOW 24 X 26", color: "Yellow", size: "24 x 26" },
    { name: "YELLOW 26 X 30", color: "Yellow", size: "26 x 30" },
    { name: "YELLOW 30 X 36", color: "Yellow", size: "30 x 36" },
    { name: "BLUE 18 X 20", color: "Blue", size: "18 x 20" },
    { name: "BLUE 24 X 26", color: "Blue", size: "24 x 26" },
    { name: "BLUE 26 X 30", color: "Blue", size: "26 x 30" },
    { name: "BLUE 30 X 36", color: "Blue", size: "30 x 36" },
    { name: "GREEN 35 X 45", color: "Green", size: "35 x 45" },
    { name: "BLACK 35 X 45", color: "Black", size: "35 x 45" }
];

const companyId = '24ea3bef-1e0c-4490-9d40-7063fb9067e9'; // Maxtron

async function insertProducts() {
  await client.connect();
  console.log('Inserting products for Maxtron...');
  
  try {
    for (const p of products) {
        const code = (p.color.slice(0, 2) + '-' + p.size.replace(/\s+/g, '')).toUpperCase();
        await client.query(`
          INSERT INTO finished_products (product_code, product_name, color, size, company_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (product_code, company_id) DO NOTHING;
        `, [code, p.name, p.color, p.size, companyId]);
    }
    console.log('Finished Product insertion complete.');
  } catch (err) {
    console.error('Error inserting products:', err);
  } finally {
    await client.end();
  }
}

insertProducts();
