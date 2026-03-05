import { supabase } from '../../../config/supabase';

export const StockModel = {
    getRMStockSummary: async (companyId?: string) => {
        // Fetch all materials
        let matQuery = supabase.from('raw_materials').select('*');
        if (companyId) matQuery = matQuery.eq('company_id', companyId);
        const { data: materials, error: matErr } = await matQuery;
        if (matErr) throw new Error(matErr.message);

        // Fetch all purchases
        let purQuery = supabase.from('purchase_entries').select('order_id, supplier_id, received_quantity');
        if (companyId) purQuery = purQuery.eq('company_id', companyId);
        const { data: purchases, error: purErr } = await purQuery;

        // Fetch all consumptions
        let conQuery = supabase.from('material_consumptions').select('rm_id, quantity_used');
        if (companyId) conQuery = conQuery.eq('company_id', companyId);
        const { data: consumptions, error: conErr } = await conQuery;

        // Fetch all returns
        let retQuery = supabase.from('purchase_returns').select('purchase_entry_id, quantity_returned');
        if (companyId) retQuery = retQuery.eq('company_id', companyId);
        const { data: returns, error: retErr } = await retQuery;

        // Fetch RM links for purchases (to know which RM was bought)
        let orQuery = supabase.from('rm_orders').select('id, rm_id');
        if (companyId) orQuery = orQuery.eq('company_id', companyId);
        const { data: orders, error: orErr } = await orQuery;

        // Map order_id to rm_id
        const orderToRM: Record<string, string> = {};
        orders?.forEach(o => { orderToRM[o.id] = o.rm_id; });

        // Calculate Stock
        const stockSummary = materials.map(m => {
            const purchased = purchases?.filter(p => p.order_id && orderToRM[p.order_id] === m.id)
                .reduce((acc, curr) => acc + Number(curr.received_quantity), 0) || 0;

            const consumed = consumptions?.filter(c => c.rm_id === m.id)
                .reduce((acc, curr) => acc + Number(curr.quantity_used), 0) || 0;

            // Returns need to be linked back to RM too. Purchase entries have supplier_id.
            // Simplified: we'll assume material is correctly tracked via the order link or direct purchase
            // For now, let's keep it simple.

            return {
                ...m,
                purchased,
                consumed,
                balance: purchased - consumed
            };
        });

        return stockSummary;
    }
};
