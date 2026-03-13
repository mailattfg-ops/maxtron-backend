import { Request, Response } from 'express';
import { HCEModel } from '../models/hceModel';
import { RouteModel } from '../models/routeModel';
import { AssignmentModel } from '../models/assignmentModel';
import { CollectionModel } from '../models/collectionModel';
import { BranchModel } from '../models/branchModel';

// Branch Handlers
export const getBranches = async (req: Request, res: Response) => {
    try {
        const companyId = req.query.company_id as string;
        const data = await BranchModel.getAll(companyId);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getBranch = async (req: Request, res: Response) => {
    try {
        const data = await BranchModel.getById(req.params.id as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createBranch = async (req: Request, res: Response) => {
    try {
        const data = await BranchModel.create(req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateBranch = async (req: Request, res: Response) => {
    try {
        const data = await BranchModel.update(req.params.id as string, req.body);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteBranch = async (req: Request, res: Response) => {
    try {
        await BranchModel.delete(req.params.id as string);
        res.status(200).json({ success: true, message: 'Branch deleted.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// HCE Handlers
export const getHces = async (req: Request, res: Response) => {
    try {
        const companyId = req.query.company_id as string;
        const data = await HCEModel.getAll(companyId);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getHce = async (req: Request, res: Response) => {
    try {
        const data = await HCEModel.getById(req.params.id as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createHce = async (req: Request, res: Response) => {
    try {
        const data = await HCEModel.create(req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateHce = async (req: Request, res: Response) => {
    try {
        const data = await HCEModel.update(req.params.id as string, req.body);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteHce = async (req: Request, res: Response) => {
    try {
        await HCEModel.delete(req.params.id as string);
        res.status(200).json({ success: true, message: 'HCE deleted successfully.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Route Handlers
export const getRoutes = async (req: Request, res: Response) => {
    try {
        const companyId = req.query.company_id as string;
        const data = await RouteModel.getAll(companyId);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getRoute = async (req: Request, res: Response) => {
    try {
        const data = await RouteModel.getById(req.params.id as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createRoute = async (req: Request, res: Response) => {
    try {
        const data = await RouteModel.create(req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateRoute = async (req: Request, res: Response) => {
    try {
        const data = await RouteModel.update(req.params.id as string, req.body);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteRoute = async (req: Request, res: Response) => {
    try {
        await RouteModel.delete(req.params.id as string);
        res.status(200).json({ success: true, message: 'Route deleted successfully.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Route Assignment Handlers
export const getAssignments = async (req: Request, res: Response) => {
    try {
        const { route_id } = req.query;
        if (!route_id) return res.status(400).json({ success: false, message: 'route_id is required' });
        const data = await AssignmentModel.getRouteAssignments(route_id as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createAssignment = async (req: Request, res: Response) => {
    try {
        const data = await AssignmentModel.assignHce(req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateAssignment = async (req: Request, res: Response) => {
    try {
        const data = await AssignmentModel.updateAssignment(req.params.id as string, req.body);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteAssignment = async (req: Request, res: Response) => {
    try {
        await AssignmentModel.removeHce(req.params.id as string);
        res.status(200).json({ success: true, message: 'Assignment removed successfully.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Collection Batch Handlers
export const getCollectionHeaders = async (req: Request, res: Response) => {
    try {
        const { company_id, date, route_id } = req.query;
        const data = await CollectionModel.getHeaders(company_id as string, { date, route_id });
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getCollectionBatch = async (req: Request, res: Response) => {
    try {
        const data = await CollectionModel.getHeaderById(req.params.id as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createCollectionBatch = async (req: Request, res: Response) => {
    try {
        const { header, entries } = req.body;
        const data = await CollectionModel.saveCollectionBatch(header, entries);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteCollectionBatch = async (req: Request, res: Response) => {
    try {
        await CollectionModel.deleteHeader(req.params.id as string);
        res.status(200).json({ success: true, message: 'Collection batch deleted.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getHceLedger = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const { from, to } = req.query;
        const data = await CollectionModel.getHceLedger(id as string, from as string, to as string);
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
