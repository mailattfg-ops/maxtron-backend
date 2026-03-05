import { supabase } from '../../../config/supabase';

export const PurchaseEntryModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('purchase_entries').select(`
            *,
            supplier_master(supplier_name, supplier_code),
            rm_orders(order_number),
            purchase_entry_items(
                rm_id, received_quantity, rate, amount,
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
            .from('purchase_entries')
            .select(`
                *,
                supplier_master(supplier_name, supplier_code),
                rm_orders(order_number, order_date),
                purchase_entry_items(
                    id, rm_id, ordered_quantity, received_quantity, rate, amount,
                    raw_materials(rm_name, rm_code)
                )
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (entryData: any) => {
        const { items, ...entryInfo } = entryData;

        const { data: entry, error: entryErr } = await supabase
            .from('purchase_entries')
            .insert([entryInfo])
            .select();

        if (entryErr) throw new Error(entryErr.message);

        const entryId = entry[0].id;
        const itemsWithId = items.map((item: any) => ({ ...item, entry_id: entryId }));

        const { error: itemsErr } = await supabase.from('purchase_entry_items').insert(itemsWithId);
        if (itemsErr) throw new Error(itemsErr.message);

        // Update main order status if linked and all items received (simplified)
        if (entryInfo.order_id) {
            await supabase.from('rm_orders').update({ status: 'RECEIVED' }).eq('id', entryInfo.order_id);
        }

        return entry[0];
    },

    update: async (id: string, entryData: any) => {
        const { items, ...entryInfo } = entryData;

        const { data: entry, error: entryErr } = await supabase
            .from('purchase_entries')
            .update(entryInfo)
            .eq('id', id)
            .select();

        if (entryErr) throw new Error(entryErr.message);

        await supabase.from('purchase_entry_items').delete().eq('entry_id', id);
        const itemsWithId = items.map((item: any) => ({ ...item, entry_id: id }));
        await supabase.from('purchase_entry_items').insert(itemsWithId);

        return entry[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('purchase_entries').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
