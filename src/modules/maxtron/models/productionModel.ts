import { supabase } from '../../../config/supabase';

export const ProductionModel = {
    // Extrusion Batches
    getBatches: async (companyId: string) => {
        console.log(`Fetching batches for companyId: ${companyId}`);
        const { data, error } = await supabase
            .from('production_batches')
            .select(`
                *,
                finished_products(product_name, product_code),
                supervisor:users!supervisor_id(name),
                operator:users!operator_id(name),
                material_consumptions:consumption_id(
                    *,
                    raw_materials!rm_id(rm_name, rm_code)
                )
            `)
            .eq('company_id', companyId)
            .order('date', { ascending: false });

        if (error) {
            console.error('Supabase Error in getBatches:', error);
            throw new Error(error.message);
        }

        console.log(`Fetched ${data?.length || 0} batches`);
        return data || [];
    },

    createBatch: async (batchData: any) => {
        // Sanitize UUID fields: convert empty strings to null
        const sanitizedData = { ...batchData };
        const uuidFields = ['product_id', 'operator_id', 'supervisor_id', 'company_id', 'consumption_id'];

        uuidFields.forEach(field => {
            if (sanitizedData[field] === '') {
                sanitizedData[field] = null;
            }
        });

        const { data, error } = await supabase
            .from('production_batches')
            .insert([sanitizedData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return data;
    },

    updateBatch: async (id: string, batchData: any) => {
        const sanitizedData = { ...batchData };
        const uuidFields = ['product_id', 'operator_id', 'supervisor_id', 'company_id', 'consumption_id'];

        uuidFields.forEach(field => {
            if (sanitizedData[field] === '') {
                sanitizedData[field] = null;
            }
        });

        const { data, error } = await supabase
            .from('production_batches')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    deleteBatch: async (id: string) => {
        const { error } = await supabase
            .from('production_batches')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    },

    // Conversion (Cutting & Sealing)
    getConversions: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_conversions')
            .select(`
                *,
                production_batches(batch_number, finished_products(product_name)),
                operator:users!operator_id(name),
                items:production_conversion_items(
                    *,
                    finished_products(product_name, product_code)
                )
            `)
            .eq('company_id', companyId)
            .order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createConversion: async (convData: any) => {
        const { items, ...header } = convData;

        // Sanitize header UUID fields
        const sanitizedHeader = { ...header };
        ['batch_id', 'operator_id', 'company_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { data, error } = await supabase
            .from('production_conversions')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const sanitizedItem = { ...item, conversion_id: data.id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                return sanitizedItem;
            });
            const { error: itemError } = await supabase
                .from('production_conversion_items')
                .insert(itemsToInsert);
            if (itemError) throw new Error(itemError.message);
        }

        // --- AUTOMATED WASTAGE LOGGING ---
        if (Number(data.wastage_qty || 0) > 0) {
            // Get product_id from batch
            const { data: batch } = await supabase
                .from('production_batches')
                .select('product_id')
                .eq('id', data.batch_id)
                .single();

            await supabase.from('production_wastage').insert([{
                company_id: data.company_id,
                stage: 'Cutting & Sealing',
                product_id: batch?.product_id || null,
                date: data.date,
                wastage_qty: Number(data.wastage_qty),
                reason_code: 'PRODUCTION_WASTAGE',
                remarks: `Job No: ${data.conversion_number}. Cutting & Sealing Wastage for Batch: ${data.id}. Remarks: ${data.remarks || ''}`
            }]);
        }

        return data;
    },

    updateConversion: async (id: string, convData: any) => {
        const { items, ...header } = convData;
        const sanitizedHeader = { ...header };
        ['batch_id', 'operator_id', 'company_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { data, error } = await supabase
            .from('production_conversions')
            .update(sanitizedHeader)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Update items: delete existing and insert new ones
        await supabase.from('production_conversion_items').delete().eq('conversion_id', id);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const sanitizedItem = { ...item, conversion_id: id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                delete sanitizedItem.id; // Ensure we don't try to insert old IDs
                return sanitizedItem;
            });
            const { error: itemError } = await supabase
                .from('production_conversion_items')
                .insert(itemsToInsert);
            if (itemError) throw new Error(itemError.message);
        }

        return data;
    },

    deleteConversion: async (id: string) => {
        const { error } = await supabase
            .from('production_conversions')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    // Packing
    getPacking: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_packing')
            .select(`
                *,
                production_conversions(
                    production_batches(batch_number, finished_products(product_name))
                )
            `)
            .eq('company_id', companyId)
            .order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createPacking: async (packData: any) => {
        const sanitizedData = { ...packData };
        ['conversion_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_packing')
            .insert([sanitizedData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    updatePacking: async (id: string, packData: any) => {
        const sanitizedData = { ...packData };
        ['conversion_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_packing')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    deletePacking: async (id: string) => {
        const { error } = await supabase
            .from('production_packing')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    // Wastage
    getWastage: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_wastage')
            .select(`
                *,
                finished_products!product_id(product_name),
                raw_materials!material_id(rm_name)
            `)
            .eq('company_id', companyId)
            .order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createWastage: async (wastageData: any) => {
        const sanitizedData = { ...wastageData };
        ['product_id', 'material_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_wastage')
            .insert([sanitizedData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    updateWastage: async (id: string, wastageData: any) => {
        const sanitizedData = { ...wastageData };
        ['product_id', 'material_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_wastage')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    deleteWastage: async (id: string) => {
        const { error } = await supabase
            .from('production_wastage')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    // Expenses
    getExpenses: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_expenses')
            .select('*')
            .eq('company_id', companyId)
            .order('expense_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createExpense: async (expenseData: any) => {
        const sanitizedData = { ...expenseData };
        if (sanitizedData.company_id === '') sanitizedData.company_id = null;

        const { data, error } = await supabase
            .from('production_expenses')
            .insert([sanitizedData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    updateExpense: async (id: string, expenseData: any) => {
        const sanitizedData = { ...expenseData };
        if (sanitizedData.company_id === '') sanitizedData.company_id = null;

        const { data, error } = await supabase
            .from('production_expenses')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    deleteExpense: async (id: string) => {
        const { error } = await supabase
            .from('production_expenses')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
