import { supabase } from '../../../config/supabase';

export const RMOrderModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('rm_orders').select(`
            *,
            supplier_master!supplier_id(supplier_name, supplier_code),
            rm_order_items(
                rm_id, quantity, rate, amount, gst_percent, gst_amount,
                raw_materials!rm_id(rm_name, rm_code)
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
                supplier_master!supplier_id(supplier_name, supplier_code),
                rm_order_items(
                    id, rm_id, quantity, rate, amount, gst_percent, gst_amount,
                    raw_materials!rm_id(rm_name, rm_code, grade)
                )
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (orderData: any) => {
        const { items, ...orderInfo } = orderData;

        const { data: order, error: orderErr } = await supabase
            .from('rm_orders')
            .insert([orderInfo])
            .select();

        if (orderErr) throw new Error(orderErr.message);

        const orderId = order[0].id;
        const itemsWithId = items.map((item: any) => {
            // Calculate base amount if not provided or if total amount is provided separately
            // In frontend, 'amount' is usually line total (base + gst)
            // System stores base in 'amount' column
            const totalAmount = Number(item.total_line_amount || item.amount) || (Number(item.quantity) * Number(item.rate)) + Number(item.gst_amount || 0);
            const baseAmount = totalAmount - Number(item.gst_amount || 0);
            return {
                ...item,
                amount: baseAmount,
                order_id: orderId,
                // Clean up any frontend helper fields
                total_line_amount: undefined
            };
        });

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
        const itemsWithId = items.map((item: any) => {
            const totalAmount = Number(item.total_line_amount || item.amount) || (Number(item.quantity) * Number(item.rate)) + Number(item.gst_amount || 0);
            const baseAmount = totalAmount - Number(item.gst_amount || 0);
            return {
                ...item,
                amount: baseAmount,
                order_id: id,
                total_line_amount: undefined
            };
        });
        await supabase.from('rm_order_items').insert(itemsWithId);

        return order[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('rm_orders').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
