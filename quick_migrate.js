const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await client.connect();
  console.log('Connected to database');
  
  try {
    console.log('Checking and adding consumption_id to production_batches...');
    await client.query(`
      ALTER TABLE production_batches 
      ADD COLUMN IF NOT EXISTS consumption_id UUID REFERENCES material_consumptions(id);
    `);
    console.log('Column added successfully or already exists.');
    
    // Also check for KEIL operations tables if they were missed
    console.log('Ensuring KEIL operations tables exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS keil_hces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          hce_name VARCHAR(255) NOT NULL,
          hce_code VARCHAR(50) NOT NULL,
          address TEXT,
          contact_person VARCHAR(100),
          contact_number VARCHAR(50),
          email VARCHAR(100),
          frequency VARCHAR(50) DEFAULT 'Daily',
          opening_hours VARCHAR(100),
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(hce_code, company_id)
      );

      CREATE TABLE IF NOT EXISTS keil_routes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          route_name VARCHAR(255) NOT NULL,
          route_code VARCHAR(50) NOT NULL,
          description TEXT,
          frequency VARCHAR(50) DEFAULT 'Daily',
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(route_code, company_id)
      );

      CREATE TABLE IF NOT EXISTS keil_route_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          route_id UUID REFERENCES keil_routes(id) ON DELETE CASCADE,
          hce_id UUID REFERENCES keil_hces(id) ON DELETE CASCADE,
          collection_days VARCHAR(100) DEFAULT 'Daily',
          sequence_order INTEGER DEFAULT 1,
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(route_id, hce_id)
      );

      CREATE TABLE IF NOT EXISTS keil_collection_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES companies(id),
          hce_id UUID REFERENCES keil_hces(id),
          route_id UUID REFERENCES keil_routes(id),
          collector_id UUID REFERENCES users(id),
          supervisor_id UUID REFERENCES users(id),
          collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
          yellow_bags INTEGER DEFAULT 0,
          red_bags INTEGER DEFAULT 0,
          white_bags INTEGER DEFAULT 0,
          bottle_bags INTEGER DEFAULT 0,
          total_bags INTEGER GENERATED ALWAYS AS (yellow_bags + red_bags + white_bags + bottle_bags) STORED,
          total_weight_kg NUMERIC(15,3) DEFAULT 0,
          remarks TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('KEIL tables verified.');

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();
