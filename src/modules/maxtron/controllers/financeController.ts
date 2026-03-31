import { Request, Response } from 'express';
import { CustomerCollectionModel } from '../models/customerCollectionModel';
import { SupplierPaymentModel } from '../models/supplierPaymentModel';
import { PettyCashModel } from '../models/pettyCashModel';
import { PurchaseEntryModel } from '../models/purchaseEntryModel';
import { InvoiceModel } from '../models/invoiceModel';
import { supabase } from '../../../config/supabase';
import { collectionSchema, paymentSchema, pettyCashSchema } from '../validators/financeValidator';

export const FinanceController = {
    // --- Customer Collections ---
    getCollections: async (req: Request, res: Response) => {
        try {
            const companyId = String(req.query.companyId || '');
            const data = await CustomerCollectionModel.getAll(companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch collections', error: err.message });
        }
    },

    createCollection: async (req: Request, res: Response) => {
        try {
            const validation = collectionSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await CustomerCollectionModel.create(validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to record collection', error: err.message });
        }
    },

    deleteCollection: async (req: Request, res: Response) => {
        try {
            await CustomerCollectionModel.delete(req.params.id as string);
            res.json({ success: true, message: 'Collection deleted successfully' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to delete collection', error: err.message });
        }
    },
    
    updateCollection: async (req: Request, res: Response) => {
        try {
            const validation = collectionSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await CustomerCollectionModel.update(req.params.id as string, validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to update collection', error: err.message });
        }
    },

    getPendingInvoices: async (req: Request, res: Response) => {
        try {
            const { customerId, companyId } = req.query;
            const data = await InvoiceModel.getPendingByCustomer(customerId as string, companyId as string);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch pending invoices', error: err.message });
        }
    },

    // --- Supplier Payments ---
    getPayments: async (req: Request, res: Response) => {
        try {
            const companyId = String(req.query.companyId || '');
            const data = await SupplierPaymentModel.getAll(companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch payments', error: err.message });
        }
    },

    createPayment: async (req: Request, res: Response) => {
        try {
            const validation = paymentSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await SupplierPaymentModel.create(validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to record payment', error: err.message });
        }
    },

    deletePayment: async (req: Request, res: Response) => {
        try {
            await SupplierPaymentModel.delete(req.params.id as string);
            res.json({ success: true, message: 'Payment deleted successfully' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to delete payment', error: err.message });
        }
    },
    
    updatePayment: async (req: Request, res: Response) => {
        try {
            const validation = paymentSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await SupplierPaymentModel.update(req.params.id as string, validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to update payment', error: err.message });
        }
    },

    getPendingBills: async (req: Request, res: Response) => {
        try {
            const { supplierId, companyId } = req.query;
            const data = await PurchaseEntryModel.getPendingBySupplier(supplierId as string, companyId as string);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch pending bills', error: err.message });
        }
    },

    // --- Petty Cash ---
    getPettyCash: async (req: Request, res: Response) => {
        try {
            const companyId = String(req.query.companyId || '');
            const data = await PettyCashModel.getAll(companyId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch petty cash records', error: err.message });
        }
    },

    createPettyCash: async (req: Request, res: Response) => {
        try {
            const validation = pettyCashSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await PettyCashModel.create(validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to record petty cash', error: err.message });
        }
    },

    deletePettyCash: async (req: Request, res: Response) => {
        try {
            await PettyCashModel.delete(req.params.id as string);
            res.json({ success: true, message: 'Petty cash record deleted successfully' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to delete petty cash record', error: err.message });
        }
    },
    
    updatePettyCash: async (req: Request, res: Response) => {
        try {
            const validation = pettyCashSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed', 
                    errors: validation.error.flatten().fieldErrors 
                });
            }
            const data = await PettyCashModel.update(req.params.id as string, validation.data);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to update petty cash record', error: err.message });
        }
    },

    // --- Financial Summaries & Scorecard ---
    getScorecard: async (req: Request, res: Response) => {
        try {
            const { companyId, startDate, endDate } = req.query;

            const cId = companyId as string;

            // Simple analytical overview logic
            // In a real app, this would involve complex aggregations
            const [
                { data: sales },
                { data: purchases },
                { data: collections },
                { data: payments },
                { data: expenses }
            ] = await Promise.all([
                supabase.from('sales_invoices').select('net_amount').eq('company_id', cId),
                supabase.from('purchase_entries').select('total_amount').eq('company_id', cId),
                supabase.from('customer_collections').select('amount').eq('company_id', cId),
                supabase.from('supplier_payments').select('amount').eq('company_id', cId),
                supabase.from('petty_cash').select('amount').eq('company_id', cId)
            ]);

            const summary = {
                totalSales: (sales || []).reduce((sum, item) => sum + Number(item.net_amount), 0),
                totalPurchases: (purchases || []).reduce((sum, item) => sum + Number(item.total_amount), 0),
                totalCollections: (collections || []).reduce((sum, item) => sum + Number(item.amount), 0),
                totalPayments: (payments || []).reduce((sum, item) => sum + Number(item.amount), 0),
                totalExpenses: (expenses || []).reduce((sum, item) => sum + Number(item.amount), 0),
                cashInHand: ((collections || []).reduce((sum, item) => sum + Number(item.amount), 0)) -
                    ((payments || []).reduce((sum, item) => sum + Number(item.amount), 0) +
                        (expenses || []).reduce((sum, item) => sum + Number(item.amount), 0))
            };

            res.json({ success: true, data: summary });
        } catch (err: any) {
            res.status(500).json({ success: false, message: 'Failed to fetch scorecard', error: err.message });
        }
    }
};
