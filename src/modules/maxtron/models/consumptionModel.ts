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
        const { rm_id, quantity_used, company_id } = consumptionData;

        // 1. Calculate Purchased Quantity for this RM
        const { data: purchaseItems, error: purErr } = await supabase
            .from('purchase_entry_items')
            .select('received_quantity, purchase_entries!inner(company_id)')
            .eq('rm_id', rm_id)
            .eq('purchase_entries.company_id', company_id);

        if (purErr) throw new Error(purErr.message);

        const totalPurchased = purchaseItems?.reduce((acc, curr) => acc + Number(curr.received_quantity || 0), 0) || 0;

        // 2. Calculate Consumed Quantity for this RM
        const { data: consumptions, error: conErr } = await supabase
            .from('material_consumptions')
            .select('quantity_used')
            .eq('rm_id', rm_id)
            .eq('company_id', company_id);

        if (conErr) throw new Error(conErr.message);

        const totalConsumed = consumptions?.reduce((acc, curr) => acc + Number(curr.quantity_used || 0), 0) || 0;

        // 3. Check Stock
        const currentStock = totalPurchased - totalConsumed;

        if (quantity_used > currentStock) {
            throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${quantity_used}`);
        }

        const { data, error } = await supabase
            .from('material_consumptions')
            .insert([consumptionData])
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    },

    update: async (id: string, consumptionData: any) => {
        const { rm_id, quantity_used, company_id } = consumptionData;

        // 1. Get original record to find difference
        const { data: original, error: getErr } = await supabase
            .from('material_consumptions')
            .select('quantity_used, rm_id')
            .eq('id', id)
            .single();

        if (getErr) throw new Error(getErr.message);

        // 2. Fetch Stock (excluding this record's contribution to consumption)
        const { data: purchaseItems, error: purErr } = await supabase
            .from('purchase_entry_items')
            .select('received_quantity, purchase_entries!inner(company_id)')
            .eq('rm_id', rm_id)
            .eq('purchase_entries.company_id', company_id);

        if (purErr) throw new Error(purErr.message);
        const totalPurchased = purchaseItems?.reduce((acc, curr) => acc + Number(curr.received_quantity || 0), 0) || 0;

        const { data: consumptions, error: conErr } = await supabase
            .from('material_consumptions')
            .select('quantity_used')
            .eq('rm_id', rm_id)
            .eq('company_id', company_id)
            .neq('id', id); // EXCLUDE CURRENT RECORD

        if (conErr) throw new Error(conErr.message);
        const otherConsumed = consumptions?.reduce((acc, curr) => acc + Number(curr.quantity_used || 0), 0) || 0;

        const currentAvailable = totalPurchased - otherConsumed;

        if (quantity_used > currentAvailable) {
            throw new Error(`Insufficient stock for update. Available: ${currentAvailable}, Requested: ${quantity_used}`);
        }

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
