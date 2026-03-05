import { Request, Response } from 'express';
import { StockModel } from '../models/stockModel';

export const getStockSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const summary = await StockModel.getRMStockSummary(company_id as string);
        res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch stock summary', error: error.message });
    }
};
