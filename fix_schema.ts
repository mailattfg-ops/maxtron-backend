import { supabase } from './src/config/supabase';

async function fixSchema() {
    const sql = `
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_batches' AND column_name = 'consumption_id') THEN
        ALTER TABLE production_batches ADD COLUMN consumption_id UUID REFERENCES material_consumptions(id);
      END IF;
      NOTIFY pgrst, 'reload schema';
    END $$;
  `;

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('Error fixing schema:', error);
    } else {
        console.log('Schema fix run successfully.');
    }
}

fixSchema();
