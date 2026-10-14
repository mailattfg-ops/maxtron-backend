import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';

const connectionString = 'postgresql://postgres.jylkzihuozugqfjqvhhe:ccRzE_%5EUsVBAd8*@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'keil_collection_headers' ORDER BY ordinal_position;");
    console.log("COLLECTION_COLUMNS:", JSON.stringify(res.rows));
  } catch (err: any) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

main();
