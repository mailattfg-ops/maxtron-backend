import { supabase } from './config/supabase';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    console.log('Running KEIL Granular Permission Migration...');
    
    // Instead of raw SQL (unsupported via simple anon supabase), we use upsert
    const perms = [
        { module_name: 'HR', sub_module: 'Branch Registry', permission_key: 'hr_branch_view', description: 'Manage branches and units' },
        { module_name: 'HR', sub_module: 'Expense Heads', permission_key: 'hr_expense_head_view', description: 'Manage expense categories' },
        { module_name: 'HR', sub_module: 'Expenditure Entry', permission_key: 'hr_expenditure_view', description: 'Log daily expenditures' },
        { module_name: 'Production', sub_module: 'HCE Registry', permission_key: 'prod_hce_view', description: 'Manage hospital/clinic entries' },
        { module_name: 'Production', sub_module: 'Route Registry', permission_key: 'prod_route_view', description: 'Define collection routes' },
        { module_name: 'Production', sub_module: 'Route Assignments', permission_key: 'prod_assignment_view', description: 'Map HCEs to routes' },
        { module_name: 'Production', sub_module: 'Collection Entry', permission_key: 'prod_collection_view', description: 'Log daily BMW collections' },
        { module_name: 'Production', sub_module: 'Route Reports', permission_key: 'prod_route_report_view', description: 'View collection analytics' },
        { module_name: 'Production', sub_module: 'HCE Ledger', permission_key: 'prod_ledger_report_view', description: 'View facility-wise ledgers' },
        { module_name: 'Production', sub_module: 'Fleet Master', permission_key: 'fleet_vehicle_view', description: 'Manage vehicle database' },
        { module_name: 'Production', sub_module: 'Vehicle Logs', permission_key: 'fleet_log_view', description: 'Track daily vehicle activity' },
        { module_name: 'Production', sub_module: 'Workshop', permission_key: 'fleet_repair_view', description: 'Manage repairs and maintenance' },
        { module_name: 'Production', sub_module: 'Fleet Reports', permission_key: 'fleet_report_view', description: 'Fleet intelligence and analytics' }
    ];

    const { data, error } = await supabase.from('permissions').upsert(perms, { onConflict: 'permission_key' });
    
    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log('Migration successful: Permissions updated.');
    }
}

runMigration();
