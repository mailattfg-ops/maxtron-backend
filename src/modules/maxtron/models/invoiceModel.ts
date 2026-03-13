import { supabase } from '../../../config/supabase';

export const InvoiceModel = {
    getAll: async (companyId: string) => {
        const { data, error } = await supabase
            .from('sales_invoices')
            .select(`
                *,
                customers(customer_name, customer_code),
                executive:users!executive_id(name),
                items:sales_invoice_items(
                    *,
                    finished_products(product_name, product_code)
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    create: async (invoiceData: any) => {
        const { items, ...header } = invoiceData;

        // Sanitize header
        const sanitizedHeader = { ...header };
        ['customer_id', 'executive_id', 'order_id', 'company_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const { data, error } = await supabase
            .from('sales_invoices')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const { amount, ...rest } = item;
                const sanitizedItem = { ...rest, invoice_id: data.id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                return sanitizedItem;
            });

            const { error: itemError } = await supabase
                .from('sales_invoice_items')
                .insert(itemsToInsert);

            if (itemError) throw new Error(itemError.message);
        }

        return data;
    },

    update: async (id: string, invoiceData: any) => {
        const { items, ...header } = invoiceData;

        const { error: headerError } = await supabase
            .from('sales_invoices')
            .update(header)
            .eq('id', id);

        if (headerError) throw new Error(headerError.message);

        if (items) {
            await supabase.from('sales_invoice_items').delete().eq('invoice_id', id);

            if (items.length > 0) {
                const itemsToInsert = items.map((item: any) => {
                    const { amount, ...rest } = item;
                    const sanitizedItem = { ...rest, invoice_id: id };
                    return sanitizedItem;
                });

                const { error: itemError } = await supabase
                    .from('sales_invoice_items')
                    .insert(itemsToInsert);
                if (itemError) throw new Error(itemError.message);
            }
        }
        return true;
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('sales_invoices').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    getPendingByCustomer: async (customerId: string, companyId: string) => {
        const { data, error } = await supabase
            .from('v_sales_invoice_balances')
            .select('*')
            .eq('customer_id', customerId)
            .eq('company_id', companyId)
            .gt('pending_amount', 0)
            .order('invoice_date', { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
    }
};
