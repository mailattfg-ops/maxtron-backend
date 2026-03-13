import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const connectionString = process.env.SUPABASE_DB_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'suppliers'");
    console.log('Suppliers columns:', result.rows);
    pool.end();
}
check();
