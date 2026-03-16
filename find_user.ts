
import { supabase } from './src/config/supabase';

async function findUserWithCategory() {
    const { data, error } = await supabase
        .from('users')
        .select('username, category_id')
        .not('category_id', 'is', null)
        .limit(1);
    
    if (error) {
        console.log('Error:', error);
    } else {
        console.log('User found:', data);
    }
}

findUserWithCategory();
