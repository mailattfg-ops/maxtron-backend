import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const connectionString = process.env.SUPABASE_DB_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
    const res = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'supplier_master'
    ORDER BY column_name;
  `);
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
}
run();
