import { Request, Response } from 'express';
import { InvoiceModel } from '../models/invoiceModel';

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
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await InvoiceModel.update(id, req.body);
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
    }
};
