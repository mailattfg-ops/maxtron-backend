
import { supabase } from './src/config/supabase';

async function checkData() {
    const { data: categories } = await supabase.from('employee_categories').select('*');
    console.log('Categories:', categories);
    
    const { data: users } = await supabase.from('users').select('username, category_id').limit(5);
    console.log('Users Category Check:', users);
}

checkData();
