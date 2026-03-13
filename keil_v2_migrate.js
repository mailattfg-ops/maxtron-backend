const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await client.connect();
  console.log('Connected to database for KEIL V2 Migration');
  
  try {
    await client.query('BEGIN');

    // Clean up old tables
    console.log('Dropping old KEIL tables...');
    await client.query(`
      DROP TABLE IF EXISTS keil_collection_entries CASCADE;
      DROP TABLE IF EXISTS keil_collection_headers CASCADE;
      DROP TABLE IF EXISTS keil_route_assignments CASCADE;
      DROP TABLE IF EXISTS keil_hces CASCADE;
      DROP TABLE IF EXISTS keil_routes CASCADE;
      DROP TABLE IF EXISTS keil_branches CASCADE;
    `);

    // 1. Branch Details
    console.log('Creating keil_branches table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS keil_branches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          branch_code VARCHAR(50) NOT NULL,
          branch_name VARCHAR(255) NOT NULL,
          district_name VARCHAR(100),
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(branch_code, company_id)
      );
    `);

    // 2. Route Creation (Updating existing or creating)
    console.log('Creating/Updating keil_routes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS keil_routes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          route_code VARCHAR(50) NOT NULL,
          route_name VARCHAR(255) NOT NULL,
          route_type VARCHAR(100),
          branch_id UUID REFERENCES keil_branches(id),
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(route_code, company_id)
      );
    `);

    // 3. Health Care Establishment Details
    console.log('Creating/Updating keil_hces table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS keil_hces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          hce_code VARCHAR(50) NOT NULL,
          hce_name VARCHAR(255) NOT NULL,
          branch_id UUID REFERENCES keil_branches(id),
          hce_place VARCHAR(255),
          address TEXT,
          contact_person VARCHAR(100),
          contact_mobile VARCHAR(50),
          email_id VARCHAR(100),
          collection_type VARCHAR(50), -- Daily / Alternate days / Thrice a Week / Once a Week
          open_from TIME,
          open_to TIME,
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(hce_code, company_id)
      );
    `);

    // 4. Route Assignments
    console.log('Creating/Updating keil_route_assignments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS keil_route_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          route_id UUID REFERENCES keil_routes(id) ON DELETE CASCADE,
          hce_id UUID REFERENCES keil_hces(id) ON DELETE CASCADE,
          collection_type VARCHAR(50), 
          collection_days JSONB, -- Selection of days
          remarks TEXT,
          sequence_order INTEGER DEFAULT 1,
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(route_id, hce_id)
      );
    `);

    // 5. Daily Collection Entry
    console.log('Creating/Updating keil_collection_entries table...');
    // We might need a parent table for the route visit header and a child table for per-HCE logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS keil_collection_headers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
          route_id UUID REFERENCES keil_routes(id),
          vehicle_number VARCHAR(50),
          driver_name VARCHAR(100),
          supervisor_name VARCHAR(100),
          total_hce_assigned INTEGER DEFAULT 0,
          total_visited INTEGER DEFAULT 0,
          remarks TEXT,
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS keil_collection_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          header_id UUID REFERENCES keil_collection_headers(id) ON DELETE CASCADE,
          hce_id UUID REFERENCES keil_hces(id),
          is_visited BOOLEAN DEFAULT FALSE,
          start_time TIME,
          end_time TIME,
          yellow_bags INTEGER DEFAULT 0,
          red_bags INTEGER DEFAULT 0,
          white_containers INTEGER DEFAULT 0,
          bottle_containers INTEGER DEFAULT 0,
          remarks TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('KEIL V2 Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();
