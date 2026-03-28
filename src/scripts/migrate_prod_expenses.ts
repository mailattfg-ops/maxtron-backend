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

async function migrateProductionExpenses() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Creating production_expenses table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS production_expenses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
                category VARCHAR(100), -- Spare Parts, Maintenance, Consumables, Utilities, Others
                description TEXT,
                amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                payment_mode VARCHAR(50) DEFAULT 'CASH',
                reference_no VARCHAR(100),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('🔟 Refreshing PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ production_expenses table created successfully!');

    } catch (err: any) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (client) client.release();
        pool.end();
    }
}

migrateProductionExpenses();
