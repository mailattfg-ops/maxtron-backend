import { supabase } from '../../../config/supabase';

/**
 * One row per invoice line. gst_percent is the rate typed for that line — the
 * printed invoice, the e-Invoice and the e-Way Bill are all computed from it.
 * It used not to be stored at all, and everything downstream assumed 18%.
 */
const itemRows = (invoiceId: string, items: any[], withGst: boolean) => items.map((item: any) => ({
    invoice_id: invoiceId,
    product_id: item.product_id === '' ? null : item.product_id,
    quantity: Number(item.quantity) || 0,
    rate: Number(item.rate) || 0,
    ...(withGst ? {
        gst_percent: item.gst_percent === '' || item.gst_percent === undefined || item.gst_percent === null
            ? null
            : Number(item.gst_percent)
    } : {}),
}));

const insertItems = async (invoiceId: string, items: any[]) => {
    let { error } = await supabase.from('sales_invoice_items').insert(itemRows(invoiceId, items, true));
    /* Until migrations/add_gst_percent_to_invoice_items.sql is applied the
     * column does not exist. The invoice must still save: store its lines
     * without the rate rather than leave an invoice with no lines. */
    if (error && /gst_percent/.test(error.message)) {
        ({ error } = await supabase.from('sales_invoice_items').insert(itemRows(invoiceId, items, false)));
    }
    if (error) throw new Error(error.message);
};

export const InvoiceModel = {
    getAll: async (companyId: string) => {
        const { data, error } = await supabase
            .from('sales_invoices')
            .select(`
                *,
                customers(customer_name, customer_code, gst_no, addresses(*)),
                orders:customer_orders(order_number),
                executive:users!executive_id(name),
                items:sales_invoice_items(
                    *,
                    finished_products(product_name, product_code, hsn_code)
                )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    getNextNumber: async (companyId?: string) => {
        let query = supabase.from('sales_invoices').select('invoice_number');
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);

        let maxNum = 0;
        if (data && data.length > 0) {
            for (const row of data) {
                if (row.invoice_number) {
                    const match = row.invoice_number.match(/^MP(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                }
            }
        }

        const nextNum = maxNum + 1;
        return `MP${String(nextNum).padStart(3, '0')}`;
    },

    create: async (invoiceData: any) => {
        const { items, ...header } = invoiceData;

        // Sanitize header (convert empty string dates & UUIDs to null for Postgres)
        const sanitizedHeader: any = { ...header };
        const nullableFields = [
            'customer_id', 'executive_id', 'order_id', 'company_id',
            'transporter_id', 'trans_doc_no', 'trans_doc_date',
            'scheduled_delivery_date', 'remarks', 'vehicle_no', 'transporter_name',
            'billing_software', 'bill_document_url', 'bill_document_name'
        ];
        nullableFields.forEach(f => {
            if (sanitizedHeader[f] === '' || sanitizedHeader[f] === undefined) {
                sanitizedHeader[f] = null;
            }
        });

        if (!sanitizedHeader.invoice_number || !sanitizedHeader.invoice_number.trim()) {
            sanitizedHeader.invoice_number = await InvoiceModel.getNextNumber(sanitizedHeader.company_id);
        }

        const { data, error } = await supabase
            .from('sales_invoices')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            await insertItems(data.id, items);
        }

        return data;
    },

    update: async (id: string, invoiceData: any) => {
        const { items, ...header } = invoiceData;

        // Sanitize header
        const sanitizedHeader: any = { ...header };
        const nullableFields = [
            'customer_id', 'executive_id', 'order_id', 'company_id',
            'transporter_id', 'trans_doc_no', 'trans_doc_date',
            'scheduled_delivery_date', 'remarks', 'vehicle_no', 'transporter_name',
            'billing_software', 'bill_document_url', 'bill_document_name'
        ];
        nullableFields.forEach(f => {
            if (sanitizedHeader[f] === '' || sanitizedHeader[f] === undefined) {
                sanitizedHeader[f] = null;
            }
        });

        const { error: headerError } = await supabase
            .from('sales_invoices')
            .update(sanitizedHeader)
            .eq('id', id);

        if (headerError) throw new Error(headerError.message);

        if (items) {
            await supabase.from('sales_invoice_items').delete().eq('invoice_id', id);

            if (items.length > 0) {
                await insertItems(id, items);
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
            .order('invoice_date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }
};
