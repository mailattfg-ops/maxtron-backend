import { supabase } from '../../../config/supabase';

export const ConsumptionModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('material_consumptions').select(`
            *,
            raw_materials!rm_id(rm_name, rm_code, unit_type),
            issuer:users!issued_by(name)
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('consumption_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('material_consumptions')
            .select(`
                *,
                raw_materials!rm_id(rm_name, rm_code, grade),
                issuer:users!issued_by(name)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (consumptionData: any) => {
        const { data, error } = await supabase
            .from('material_consumptions')
            .insert([consumptionData])
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    update: async (id: string, consumptionData: any) => {
        const { data, error } = await supabase
            .from('material_consumptions')
            .update(consumptionData)
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('material_consumptions').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
