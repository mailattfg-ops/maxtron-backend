const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermissions() {
  const { data, error } = await supabase.from('permissions').select('permission_key');
  if (error) {
    console.error('Error fetching permissions:', error);
    process.exit(1);
  }
  console.log('--- Permissions in Database ---');
  data.forEach(p => console.log(p.permission_key));
  console.log('-------------------------------');
}

checkPermissions();
