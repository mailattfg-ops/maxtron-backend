import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function fix() {
    console.log('--- Sales Invoice Schema Fix ---');
    const client = await pool.connect();
    try {
        console.log('Adding discount_amount and scheduled_delivery_date columns...');
        await client.query('ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) DEFAULT 0');
        await client.query('ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS scheduled_delivery_date DATE');

        console.log('Refreshing schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema'");

        console.log('✅ Success! Sales Invoice schema updated.');
    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
