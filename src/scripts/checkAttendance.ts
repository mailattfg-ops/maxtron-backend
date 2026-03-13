import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const connectionString = process.env.SUPABASE_DB_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkAttendance() {
    const res = await pool.query(`SELECT * FROM attendance`);
    console.log("TOTAL ATTENDANCE RECORDS:", res.rowCount);
    console.log(JSON.stringify(res.rows, null, 2));

    const tables = await pool.query(`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance'`);
    console.log("TABLE RLS INFO:", tables.rows[0]);

    pool.end();
}
checkAttendance();
