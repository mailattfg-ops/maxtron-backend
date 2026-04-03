import { supabase } from '../../../config/supabase';

export class FuelFillingModel {
    static async getAll(filters: any) {
        let query = supabase
            .from('keil_fuel_filling')
            .select(`
                *,
                vehicle:keil_vehicles(registration_number),
                company:companies(company_name)
            `)
            .order('log_date', { ascending: false });

        if (filters.company_id) query = query.eq('company_id', filters.company_id);
        if (filters.vehicle_id && filters.vehicle_id !== 'all') query = query.eq('vehicle_id', filters.vehicle_id);
        if (filters.from) query = query.gte('log_date', filters.from);
        if (filters.to) query = query.lte('log_date', filters.to);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    static async create(data: any) {
        const { data: result, error } = await supabase
            .from('keil_fuel_filling')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    static async update(id: string, data: any) {
        const { data: result, error } = await supabase
            .from('keil_fuel_filling')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    static async delete(id: string) {
        const { error } = await supabase
            .from('keil_fuel_filling')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
