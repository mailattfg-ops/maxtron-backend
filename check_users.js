const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://tyqyefbonftizfbupmzy.supabase.co', 'sb_publishable_G4AA3FIce_Tgu_KKgUM00Q_iaK1W3qK');
s.from('users').select('*').then(r => {
    console.log('USERS:', JSON.stringify(r.data, null, 2));
    process.exit(0);
});
