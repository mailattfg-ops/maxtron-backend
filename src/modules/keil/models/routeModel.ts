import { supabase } from '../../../config/supabase';

export const RouteModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('keil_routes').select('*, company:company_id(company_name)');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query.order('route_name');
        if (error) throw new Error(error.message);
        return (data || []).map(r => ({
            ...r,
            branch_name: r.company?.company_name
        }));
    },

    getById: async (id: string) => {
        const { data, error } = await supabase.from('keil_routes').select('*, company:company_id(company_name)').eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (routeData: any) => {
        const { data, error } = await supabase.from('keil_routes').insert([routeData]).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    update: async (id: string, routeData: any) => {
        const { data, error } = await supabase.from('keil_routes').update(routeData).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('keil_routes').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
