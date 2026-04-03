const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
});

async function findCols() {
    try {
        await client.connect();
        const res = await client.query("select column_name from information_schema.columns where table_name = 'keil_vehicle_logs'");
        console.log('keil_vehicle_logs columns:', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error('Error finding columns:', err);
    } finally {
        await client.end();
    }
}

findCols();
