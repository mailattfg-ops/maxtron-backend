const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
});

async function findTables() {
    try {
        await client.connect();
        const res = await client.query("select table_name from information_schema.tables where table_schema = 'public'");
        console.log('Tables in public schema:', res.rows.map(r => r.table_name));
    } catch (err) {
        console.error('Error finding tables:', err);
    } finally {
        await client.end();
    }
}

findTables();
