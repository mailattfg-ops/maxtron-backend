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
            ALTER TABLE keil_vehicle_logs RENAME COLUMN start_time TO schedule_time;
            ALTER TABLE keil_vehicle_logs RENAME COLUMN end_time TO start_time;
            
            -- Refresh PostgREST cache
            NOTIFY pgrst, 'reload schema';
        `;
        
        await client.query(sql);
        console.log('Renaming time columns for vehicle logs executed successfully');

        const res = await client.query("select column_name from information_schema.columns where table_name = 'keil_vehicle_logs'");
        console.log('Current columns in logs:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
