import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres.jylkzihuozugqfjqvhhe:ccRzE_%5EUsVBAd8*@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres';

async function addRepairFields() {
    console.log(`🔗 Connecting to database...`);
    const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
        console.log("⚙️ Adding is_gst_bill, is_on_route, workshop_contact_number columns to keil_vehicle_repairs table...");
        
        await client.query(`
            ALTER TABLE keil_vehicle_repairs 
                ADD COLUMN IF NOT EXISTS is_gst_bill BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS is_on_route BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS workshop_contact_number VARCHAR(50) DEFAULT NULL;
        `);
        console.log("✅ Added columns to keil_vehicle_repairs!");

        console.log("🔄 Refreshing PostgREST schema cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");
        
        console.log("🎉 Database schema update completed successfully!");

    } catch (err: any) {
        console.error("❌ Error adding columns:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

addRepairFields();
