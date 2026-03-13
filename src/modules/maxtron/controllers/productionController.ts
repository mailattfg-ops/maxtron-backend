import { Request, Response } from 'express';
import { ProductionModel } from '../models/productionModel';

export const productionController = {
    // Extrusion Batches
    getBatches: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getBatches(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    createBatch: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createBatch(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Conversion
    getConversions: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getConversions(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    createConversion: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createConversion(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Packing
    getPacking: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getPacking(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    createPacking: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createPacking(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Wastage
    getWastage: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await ProductionModel.getWastage(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    createWastage: async (req: Request, res: Response) => {
        try {
            const data = await ProductionModel.createWastage(req.body);
            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
