const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL
});

async function run() {
    try {
        await client.connect();
        const sql = fs.readFileSync('C:/Users/shiju/.gemini/antigravity/brain/c528c308-ab4f-4166-90ff-0d09653b06f1/expense_migration.sql', 'utf8');
        console.log('Running expense migration SQL...');
        await client.query(sql);
        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        await client.end();
    }
}

run();
