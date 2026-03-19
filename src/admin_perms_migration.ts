import { supabase } from './config/supabase';

async function addMissingPermissions() {
    console.log('Adding missing KEIL Parent & System Permissions...');
    
    const perms = [
        // Parent Modules
        { module_name: 'Core', sub_module: 'Dashboard', permission_key: 'dashboard_view', description: 'Access to KEIL Dashboard' },
        { module_name: 'HR', sub_module: 'Main Module', permission_key: 'hr_view', description: 'Parent access to HR module' },
        { module_name: 'Production', sub_module: 'Main Module', permission_key: 'prod_view', description: 'Parent access to Operations module' },
        { module_name: 'Fleet', sub_module: 'Main Module', permission_key: 'fleet_view', description: 'Parent access to Fleet module' },
        
        // Missing Sub-modules found in sidebar
        { module_name: 'HR', sub_module: 'Employee Management', permission_key: 'hr_employee_view', description: 'Manage staff and workers' },
        { module_name: 'HR', sub_module: 'Company Info', permission_key: 'hr_company_view', description: 'View and edit company profile' },
        { module_name: 'HR', sub_module: 'Attendance', permission_key: 'hr_attendance_view', description: 'Track work hours and logs' },
        { module_name: 'HR', sub_module: 'Payroll', permission_key: 'hr_payroll_view', description: 'Manage salaries and payouts' },
        
        // System Admin
        { module_name: 'Admin', sub_module: 'Settings', permission_key: 'admin_permissions', description: 'Manage system settings and roles' }
    ];

    const { data, error } = await supabase.from('permissions').upsert(perms, { onConflict: 'permission_key' });
    
    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log('Migration successful: Missing permissions added.');
    }
}

addMissingPermissions();
