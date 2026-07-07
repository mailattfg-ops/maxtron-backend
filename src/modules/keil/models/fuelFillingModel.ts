import { supabase } from '../../../config/supabase';

export class FuelFillingModel {
    static async getAll(filters: any) {
        let query = supabase
            .from('keil_fuel_filling')
            .select(`
                *,
                vehicle:keil_vehicles!keil_fuel_filling_vehicle_id_fkey(registration_number),
                company:companies!keil_fuel_filling_company_id_fkey(company_name)
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

    static sanitize(data: any) {
        const {
            company_id,
            log_date,
            vehicle_id,
            indent_number,
            liters,
            rate,
            amount,
            efficiency,
            difference,
            remarks,
            pump_details
        } = data;

        const clean: any = {};
        if (company_id !== undefined) clean.company_id = company_id;
        if (log_date !== undefined) clean.log_date = log_date;
        if (vehicle_id !== undefined) clean.vehicle_id = vehicle_id;
        if (indent_number !== undefined) clean.indent_number = indent_number;
        if (liters !== undefined) clean.liters = liters === '' ? null : liters;
        if (rate !== undefined) clean.rate = rate === '' ? null : rate;
        if (amount !== undefined) clean.amount = amount === '' ? null : amount;
        if (efficiency !== undefined) clean.efficiency = efficiency === '' ? null : efficiency;
        if (difference !== undefined) clean.difference = difference === '' ? null : difference;
        if (remarks !== undefined) clean.remarks = remarks;
        if (pump_details !== undefined) clean.pump_details = pump_details;
        return clean;
    }

    static async create(data: any) {
        const cleanData = FuelFillingModel.sanitize(data);
        const { data: result, error } = await supabase
            .from('keil_fuel_filling')
            .insert([cleanData])
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    static async update(id: string, data: any) {
        const cleanData = FuelFillingModel.sanitize(data);
        const { data: result, error } = await supabase
            .from('keil_fuel_filling')
            .update(cleanData)
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
