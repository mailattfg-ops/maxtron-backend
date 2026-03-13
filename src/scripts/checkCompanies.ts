import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const connectionString = process.env.SUPABASE_DB_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkCompanies() {
    const res = await pool.query(`SELECT id, company_name FROM companies`);
    console.log(JSON.stringify(res.rows, null, 2));
    pool.end();
}
checkCompanies();
