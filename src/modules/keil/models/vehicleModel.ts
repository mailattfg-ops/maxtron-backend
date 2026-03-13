import { supabase } from '../../../config/supabase';

export const VehicleModel = {
    getAll: async (companyId: string) => {
        const { data, error } = await supabase
            .from('keil_vehicles')
            .select('*')
            .eq('company_id', companyId)
            .order('registration_number', { ascending: true });
        if (error) throw error;
        return data;
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('keil_vehicles')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    create: async (payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicles')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id: string, payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicles')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('keil_vehicles')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }
};
