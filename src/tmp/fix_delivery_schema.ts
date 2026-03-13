import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function fix() {
    console.log('--- Delivery Schema Fix ---');
    const client = await pool.connect();
    try {
        console.log('Adding missing columns to deliveries table...');

        await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_person_id UUID REFERENCES users(id) ON DELETE SET NULL');
        await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255)');
        await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS receiver_section VARCHAR(255)');
        await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50)');
        await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50)');
        await client.query('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS dc_no VARCHAR(100)');

        console.log('Refreshing schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema'");

        console.log('✅ Success! Delivery schema updated.');
    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
