import { supabase } from '../../../config/supabase';

export const AttendanceModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('attendance').select(`
            *,
            users(
                name, 
                employee_code,
                category_id,
                user_types(name)
            )
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    create: async (attendanceData: any) => {
        const { data, error } = await supabase
            .from('attendance')
            .insert([attendanceData])
            .select();
        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    },

    createBulk: async (attendanceList: any[]) => {
        const { data, error } = await supabase
            .from('attendance')
            .insert(attendanceList)
            .select();
        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, attendanceData: any) => {
        const { data, error } = await supabase
            .from('attendance')
            .update(attendanceData)
            .eq('id', id)
            .select();
        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('attendance')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    getByDate: async (date: string, companyId?: string) => {
        let query = supabase.from('attendance').select(`
            *,
            users(
                name, 
                employee_code,
                category_id,
                user_types(name)
            )
        `).eq('date', date);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
    },

    getByDateRange: async (startDate: string, endDate: string, companyId?: string) => {
        let query = supabase.from('attendance').select(`
            *,
            users(
                name, 
                employee_code,
                category_id,
                user_types(name)
            )
        `).gte('date', startDate).lte('date', endDate);

        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    isDuplicate: async (employeeId: string, date: string, companyId: string) => {
        const { data, error } = await supabase
            .from('attendance')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('date', date)
            .eq('company_id', companyId)
            .limit(1);
        if (error) throw new Error(error.message);
        return data && data.length > 0;
    }
};

