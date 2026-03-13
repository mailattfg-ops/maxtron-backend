import { Request, Response } from 'express';
import { SupplierModel } from '../models/supplierModel';

export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const suppliers = await SupplierModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch suppliers', error: error.message });
    }
};

export const getSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const supplier = await SupplierModel.getById(id as string);
        if (!supplier) {
            res.status(404).json({ success: false, message: 'Supplier not found' });
            return;
        }
        res.status(200).json({ success: true, data: supplier });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch supplier', error: error.message });
    }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const newSupplier = await SupplierModel.create(req.body);
        res.status(201).json({ success: true, data: newSupplier });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to create supplier1111', error: error.message });
    }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedSupplier = await SupplierModel.update(id as string, req.body);
        if (!updatedSupplier) {
            res.status(404).json({ success: false, message: 'Supplier not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedSupplier });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update supplier', error: error.message });
    }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await SupplierModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Supplier not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Supplier deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete supplier', error: error.message });
    }
};
