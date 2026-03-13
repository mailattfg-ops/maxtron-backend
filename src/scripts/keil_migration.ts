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

async function runKeilMigration() {
    console.log('🔄 Starting KEIL Operations migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. HCE Registry
        console.log('Creating keil_hces table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS keil_hces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        hce_name TEXT NOT NULL,
        hce_code TEXT NOT NULL,
        address TEXT,
        contact_person TEXT,
        phone VARCHAR(50),
        email TEXT,
        opening_hours TEXT,
        frequency TEXT DEFAULT 'Daily',
        status TEXT DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(hce_code, company_id)
      );
    `);

        // 2. Route Registry
        console.log('Creating keil_routes table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS keil_routes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        route_name TEXT NOT NULL,
        route_code TEXT NOT NULL,
        description TEXT,
        frequency TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(route_code, company_id)
      );
    `);

        // 3. Route Assignments (Mappings)
        console.log('Creating keil_route_assignments table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS keil_route_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID REFERENCES keil_routes(id) ON DELETE CASCADE,
        hce_id UUID REFERENCES keil_hces(id) ON DELETE CASCADE,
        collection_day TEXT, -- e.g. Monday, Everyday
        order_no INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

        // 4. Daily Collection Entry
        console.log('Creating keil_collection_entries table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS keil_collection_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        hce_id UUID REFERENCES keil_hces(id) ON DELETE CASCADE,
        route_id UUID REFERENCES keil_routes(id) ON DELETE SET NULL,
        collector_id UUID REFERENCES users(id) ON DELETE SET NULL,
        supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
        yellow_bags INTEGER DEFAULT 0,
        red_bags INTEGER DEFAULT 0,
        white_bags INTEGER DEFAULT 0,
        bottle_bags INTEGER DEFAULT 0,
        total_bags INTEGER GENERATED ALWAYS AS (yellow_bags + red_bags + white_bags + bottle_bags) STORED,
        total_weight_kg NUMERIC(15, 3) DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

        // PostgREST Schema Reload
        console.log('Notifying PostgREST to reload schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ KEIL Operations migration successful!');

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ KEIL Migration failed:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

runKeilMigration();
