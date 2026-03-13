import { supabase } from '../../../config/supabase';

export const PurchaseReturnModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('purchase_returns').select(`
            *,
            supplier_master!supplier_id(supplier_name, supplier_code),
            purchase_entries!purchase_entry_id(entry_number, goods_receipt_no:entry_number)
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('return_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('purchase_returns')
            .select(`
                *,
                supplier_master!supplier_id(supplier_name, supplier_code),
                purchase_entries!purchase_entry_id(entry_number, entry_date)
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (returnData: any) => {
        const { data, error } = await supabase
            .from('purchase_returns')
            .insert([returnData])
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    update: async (id: string, returnData: any) => {
        const { data, error } = await supabase
            .from('purchase_returns')
            .update(returnData)
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('purchase_returns').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
