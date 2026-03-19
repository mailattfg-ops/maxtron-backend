import { supabase } from './config/supabase';

async function dumpPerms() {
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

dumpPerms();
