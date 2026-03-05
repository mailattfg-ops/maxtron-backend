import { SupplierModel } from './modules/maxtron/models/supplierModel';

async function run() {
    try {
        console.log("Trying to create supplier...");
        const res = await SupplierModel.create({
            supplier_code: 'TEST-05',
            supplier_name: 'TEST DIRECT 5'
        });
        console.log("Success:", res);
    } catch (err: any) {
        console.error("Error creating:", err.message);
    }
}
run();
