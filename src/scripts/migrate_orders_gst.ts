import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrateOrdersGST() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Adding GST columns to orders and items...');

        // Header
        await client.query(`
            ALTER TABLE customer_orders 
            ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS net_amount NUMERIC(15, 2) DEFAULT 0;
        `);

        // Items
        // First drop 'value' if it's there as a generated column - but it might be used!
        // We'll just add new ones.
        await client.query(`
            ALTER TABLE customer_order_items 
            ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(15, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_value NUMERIC(15, 2) DEFAULT 0;
        `);

        console.log('🔟 Refreshing PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ GST Columns added successfully!');

    } catch (err: any) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (client) client.release();
        pool.end();
    }
}

migrateOrdersGST();
