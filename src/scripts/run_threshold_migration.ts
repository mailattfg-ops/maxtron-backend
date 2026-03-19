import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.SUPABASE_DB_URL;

async function runMigration() {
  if (!connectionString) {
    console.error('❌ Error: SUPABASE_DB_URL is missing.');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Adding stock_threshold to tables...');

    // Add to raw_materials if missing
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name='raw_materials' AND column_name='stock_threshold'
          ) THEN
              ALTER TABLE raw_materials ADD COLUMN stock_threshold DECIMAL(15,2) DEFAULT 0;
          END IF;
      END $$;
    `);
    console.log('✅ Checked raw_materials stock_threshold');

    // Add to finished_products if missing
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name='finished_products' AND column_name='stock_threshold'
          ) THEN
              ALTER TABLE finished_products ADD COLUMN stock_threshold DECIMAL(15,2) DEFAULT 0;
          END IF;
      END $$;
    `);
    console.log('✅ Checked finished_products stock_threshold');

    // Refresh PostgREST schema cache
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('🚀 PostgREST schema reload signal sent.');

    console.log('✨ Migration completed successfully!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    const p = pool;
    client.release();
    p.end();
  }
}

runMigration();
