import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error('❌ Error: SUPABASE_DB_URL is missing.');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function addSoftDelete() {
    console.log('🔄 Adding is_deleted column to users table...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Add is_deleted column
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
        `);

        // PostgREST Schema Reload
        console.log('Notifying PostgREST to reload schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ Soft delete column added successfully!');

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

addSoftDelete();
