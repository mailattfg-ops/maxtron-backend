-- Granular Permissions for KEIL
INSERT INTO public.permissions (module_name, sub_module, permission_key, description)
VALUES 
    -- HR Granular
    ('HR', 'Branch Registry', 'hr_branch_view', 'Manage branches and units'),
    ('HR', 'Expense Heads', 'hr_expense_head_view', 'Manage expense categories'),
    ('HR', 'Expenditure Entry', 'hr_expenditure_view', 'Log daily expenditures'),
    
    -- Operations Granular
    ('Production', 'HCE Registry', 'prod_hce_view', 'Manage hospital/clinic entries'),
    ('Production', 'Route Registry', 'prod_route_view', 'Define collection routes'),
    ('Production', 'Route Assignments', 'prod_assignment_view', 'Map HCEs to routes'),
    ('Production', 'Collection Entry', 'prod_collection_view', 'Log daily BMW collections'),
    ('Production', 'Route Reports', 'prod_route_report_view', 'View collection analytics'),
    ('Production', 'HCE Ledger', 'prod_ledger_report_view', 'View facility-wise ledgers'),
    
    -- Fleet Granular
    ('Production', 'Fleet Master', 'fleet_vehicle_view', 'Manage vehicle database'),
    ('Production', 'Vehicle Logs', 'fleet_log_view', 'Track daily vehicle activity'),
    ('Production', 'Workshop', 'fleet_repair_view', 'Manage repairs and maintenance'),
    ('Production', 'Fleet Reports', 'fleet_report_view', 'Fleet intelligence and analytics')
ON CONFLICT (permission_key) DO NOTHING;
