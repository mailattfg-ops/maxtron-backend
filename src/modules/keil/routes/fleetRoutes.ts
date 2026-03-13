import { Router } from 'express';
import * as FleetController from '../controllers/fleetController';

const router = Router();

// Vehicle Registry
router.get('/vehicles', FleetController.getVehicles);
router.post('/vehicles', FleetController.createVehicle);
router.put('/vehicles/:id', FleetController.updateVehicle);
router.delete('/vehicles/:id', FleetController.deleteVehicle);

// Travel & Fuel Logs
router.get('/logs', FleetController.getVehicleLogs);
router.post('/logs', FleetController.createVehicleLog);
router.delete('/logs/:id', FleetController.deleteVehicleLog);

// Repair & Workshop Logs
router.get('/repairs', FleetController.getVehicleRepairs);
router.post('/repairs', FleetController.createVehicleRepair);
router.put('/repairs/:id', FleetController.updateVehicleRepair);
router.delete('/repairs/:id', FleetController.deleteVehicleRepair);

// Intelligence & Analytics
router.get('/intelligence', FleetController.getFleetIntelligence);

export default router;
