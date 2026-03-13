import { Request, Response } from 'express';
import { OrderModel } from '../models/orderModel';

export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const orders = await OrderModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch customer orders', error: error.message });
    }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const order = await OrderModel.getById(id as string);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
    }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const newOrder = await OrderModel.create(req.body);
        res.status(201).json({ success: true, data: newOrder });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
    }
};

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedOrder = await OrderModel.update(id as string, req.body);
        if (!updatedOrder) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedOrder });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update order', error: error.message });
    }
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await OrderModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Order deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
    }
};
