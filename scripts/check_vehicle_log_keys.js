const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkCols() {
    try {
        const { data, error } = await supabase.from('keil_vehicle_logs').select('*').limit(1);
        if (error) throw error;
        console.log('keil_vehicle_logs sample keys:', Object.keys(data[0] || {}));
    } catch (err) {
        console.error('Error checking columns:', err);
    }
}

checkCols();
