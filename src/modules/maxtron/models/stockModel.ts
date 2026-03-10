import { supabase } from '../../../config/supabase';

export const StockModel = {
    getRMStockSummary: async (companyId?: string) => {
        // Fetch all materials
        let matQuery = supabase.from('raw_materials').select('*');
        if (companyId) matQuery = matQuery.eq('company_id', companyId);
        const { data: materials, error: matErr } = await matQuery;
        if (matErr) throw new Error(matErr.message);

        // Fetch all purchase items properly linked to their entries
        let purQuery = supabase.from('purchase_entry_items').select('rm_id, received_quantity, purchase_entries!inner(company_id)');
        if (companyId) purQuery = purQuery.eq('purchase_entries.company_id', companyId);
        const { data: purchaseItems, error: purErr } = await purQuery;

        // Fetch all consumptions
        let conQuery = supabase.from('material_consumptions').select('rm_id, quantity_used');
        if (companyId) conQuery = conQuery.eq('company_id', companyId);
        const { data: consumptions, error: conErr } = await conQuery;

        // Note: Returns functionality is temporarily bypassed for stock calculation 
        // because purchase_returns lacks item-level (rm_id) traceability in its current schema.

        // Calculate Stock
        const stockSummary = materials.map(m => {
            const purchased = purchaseItems?.filter(p => p.rm_id === m.id)
                .reduce((acc, curr) => acc + Number(curr.received_quantity || 0), 0) || 0;

            const consumed = consumptions?.filter(c => c.rm_id === m.id)
                .reduce((acc, curr) => acc + Number(curr.quantity_used || 0), 0) || 0;

            return {
                ...m,
                purchased,
                consumed,
                balance: purchased - consumed
            };
        });

        return stockSummary;
    },

    getFGStockSummary: async (companyId?: string) => {
        // Fetch all finished products
        let prodQuery = supabase.from('finished_products').select('*');
        if (companyId) prodQuery = prodQuery.eq('company_id', companyId);
        const { data: products, error: prodErr } = await prodQuery;
        if (prodErr) throw new Error(prodErr.message);

        // Fetch primary production (Extrusion / Production Details)
        let extrusionQuery = supabase.from('production_batches').select('product_id, extrusion_output_qty');
        if (companyId) extrusionQuery = extrusionQuery.eq('company_id', companyId);
        const { data: extrusionBatches, error: exErr } = await extrusionQuery;
        if (exErr) throw new Error(exErr.message);

        // Fetch secondary production (Cutting & Sealing)
        let prodItemsQuery = supabase.from('production_conversion_items').select('product_id, quantity, production_conversions!inner(company_id)');
        if (companyId) prodItemsQuery = prodItemsQuery.eq('production_conversions.company_id', companyId);
        const { data: productionItems, error: prodItemsErr } = await prodItemsQuery;

        // Fetch all sales deductions
        let saleItemsQuery = supabase.from('sales_invoice_items').select('product_id, quantity, sales_invoices!inner(company_id)');
        if (companyId) saleItemsQuery = saleItemsQuery.eq('sales_invoices.company_id', companyId);
        const { data: salesItems, error: salesErr } = await saleItemsQuery;

        // Calculate Stock
        const fgStockSummary = products.map(p => {
            // Production from primary stage (Extrusion)
            const producedPrimary = extrusionBatches?.filter(item => item.product_id === p.id)
                .reduce((acc, curr) => acc + Number(curr.extrusion_output_qty || 0), 0) || 0;

            // Production from secondary stage (Cutting)
            const producedSecondary = productionItems?.filter(item => item.product_id === p.id)
                .reduce((acc, curr) => acc + Number(curr.quantity || 0), 0) || 0;

            const produced = producedPrimary + producedSecondary;

            const sold = salesItems?.filter(item => item.product_id === p.id)
                .reduce((acc, curr) => acc + Number(curr.quantity || 0), 0) || 0;

            return {
                ...p,
                produced,
                sold,
                balance: produced - sold
            };
        });

        return fgStockSummary;
    }
};
