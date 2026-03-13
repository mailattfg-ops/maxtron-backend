const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL
});

async function run() {
    try {
        await client.connect();
        await client.query(`
            ALTER TABLE public.user_types ADD COLUMN IF NOT EXISTS company_id UUID;
            ALTER TABLE public.employee_categories ADD COLUMN IF NOT EXISTS company_id UUID;
        `);
        console.log('Tables altered successfully!');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        await client.end();
    }
}

run();
