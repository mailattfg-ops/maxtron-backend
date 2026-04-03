const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
});

async function fixTable() {
    try {
        await client.connect();
        
        console.log('Creating table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.keil_fuel_filling (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                created_at TIMESTAMPTZ DEFAULT now(),
                company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
                log_date DATE NOT NULL,
                vehicle_id UUID REFERENCES public.keil_vehicles(id) ON DELETE CASCADE,
                indent_number TEXT,
                liters DECIMAL(12, 2) DEFAULT 0,
                rate DECIMAL(12, 2) DEFAULT 0,
                amount DECIMAL(12, 2) DEFAULT 0,
                efficiency DECIMAL(12, 2) DEFAULT 0,
                difference DECIMAL(12, 2) DEFAULT 0,
                remarks TEXT
            );
        `);

        console.log('Enabling RLS...');
        await client.query(`ALTER TABLE public.keil_fuel_filling ENABLE ROW LEVEL SECURITY;`);

        console.log('Creating policy...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'keil_fuel_filling' AND policyname = 'Allow all on fuel_filling'
                ) THEN
                    CREATE POLICY "Allow all on fuel_filling" ON public.keil_fuel_filling FOR ALL USING (true);
                END IF;
            END
            $$;
        `);

        console.log('Table fixed successfully.');
    } catch (err) {
        console.error('Error fixing table:', err);
    } finally {
        await client.end();
    }
}

fixTable();
