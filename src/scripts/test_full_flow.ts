import { SupplierModel } from '../modules/maxtron/models/supplierModel';

async function testUpdate() {
    try {
        console.log('Testing Supplier Update with Materials...');
        // Get first supplier
        const suppliers = await SupplierModel.getAll();
        if (suppliers.length === 0) {
            console.log('No suppliers found.');
            return;
        }
        const sid = suppliers[0].id;

        // Get first material
        const { supabase } = require('../../../config/supabase');
        const { data: materials } = await supabase.from('raw_materials').select('id').limit(1);
        if (!materials || materials.length === 0) {
            console.log('No materials found.');
            return;
        }
        const mid = materials[0].id;

        console.log(`Updating Supplier ${sid} with Material ${mid}`);
        const result = await SupplierModel.update(sid, {
            ...suppliers[0],
            supplied_materials: [mid]
        });
        console.log('Update result:', result);

        // Verify
        const updated = await SupplierModel.getById(sid);
        // console.log('Verification Join Results:', updated?.supplied_materials);
    } catch (err) {
        console.error('Error:', err);
    }
}

testUpdate();
