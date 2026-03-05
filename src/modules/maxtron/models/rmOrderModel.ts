import { supabase } from '../../../config/supabase';

export const RMOrderModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('rm_orders').select(`
            *,
            supplier_master(supplier_name, supplier_code),
            rm_order_items(
                rm_id, quantity, rate, amount,
                raw_materials(rm_name, rm_code)
            )
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('rm_orders')
            .select(`
                *,
                supplier_master(supplier_name, supplier_code),
                rm_order_items(
                    id, rm_id, quantity, rate, amount,
                    raw_materials(rm_name, rm_code, grade)
                )
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (orderData: any) => {
        const { items, ...orderInfo } = orderData;

        // Start transaction (Supabase doesn't have native client-side tx yet, using RPC or sequential)
        const { data: order, error: orderErr } = await supabase
            .from('rm_orders')
            .insert([orderInfo])
            .select();

        if (orderErr) throw new Error(orderErr.message);

        const orderId = order[0].id;
        const itemsWithId = items.map((item: any) => ({ ...item, order_id: orderId }));

        const { error: itemsErr } = await supabase.from('rm_order_items').insert(itemsWithId);
        if (itemsErr) throw new Error(itemsErr.message);

        return order[0];
    },

    update: async (id: string, orderData: any) => {
        const { items, ...orderInfo } = orderData;

        const { data: order, error: orderErr } = await supabase
            .from('rm_orders')
            .update(orderInfo)
            .eq('id', id)
            .select();

        if (orderErr) throw new Error(orderErr.message);

        // Replace items
        await supabase.from('rm_order_items').delete().eq('order_id', id);
        const itemsWithId = items.map((item: any) => ({ ...item, order_id: id }));
        await supabase.from('rm_order_items').insert(itemsWithId);

        return order[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('rm_orders').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
