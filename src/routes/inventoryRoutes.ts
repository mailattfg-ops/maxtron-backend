import { Router } from 'express';
import {
    getInventory,
    getInventoryItem,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
} from '../controllers/inventoryController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Map route paths to controller methods
router.route('/')
    .get(protect, getInventory)
    .post(protect, createInventoryItem);

router.route('/:id')
    .get(protect, getInventoryItem)
    .put(protect, updateInventoryItem)
    .delete(protect, deleteInventoryItem);

export default router;
