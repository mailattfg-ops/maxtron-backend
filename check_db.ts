
import { supabase } from './src/config/supabase';

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('id, username, category_id, company_id');
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    console.log('Users in DB:');
    console.table(data);
}

checkUsers();
