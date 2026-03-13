import { supabase } from './src/config/supabase';
import dotenv from 'dotenv';
dotenv.config();

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'production_batches' });
    if (error) {
        // If RPC doesn't exist, try a simple query
        const { data: cols, error: colErr } = await supabase
            .from('production_batches')
            .select('*')
            .limit(1);

        if (colErr) {
            console.error('Error fetching columns:', colErr);
        } else if (cols && cols.length > 0) {
            console.log('Columns found:', Object.keys(cols[0]));
        } else {
            console.log('Table is empty, cannot detect columns via select *');
        }
    } else {
        console.log('Columns:', data);
    }
}

checkColumns();
