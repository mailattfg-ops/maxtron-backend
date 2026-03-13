import { supabase } from './src/config/supabase';
import dotenv from 'dotenv';
dotenv.config();

async function checkDashboard() {
    const cId = '739f66c9-4f5a-428f-984e-ac9e2e689b59'; // Example Maxtron ID
    const { data, error } = await supabase.from('production_batches').select('batch_number, extrusion_output_qty, date, finished_products(product_name)').eq('company_id', cId).limit(5);
    
    console.log('Error:', error);
    console.log('Data:', JSON.stringify(data, null, 2));
}

checkDashboard();
