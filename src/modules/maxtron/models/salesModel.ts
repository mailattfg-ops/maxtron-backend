import { supabase } from '../../../config/supabase';

export const SalesModel = {
    getOrders: async (companyId: string) => {
        const { data, error } = await supabase
            .from('customer_orders')
            .select(`
                *,
                customers(customer_name, customer_code),
                executive:users!executive_id(name),
                items:customer_order_items(
                    *,
                    finished_products(product_name, product_code)
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    createOrder: async (orderData: any) => {
        const { items, ...header } = orderData;

        // Sanitize header UUIDs
        const sanitizedHeader = { ...header };
        ['customer_id', 'executive_id', 'company_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { data, error } = await supabase
            .from('customer_orders')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const { value, ...rest } = item;
                const sanitizedItem = { ...rest, order_id: data.id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                return sanitizedItem;
            });

            const { error: itemError } = await supabase
                .from('customer_order_items')
                .insert(itemsToInsert);

            if (itemError) throw new Error(itemError.message);
        }

        return data;
    },

    updateOrder: async (id: string, orderData: any) => {
        const { items, ...header } = orderData;

        // Update header
        const { error: headerError } = await supabase
            .from('customer_orders')
            .update(header)
            .eq('id', id);

        if (headerError) throw new Error(headerError.message);

        // Update items (Delete and Re-insert is simplest for ACID compliance here)
        if (items) {
            await supabase.from('customer_order_items').delete().eq('order_id', id);

            if (items.length > 0) {
                const itemsToInsert = items.map((item: any) => {
                    const { value, ...rest } = item;
                    const sanitizedItem = { ...rest, order_id: id };
                    if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                    return sanitizedItem;
                });

                const { error: itemError } = await supabase
                    .from('customer_order_items')
                    .insert(itemsToInsert);

                if (itemError) throw new Error(itemError.message);
            }
        }

        return true;
    },

    deleteOrder: async (id: string) => {
        const { error } = await supabase
            .from('customer_orders')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }
};
