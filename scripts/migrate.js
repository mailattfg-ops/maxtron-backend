const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const sql = `
-- Drop existing columns if they exist to start fresh? No, better just use ADD COLUMN IF NOT EXISTS
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS collection_date DATE;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES keil_routes(id);
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS supervisor_name TEXT;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS total_hce_assigned INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS total_visited INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS km_run NUMERIC DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS collection_qty NUMERIC DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS dc_qty INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS nw_qty INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS rd_qty INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS assigned_bedded INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS assigned_others INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS visited_bedded INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS visited_others INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS missed_bedded INTEGER DEFAULT 0;
ALTER TABLE keil_collection_headers ADD COLUMN IF NOT EXISTS missed_others INTEGER DEFAULT 0;

ALTER TABLE keil_hces ADD COLUMN IF NOT EXISTS hce_category TEXT DEFAULT 'Others';
        `;
        
        await client.query(sql);
        console.log('Migration executed successfully');

        const res = await client.query("select column_name from information_schema.columns where table_name = 'keil_collection_headers'");
        console.log('Current columns in headers:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
