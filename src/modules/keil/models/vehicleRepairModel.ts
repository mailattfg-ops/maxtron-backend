import { supabase } from '../../../config/supabase';

export const VehicleRepairModel = {
    getAll: async (companyId: string, vehicleId?: string) => {
        let query = supabase
            .from('keil_vehicle_repairs')
            .select(`
                *,
                vehicle:vehicle_id(registration_number),
                mechanic:mechanic_id(name),
                driver:driver_id(name),
                route:route_id(
                    route_name,
                    route_code,
                    company:company_id(company_name)
                )
            `)
            .eq('company_id', companyId)
            .order('entry_date', { ascending: false });

        if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    create: async (payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicle_repairs')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    update: async (id: string, payload: any) => {
        const { data, error } = await supabase
            .from('keil_vehicle_repairs')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('keil_vehicle_repairs')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }
};
