import { supabase } from '../../../config/supabase';

export const BranchModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('keil_branches').select('*');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('branch_name');
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase.from('keil_branches').select('*').eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (data: any) => {
        const { data: res, error } = await supabase.from('keil_branches').insert([data]).select().single();
        if (error) throw new Error(error.message);
        return res;
    },

    update: async (id: string, data: any) => {
        const { data: res, error } = await supabase.from('keil_branches').update(data).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return res;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('keil_branches').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
