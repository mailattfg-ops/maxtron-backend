
import { supabase } from './src/config/supabase';

async function assignCategory() {
    // 1. Get first category
    const { data: cats } = await supabase.from('employee_categories').select('id').limit(1);
    if (!cats || cats.length === 0) {
        console.log('No categories found to assign.');
        return;
    }
    const catId = cats[0].id;

    // 2. Assign to the user
    const { error } = await supabase
        .from('users')
        .update({ category_id: catId })
        .eq('username', 'sssj@gmail.com');
    
    if (error) {
        console.log('Error updating:', error);
    } else {
        console.log(`Successfully assigned category ${catId} to sssj@gmail.com`);
    }
}

assignCategory();
