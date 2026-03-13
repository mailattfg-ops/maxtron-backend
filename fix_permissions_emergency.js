const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const permissions = [
    { module_name: 'Dashboard', sub_module: null, permission_key: 'dashboard_view', description: 'View Dashboard metrics' },
    { module_name: 'HR', sub_module: null, permission_key: 'hr_view', description: 'Access HR & Administration Group' },
    { module_name: 'HR', sub_module: 'Employee Information', permission_key: 'hr_employee_view', description: 'View employee records' },
    { module_name: 'HR', sub_module: 'Company Information', permission_key: 'hr_company_view', description: 'View company details' },
    { module_name: 'HR', sub_module: 'Attendance', permission_key: 'hr_attendance_view', description: 'View attendance logs' },
    { module_name: 'HR', sub_module: 'Marketing', permission_key: 'hr_marketing_view', description: 'View marketing visits' },
    { module_name: 'Inventory', sub_module: null, permission_key: 'inv_view', description: 'Access Inventory & Procurement Group' },
    { module_name: 'Inventory', sub_module: 'Raw Material', permission_key: 'inv_rm_view', description: 'Manage raw material registry' },
    { module_name: 'Inventory', sub_module: 'Suppliers', permission_key: 'inv_supplier_view', description: 'Manage supplier information' },
    { module_name: 'Inventory', sub_module: 'Orders', permission_key: 'inv_order_view', description: 'Issue purchase orders' },
    { module_name: 'Inventory', sub_module: 'Purchase', permission_key: 'inv_purchase_view', description: 'Log purchase entries and returns' },
    { module_name: 'Inventory', sub_module: 'Consumption', permission_key: 'inv_consumption_view', description: 'Track material consumption' },
    { module_name: 'Production', sub_module: null, permission_key: 'prod_view', description: 'Access Production MES Group' },
    { module_name: 'Production', sub_module: 'Products', permission_key: 'prod_product_view', description: 'View product details and wastage' },
    { module_name: 'Production', sub_module: 'Extrusion', permission_key: 'prod_extrusion_view', description: 'Manage extrusion production' },
    { module_name: 'Production', sub_module: 'Cutting', permission_key: 'prod_cutting_view', description: 'Manage cutting and sealing' },
    { module_name: 'Production', sub_module: 'Packing', permission_key: 'prod_packing_view', description: 'Manage packing logs' },
    { module_name: 'Sales', sub_module: null, permission_key: 'sales_view', description: 'Access Sales & Logistics Group' },
    { module_name: 'Sales', sub_module: 'Customers', permission_key: 'sales_customers_view', description: 'Manage customer database' },
    { module_name: 'Sales', sub_module: 'Vehicles', permission_key: 'sales_vehicles_view', description: 'Manage fleet information' },
    { module_name: 'Sales', sub_module: 'Orders', permission_key: 'sales_orders_view', description: 'Manage sales orders and delivery' },
    { module_name: 'Sales', sub_module: 'Invoice', permission_key: 'sales_invoice_view', description: 'Manage billing and sales returns' },
    { module_name: 'Finance', sub_module: null, permission_key: 'fin_view', description: 'Access Finance & Accounts Group' },
    { module_name: 'Finance', sub_module: 'Collection', permission_key: 'fin_collection_view', description: 'Track customer collections' },
    { module_name: 'Finance', sub_module: 'Payment', permission_key: 'fin_payment_view', description: 'Track supplier payments' },
    { module_name: 'Finance', sub_module: 'Petty Cash', permission_key: 'fin_petty_cash_view', description: 'Track petty cash entries' },
    { module_name: 'System', sub_module: 'Admin', permission_key: 'admin_permissions', description: 'Access to Permission Console' }
];

async function fixPermissions() {
    console.log('--- Cleaning/Populating permissions table ---');
    
    // UPSERT all permissions
    const { error: pError } = await supabase.from('permissions').upsert(permissions, { onConflict: 'permission_key' });
    if (pError) {
        console.error('Error upserting permissions:', pError);
        return;
    }
    console.log('✅ Standardized permissions populated.');

    // Ensure admin role has all permissions enabled
    const { data: roles, error: rError } = await supabase.from('user_types').select('id').eq('name', 'admin').single();
    if (rError || !roles) {
        console.error('Admin role not found:', rError);
        return;
    }

    const adminId = roles.id;
    const adminPerms = permissions.map(p => ({
        role_id: adminId,
        permission_key: p.permission_key,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true
    }));

    const { error: rpError } = await supabase.from('role_permissions').upsert(adminPerms, { onConflict: 'role_id,permission_key' });
    if (rpError) {
        console.error('Error granting permissions to admin:', rpError);
        return;
    }
    console.log('✅ Admin permissions synchronized.');
}

fixPermissions();
