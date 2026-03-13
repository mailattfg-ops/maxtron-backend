import { Pool } from 'pg'; 
import dotenv from 'dotenv'; 
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({ 
    connectionString: process.env.SUPABASE_DB_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function migrate() { 
    const client = await pool.connect(); 
    try { 
        await client.query('BEGIN');

        console.log('UPDATING keil_vehicle_repairs table...');
        await client.query(`
            ALTER TABLE keil_vehicle_repairs 
            ADD COLUMN IF NOT EXISTS log_date DATE DEFAULT CURRENT_DATE,
            ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES keil_routes(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS remarks TEXT;
        `);

        console.log('UPDATING keil_vehicle_logs table...');
        await client.query(`
            ALTER TABLE keil_vehicle_logs 
            ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES keil_routes(id) ON DELETE SET NULL;
        `);

        await client.query('COMMIT');
        console.log('✅ Migration successful!');
    } catch (e: any) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e.message);
    } finally { 
        client.release(); 
        pool.end(); 
    } 
} 
migrate();
