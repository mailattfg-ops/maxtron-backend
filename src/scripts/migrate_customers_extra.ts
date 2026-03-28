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

async function migrateCustomersExtra() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Adding extra columns to customers table...');

        const columns = [
            { name: 'mobile_no', type: 'VARCHAR(50)' },
            { name: 'email_id', type: 'VARCHAR(255)' },
            { name: 'department', type: 'VARCHAR(100)' },
            { name: 'custom_label1', type: 'VARCHAR(100)' },
            { name: 'custom_value1', type: 'TEXT' },
            { name: 'custom_label2', type: 'VARCHAR(100)' },
            { name: 'custom_value2', type: 'TEXT' }
        ];

        for (const col of columns) {
            console.log(`adding ${col.name}...`);
            await client.query(`
                ALTER TABLE customers 
                ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
            `);
        }

        console.log('🔟 Refreshing PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");

        await client.query('COMMIT');
        console.log('✅ Customers Extra Columns added successfully!');

    } catch (err: any) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (client) client.release();
        pool.end();
    }
}

migrateCustomersExtra();
