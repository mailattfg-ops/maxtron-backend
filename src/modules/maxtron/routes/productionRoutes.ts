import { Router } from 'express';
import { productionController } from '../controllers/productionController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

// Batches / Extrusion
router.get('/batches', protect, productionController.getBatches);
router.post('/batches', protect, productionController.createBatch);

// Conversion / Cutting
router.get('/conversions', protect, productionController.getConversions);
router.post('/conversions', protect, productionController.createConversion);

// Packing
router.get('/packing', protect, productionController.getPacking);
router.post('/packing', protect, productionController.createPacking);

// Wastage
router.get('/wastage', protect, productionController.getWastage);
router.post('/wastage', protect, productionController.createWastage);

export default router;
