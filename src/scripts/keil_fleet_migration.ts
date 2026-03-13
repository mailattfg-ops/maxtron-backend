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

async function runFleetMigration() {
    console.log('🔄 Starting KEIL Fleet & Maintenance migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Vehicle Master
        console.log('Creating keil_vehicles table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS keil_vehicles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                vehicle_number TEXT NOT NULL,
                make TEXT,
                model TEXT,
                year INTEGER,
                chassis_number TEXT,
                engine_number TEXT,
                fuel_type TEXT DEFAULT 'Diesel',
                tank_capacity NUMERIC(10, 2),
                current_km NUMERIC(15, 2) DEFAULT 0,
                status TEXT DEFAULT 'Active', -- 'Active', 'Maintenance', 'Out of Service'
                insurance_expiry DATE,
                fitness_expiry DATE,
                permit_expiry DATE,
                pollution_expiry DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(vehicle_number, company_id)
            );
        `);

        // 2. Daily Travel & Fuel Logs
        console.log('Creating keil_vehicle_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS keil_vehicle_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                vehicle_id UUID REFERENCES keil_vehicles(id) ON DELETE CASCADE,
                driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
                log_date DATE NOT NULL DEFAULT CURRENT_DATE,
                start_km NUMERIC(15, 2) NOT NULL,
                end_km NUMERIC(15, 2),
                fuel_qty NUMERIC(10, 2) DEFAULT 0,
                fuel_cost NUMERIC(15, 2) DEFAULT 0,
                mechanical_complaints TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // 3. Repair & Workshop Logs
        console.log('Creating keil_vehicle_repairs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS keil_vehicle_repairs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                vehicle_id UUID REFERENCES keil_vehicles(id) ON DELETE CASCADE,
                workshop_name TEXT,
                entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                exit_date TIMESTAMP WITH TIME ZONE,
                repair_description TEXT,
                cost NUMERIC(15, 2) DEFAULT 0,
                status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed'
                mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // Trigger to update current_km in keil_vehicles when a log is entered
        console.log('Creating trigger for vehicle km update...');
        await client.query(`
            CREATE OR REPLACE FUNCTION update_vehicle_km()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.end_km IS NOT NULL AND NEW.end_km > 0 THEN
                    UPDATE keil_vehicles 
                    SET current_km = NEW.end_km, updated_at = NOW()
                    WHERE id = NEW.vehicle_id;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_update_vehicle_km ON keil_vehicle_logs;
            CREATE TRIGGER trg_update_vehicle_km
            AFTER INSERT OR UPDATE ON keil_vehicle_logs
            FOR EACH ROW
            EXECUTE FUNCTION update_vehicle_km();
        `);

        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ KEIL Fleet & Maintenance migration successful!');

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Fleet Migration failed:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

runFleetMigration();
