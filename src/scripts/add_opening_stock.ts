import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

async function addOpeningStockColumn() {
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("Checking if opening_stock column exists in finished_products...");
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'finished_products' AND column_name = 'opening_stock'
        `);

        if (res.rows.length === 0) {
            console.log("Adding opening_stock column to finished_products...");
            await client.query(`
                ALTER TABLE finished_products 
                ADD COLUMN opening_stock NUMERIC(15, 2) DEFAULT 0
            `);
            console.log("✅ Column added successfully.");
        } else {
            console.log("Column opening_stock already exists.");
        }
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

addOpeningStockColumn();
