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

async function fixBatchesSchema() {
    console.log('🔄 Fixing production_batches schema...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Remove previous attempt if any (batch_id in material_consumptions)
        console.log('Clearing old circular link from material_consumptions...');
        await client.query(`
      ALTER TABLE material_consumptions DROP COLUMN IF EXISTS batch_id CASCADE;
    `);

        // 2. Add consumption_id to production_batches
        console.log('Adding consumption_id to production_batches...');
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_batches' AND column_name = 'consumption_id') THEN
          ALTER TABLE production_batches ADD COLUMN consumption_id UUID REFERENCES material_consumptions(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

        // 3. Force PostgREST reload
        console.log('Notifying PostgREST to reload schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ Success! production_batches updated and schema cache reloaded.');

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

fixBatchesSchema();
