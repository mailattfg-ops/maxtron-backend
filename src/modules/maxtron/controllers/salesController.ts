import { Request, Response } from 'express';
import { SalesModel } from '../models/salesModel';

export const salesController = {
    getOrders: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await SalesModel.getOrders(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createOrder: async (req: Request, res: Response) => {
        try {
            const data = await SalesModel.createOrder(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateOrder: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await SalesModel.updateOrder(id as string, req.body);
            res.json({ success: true, message: 'Order updated successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteOrder: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await SalesModel.deleteOrder(id as string);
            res.json({ success: true, message: 'Order deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
