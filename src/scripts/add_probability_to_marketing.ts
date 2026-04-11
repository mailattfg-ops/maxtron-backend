import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function addProbabilityColumn() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Adding probability column to marketing_visits table...');

        await client.query(`
            ALTER TABLE marketing_visits 
            ADD COLUMN IF NOT EXISTS probability VARCHAR(20) DEFAULT NULL;
        `);

        console.log('✅ Column added successfully!');

        console.log('🔟 Refreshing PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('🎉 Migration completed!');

    } catch (err: any) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (client) client.release();
        pool.end();
    }
}

addProbabilityColumn();
