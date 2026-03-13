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

async function updateVehicleSchema() {
    console.log('🔄 Updating KEIL Vehicle Master schema with detailed fields...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Add additional columns to keil_vehicles
        await client.query(`
            ALTER TABLE keil_vehicles 
            ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
            ADD COLUMN IF NOT EXISTS body_type TEXT,
            ADD COLUMN IF NOT EXISTS fitness_issuance_date DATE,
            ADD COLUMN IF NOT EXISTS initial_km NUMERIC(15, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS owner_name TEXT,
            ADD COLUMN IF NOT EXISTS owner_address TEXT,
            ADD COLUMN IF NOT EXISTS gps_installed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS gps_company TEXT,
            ADD COLUMN IF NOT EXISTS gps_installation_date DATE,
            ADD COLUMN IF NOT EXISTS usage_purpose TEXT DEFAULT 'BMW Collection';
        `);

        // Rename fitness_expiry for clarity if needed, or just keep it as is. 
        // The user asked for "Fitness Date" and "Fitness Renewal Date". 
        // Let's map "Fitness Date" to fitness_issuance_date and "Fitness Renewal Date" to fitness_expiry.

        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ KEIL Vehicle Master schema updated successfully!');

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Schema update failed:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

updateVehicleSchema();
