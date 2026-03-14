import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Updating supplier_master gst_no to be unique but optional...');
    
    await client.query('BEGIN');

    // Convert empty strings to NULL to allow multiple "empty" values under UNIQUE constraint
    await client.query("UPDATE supplier_master SET gst_no = NULL WHERE gst_no = ''");
    
    // Add unique constraint
    // We'll use a named constraint so it's easier to handle/revert
    await client.query(`
      ALTER TABLE supplier_master 
      DROP CONSTRAINT IF EXISTS supplier_master_gst_no_key,
      ADD CONSTRAINT supplier_master_gst_no_key UNIQUE (gst_no, company_id);
    `);
    // Note: I'm making it unique per company_id as well, 
    // but if the user meant globally unique, I should just do UNIQUE(gst_no).
    // Usually in multi-tenant apps, it's unique per tenant.
    
    await client.query('COMMIT');
    console.log('✅ Migration successful.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
