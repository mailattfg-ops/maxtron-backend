import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

const products = [
    "Green 16 x 16", "Green 19 x 22", "Green 24 x 30", "Green 30 x 35", "Green 33 x 50",
    "Black 19 x 22", "Black 24 x 30", "Black 30 x 35",
    "YELLOW 19 X 22", "YELLOW 24 X 30", "YELLOW 30 X 35",
    "RED 19 X 22", "RED 24 X 30", "RED 30 X 35",
    "YELLOW 18 X 20", "RED 18 X 20", "RED 24 X 26", "RED 26 X 30", "RED 30 X 36",
    "BLUE 19 X 22", "BLUE 24 X 30", "BLUE 30 X 35",
    "YELLOW 24 X 26", "YELLOW 26 X 30", "YELLOW 30 X 36",
    "BLUE 18 X 20", "BLUE 24 X 26", "BLUE 26 X 30", "BLUE 30 X 36",
    "GREEN 35 X 45", "BLACK 35 X 45"
];

async function insertProducts() {
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        const companies = await client.query("SELECT id, company_name FROM companies");
        console.log(`Found ${companies.rows.length} companies.`);

        for (const co of companies.rows) {
            console.log(`Inserting for ${co.company_name}...`);
            for (const p of products) {
                const parts = p.split(' ');
                const color = parts[0];
                const size = parts.slice(1).join(' ');
                const code = `FP-${p.replace(/\s+/g, '-').toUpperCase()}`;

                await client.query(
                    `INSERT INTO finished_products (product_code, product_name, color, size, company_id) 
                     VALUES ($1, $2, $3, $4, $5) 
                     ON CONFLICT (product_code, company_id) DO UPDATE SET product_name = EXCLUDED.product_name`,
                    [code, p, color, size, co.id]
                );
            }
        }
        console.log("✅ All products inserted successfully.");
    } catch (err) {
        console.error("❌ Error inserting products:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

insertProducts();
