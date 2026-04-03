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
            ALTER TABLE keil_vehicle_logs ADD COLUMN IF NOT EXISTS start_time TIME;
            ALTER TABLE keil_vehicle_logs ADD COLUMN IF NOT EXISTS end_time TIME;
            ALTER TABLE keil_vehicle_logs ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT true;
            
            -- Refresh PostgREST cache
            NOTIFY pgrst, 'reload schema';
        `;
        
        await client.query(sql);
        console.log('Migration for vehicle logs executed successfully');

        const res = await client.query("select column_name from information_schema.columns where table_name = 'keil_vehicle_logs'");
        console.log('Current columns in logs:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
