import { Router } from 'express';
import { SupplierModel } from '../models/supplierModel';

const router = Router();
router.get('/dbg', async (req, res) => {
    res.json({
        msg: "DEBUG CHECK",
        tableUsed_getAll: "See console for log",
        isUsingMasterName: true // If this comes back true, we know THIS code is running
    });
});
export default router;
