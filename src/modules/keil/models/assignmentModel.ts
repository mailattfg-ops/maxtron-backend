import { supabase } from '../../../config/supabase';

export const AssignmentModel = {
    getRouteAssignments: async (routeId: string) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .select(`
                *,
                keil_hces (hce_name, hce_code, address, hce_place, collection_type)
            `)
            .eq('route_id', routeId)
            .order('sequence_order');

        if (error) throw new Error(error.message);
        return data || [];
    },

    assignHce: async (assignmentData: any) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .insert([assignmentData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    removeHce: async (id: string) => {
        const { error } = await supabase.from('keil_route_assignments').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    updateOrder: async (id: string, orderNo: number) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .update({ sequence_order: orderNo })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    updateAssignment: async (id: string, updates: any) => {
        const { data, error } = await supabase
            .from('keil_route_assignments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
};
