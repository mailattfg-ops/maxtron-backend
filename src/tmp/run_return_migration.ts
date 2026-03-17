import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- Add rm_id to purchase_returns for stock traceability
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS rm_id UUID REFERENCES raw_materials(id);

-- Update the status check constraint to include 'Credit Received'
ALTER TABLE purchase_returns DROP CONSTRAINT IF EXISTS purchase_returns_status_check;
ALTER TABLE purchase_returns ADD CONSTRAINT purchase_returns_status_check CHECK (status IN ('PENDING', 'DISPATCHED', 'CREDITED', 'Credit Received'));
`;

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query(sql);
        console.log('Migration successful');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
