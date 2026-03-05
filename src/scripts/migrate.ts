import dns from "dns";

dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Ensure it reads from the correct backend root

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Error: SUPABASE_DB_URL is missing in your .env file.');
  console.error('📋 Please get your Database Connection String (URI format starting with postgres://) from Supabase -> Settings -> Database');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase external connections
});

async function runMigrations() {
  console.log('🔄 Starting automated database migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('1️⃣ Creating user_types table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_types (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        name text UNIQUE NOT NULL,
        description text
      );
    `);

    console.log('2️⃣ Inserting default user_types...');
    await client.query(`
      INSERT INTO user_types (id, name, description) VALUES
        (uuid_generate_v4(), 'admin', 'System Administrator with full access'),
        (uuid_generate_v4(), 'hr', 'Human Resources and Payroll manager'),
        (uuid_generate_v4(), 'sales', 'Sales representative and order manager'),
        (uuid_generate_v4(), 'production', 'Production floor and machine scheduler'),
        (uuid_generate_v4(), 'finance', 'Accountant and finance module manager')
      ON CONFLICT (name) DO NOTHING; -- Prevents errors if roles already exist
    `);

    console.log('3️⃣ Creating Employee Master tables (Categories & Departments)...');

    // Clean up old separate employees table if it exists
    await client.query('DROP TABLE IF EXISTS employees CASCADE;');

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_categories(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    await client.query(`
      INSERT INTO employee_categories(id, category_name) VALUES
      (gen_random_uuid(), 'Management'),
      (gen_random_uuid(), 'Staff - Technical'),
      (gen_random_uuid(), 'Staff - Non-Technical'),
      (gen_random_uuid(), 'Worker - Skilled'),
      (gen_random_uuid(), 'Worker - Unskilled')
      ON CONFLICT(category_name) DO NOTHING;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_code VARCHAR(50) UNIQUE NOT NULL,
      company_name VARCHAR(255) UNIQUE NOT NULL,
      gst_no VARCHAR(100),
      license_no VARCHAR(100),
      license_details TEXT,
      license_renewal_date DATE,
      pcb_authorization_no VARCHAR(100),
      pcb_details TEXT,
      pcb_renewal_date DATE,
      no_of_employees INTEGER DEFAULT 0,
      email VARCHAR(255),
      phone VARCHAR(50),
      website VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);

    await client.query(`
      INSERT INTO companies(id, company_code, company_name) VALUES
      (gen_random_uuid(), 'MAXTRON-CODE', 'MAXTRON'),
      (gen_random_uuid(), 'KEIL-CODE', 'KEIL')
      ON CONFLICT(company_name) DO NOTHING;
    `);

    console.log('4️⃣ Clean up dependencies to apply new structural updates...');
    await client.query(`
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS user_departments, addresses, employee_qualifications, employee_experiences, employee_certificates, employee_licenses, employee_passports, employee_loans, employee_suspenses, employee_targets, employee_incentive_slabs, attendance, marketing_visits, customers CASCADE;
    `);

    console.log('4.5️⃣ Creating users table (Unified with Employee data)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type UUID NOT NULL,
      employee_code VARCHAR(50) UNIQUE NOT NULL,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL, --email used for login
        password TEXT NOT NULL, --hashed using bcrypt
        address TEXT, --communication address
        permanent_address TEXT,
      date_of_birth DATE,
        guarantor_name VARCHAR(150),
          is_married BOOLEAN DEFAULT FALSE,
          family_details TEXT,
          category_id UUID,
          company_id UUID,
          has_license BOOLEAN DEFAULT FALSE,
          has_passport BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                  --Foreign Key Connections
        CONSTRAINT fk_profile_type 
            FOREIGN KEY(type) 
            REFERENCES user_types(id)
            ON DELETE RESTRICT,

      CONSTRAINT fk_profile_category 
            FOREIGN KEY(category_id) 
            REFERENCES employee_categories(id)
            ON DELETE SET NULL,

      CONSTRAINT fk_company 
            FOREIGN KEY(company_id) 
            REFERENCES companies(id)
            ON DELETE SET NULL
      );
    `);



    console.log('5️⃣ Creating inventory table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory(
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      name text NOT NULL,
      sku text UNIQUE NOT NULL,
      quantity numeric DEFAULT 0,
      category text,
      price numeric DEFAULT 0.00,
      created_at timestamp with time zone DEFAULT now()
      );
    `);

    console.log('7️⃣ Creating Employee HR Module and Company dependent tables...');

    // Companies Table


    await client.query(`
      CREATE TABLE IF NOT EXISTS customers(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        customer_code VARCHAR(50) NOT NULL,
        gst_no VARCHAR(100),
        credit_period INTEGER DEFAULT 0, -- Store as days
        credit_limit NUMERIC(12, 2) DEFAULT 0,
        delivery_period VARCHAR(100), -- New Field
        delivery_mode VARCHAR(100), -- New Field
        opening_balance NUMERIC(12, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_code, company_id)
      );
    `);

    // Dependencies (Addresses can belong to users, companies, or customers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      address_type VARCHAR(50),
      street VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      zip_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'India',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_qualifications(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      qualification_type VARCHAR(30) CHECK(qualification_type IN('BASIC', 'ADDITIONAL')),
      qualification_name VARCHAR(200)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_experiences(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_name VARCHAR(150),
      from_period DATE,
      to_period DATE,
      post VARCHAR(150),
      responsibilities TEXT
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_certificates(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      certificate_type VARCHAR(50) CHECK(certificate_type IN('MEDICAL', 'POLICE_VERIFICATION')),
      issued BOOLEAN DEFAULT FALSE,
      issue_date DATE,
      expiry_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_licenses(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      license_no VARCHAR(100),
      issue_date DATE,
      expiry_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_passports(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      passport_no VARCHAR(100),
      issue_date DATE,
      expiry_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_loans(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      loan_availed NUMERIC(12, 2),
      balance_receivable NUMERIC(12, 2),
      loan_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_targets(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      minimum_target NUMERIC(12, 2)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_incentive_slabs(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      slab_from NUMERIC(12, 2),
      slab_to NUMERIC(12, 2),
      incentive_percent NUMERIC(5, 2)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_suspenses(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      suspense_issued NUMERIC(12, 2),
      balance_receivable NUMERIC(12, 2)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      shift VARCHAR(20) NOT NULL, --DAY, NIGHT, GENERAL
        clock_in TIME,
      clock_out TIME,
      status VARCHAR(20) DEFAULT 'PRESENT',
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_visits(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      customer_name VARCHAR(255) NOT NULL,
      location TEXT,
      visit_date DATE NOT NULL,
      time_in TIME,
      time_out TIME,
      purpose TEXT,
      outcome TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);

    console.log('7.5️⃣ Creating Supplier Master table...');
    await client.query('DROP TABLE IF EXISTS suppliers CASCADE;');
    await client.query('DROP TABLE IF EXISTS supplier_master CASCADE;');
    await client.query(`
      CREATE TABLE supplier_master (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        supplier_code VARCHAR(50) UNIQUE NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        supplier_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
        billing_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
        gst_no VARCHAR(100),
        credit_period INTEGER DEFAULT 0,
        credit_limit NUMERIC(15, 2) DEFAULT 0,
        product_supplied TEXT,
        delivery_period VARCHAR(100),
        delivery_mode VARCHAR(100),
        opening_balance NUMERIC(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('ALTER TABLE supplier_master ENABLE ROW LEVEL SECURITY;');
    await client.query('CREATE POLICY "master_supplier_access" ON supplier_master FOR ALL USING (true) WITH CHECK (true);');

    console.log('8️⃣ Inserting default admin user...');
    await client.query(`
      INSERT INTO users(type, name, username, password, address, employee_code)
      SELECT id, 'System Admin', 'admin@maxtron.com', 'password', 'Maxtron HQ, Server Room 1', 'SYS-ADMIN-01'
      FROM user_types WHERE name = 'admin'
      ON CONFLICT(username) DO NOTHING;
    `);

    console.log('9️⃣ Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");


    await client.query('COMMIT');
    console.log('✅ Migration successful! All tables and unified users structure correctly created.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations();
