import { supabase } from '../config/supabase';

async function checkApi() {
    const { data, error } = await supabase.from('attendance').select('*, users(name)');
    if (error) {
        console.error(error);
    } else {
        console.log("RECORDS FROM SUPABASE CLIENT:");
        console.log(JSON.stringify(data, null, 2));
    }
}
checkApi();
