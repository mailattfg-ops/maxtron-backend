import { Request, Response } from 'express';
import { FuelFillingModel } from '../models/fuelFillingModel';

export class FuelFillingController {
    static async getAll(req: Request, res: Response) {
        try {
            const data = await FuelFillingModel.getAll(req.query);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const data = await FuelFillingModel.create(req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const data = await FuelFillingModel.update(req.params.id, req.body);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            await FuelFillingModel.delete(req.params.id);
            res.json({ success: true, message: 'Fuel filling record deleted' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
