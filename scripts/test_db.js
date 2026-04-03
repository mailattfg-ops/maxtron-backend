require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    try {
        const { data, error } = await supabase.rpc('get_column_names', { table_name: 'keil_collection_headers' });
        // Since get_column_names might not exist, we'll just try to select something
        const { data: testData, error: testError } = await supabase.from('keil_collection_headers').select('*').limit(1);
        if (testError) {
            console.error('Error selecting from table:', testError);
        } else {
            console.log('Columns found:', Object.keys(testData[0] || {}));
        }
    } catch (err) {
        console.error('Catch error:', err);
    }
}

checkColumns();
