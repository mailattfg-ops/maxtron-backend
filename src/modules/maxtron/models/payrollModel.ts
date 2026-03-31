import { supabase } from '../../../config/supabase';

export const PayrollModel = {
    getAll: async (companyId?: string, month?: number, year?: number) => {
        let query = supabase.from('employee_payroll').select(`
            *,
            users:employee_id(name, employee_code, category_id, employee_categories(category_name))
        `);
        
        if (companyId) query = query.eq('company_id', companyId);
        if (month) query = query.eq('month', month);
        if (year) query = query.eq('year', year);

        const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('employee_payroll')
            .select(`
                *,
                users:employee_id(name, employee_code)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (payrollData: any) => {
        const { data, error } = await supabase
            .from('employee_payroll')
            .upsert(payrollData, { onConflict: 'employee_id,month,year' })
            .select();
        if (error) throw new Error(error.message);
        return data[0];
    },

    update: async (id: string, payrollData: any) => {
        const { data, error } = await supabase
            .from('employee_payroll')
            .update(payrollData)
            .eq('id', id)
            .select();
        if (error) throw new Error(error.message);
        return data[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('employee_payroll').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
