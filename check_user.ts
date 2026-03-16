
import { supabase } from './src/config/supabase';

async function checkUserSpecific() {
    const { data: user, error } = await supabase
        .from('users')
        .select('username, category_id, company_id')
        .eq('username', 'sssj@gmail.com')
        .single();
    
    if (error) {
        console.log('DB_ERROR:' + JSON.stringify(error));
        return;
    }
    console.log('RESULT:' + JSON.stringify(user));

    const { data: cats } = await supabase.from('employee_categories').select('*');
    console.log('CATEGORIES:' + JSON.stringify(cats));
}

checkUserSpecific();
