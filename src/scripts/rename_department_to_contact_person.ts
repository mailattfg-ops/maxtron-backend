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

async function renameDepartmentToContactPerson() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Renaming department column to contact_person in customers table...');

        // Check if column exists before renaming
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'department';
        `);

        if (res.rows.length > 0) {
            await client.query(`
                ALTER TABLE customers 
                RENAME COLUMN department TO contact_person;
            `);
            console.log('✅ Column renamed successfully!');
        } else {
            console.log('⚠️ Column "department" not found, it might have been renamed already.');
        }

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

renameDepartmentToContactPerson();
