import { Request, Response } from 'express';
import { InvoiceModel } from '../models/invoiceModel';
import { supabase } from '../../../config/supabase';
import { EInvoiceService } from '../services/eInvoiceService';

const getEnrichedInvoice = async (id: string) => {
    const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
            *,
            customers(*),
            items:sales_invoice_items(
                *,
                finished_products(product_name, product_code, hsn_code)
            )
        `)
        .eq('id', id)
        .single();
    if (error) throw new Error(error.message);
    return data;
};

export const invoiceController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await InvoiceModel.getAll(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const data = await InvoiceModel.create(req.body);
            let finalData = data;

            // Trigger E-Invoice automatically if customer has a GST number and net_amount is positive
            const enriched = await getEnrichedInvoice(data.id);
            if (enriched.customers?.gst_no && Number(enriched.net_amount) > 0) {
                console.log(`[invoiceController] Auto-triggering E-Invoice for B2B Invoice ${enriched.invoice_number}`);
                const result = await EInvoiceService.generateEInvoice(enriched, enriched.customers, enriched.items);
                
                const { data: updated, error: updateErr } = await supabase
                    .from('sales_invoices')
                    .update({
                        einvoice_status: result.status,
                        einvoice_irn: result.irn || null,
                        einvoice_ack_no: result.ack_no || null,
                        einvoice_ack_date: result.ack_date || null,
                        einvoice_error: result.error || null
                    })
                    .eq('id', data.id)
                    .select();

                if (!updateErr && updated && updated.length > 0) {
                    finalData = updated[0];
                }
            }

            res.status(201).json({ success: true, data: finalData });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await InvoiceModel.update(id, req.body);

            // Re-trigger E-Invoice automatically if customer has a GST number and was not generated yet
            const enriched = await getEnrichedInvoice(id);
            if (enriched.customers?.gst_no && Number(enriched.net_amount) > 0 && enriched.einvoice_status !== 'GENERATED') {
                console.log(`[invoiceController] Auto-triggering E-Invoice on update for B2B Invoice ${enriched.invoice_number}`);
                const result = await EInvoiceService.generateEInvoice(enriched, enriched.customers, enriched.items);
                
                await supabase
                    .from('sales_invoices')
                    .update({
                        einvoice_status: result.status,
                        einvoice_irn: result.irn || null,
                        einvoice_ack_no: result.ack_no || null,
                        einvoice_ack_date: result.ack_date || null,
                        einvoice_error: result.error || null
                    })
                    .eq('id', id);
            }

            res.json({ success: true, message: 'Invoice updated successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await InvoiceModel.delete(id);
            res.json({ success: true, message: 'Invoice deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    generateEInvoice: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const invoice = await getEnrichedInvoice(id);

            if (!invoice.customers?.gst_no) {
                return res.status(400).json({ success: false, message: 'E-Invoice requires a B2B customer with a valid GST number.' });
            }

            console.log(`[invoiceController] Generating E-Invoice for Invoice ID: ${id}`);
            const result = await EInvoiceService.generateEInvoice(invoice, invoice.customers, invoice.items);

            const { data: updated, error: updateErr } = await supabase
                .from('sales_invoices')
                .update({
                    einvoice_status: result.status,
                    einvoice_irn: result.irn || null,
                    einvoice_ack_no: result.ack_no || null,
                    einvoice_ack_date: result.ack_date || null,
                    einvoice_error: result.error || null
                })
                .eq('id', id)
                .select();

            if (updateErr) throw new Error(updateErr.message);

            res.json({ success: true, data: updated?.[0] || invoice });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
