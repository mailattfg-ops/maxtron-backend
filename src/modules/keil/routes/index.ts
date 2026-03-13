import { Router } from 'express';
import employeeRoutes from '../../maxtron/routes/employeeRoutes';
import companyRoutes from '../../maxtron/routes/companyRoutes';
import attendanceRoutes from '../../maxtron/routes/attendanceRoutes';
import marketingVisitRoutes from '../../maxtron/routes/marketingVisitRoutes';

import userTypeRoutes from '../../maxtron/routes/userTypeRoutes';
import permissionRoutes from '../../maxtron/routes/permissionRoutes';
import { getCategories } from '../../maxtron/controllers/categoryController';
import { getDepartments } from '../../maxtron/controllers/departmentController';

import operationRoutes from './operationRoutes';
import fleetRoutes from './fleetRoutes';
import expenseRoutes from './expenseRoutes';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.use((req, res, next) => {
    console.log(`[KEIL ROUTER] ${req.method} ${req.url}`);
    next();
});

// Modular routing for KEIL Operations & Fleet
router.use('/operations', operationRoutes);
router.use('/fleet', fleetRoutes);
router.use('/hr-payroll/expenses', expenseRoutes);

router.get('/fleet-test', (req, res) => {
    res.json({ success: true, message: 'Fleet sub-router base is reachable' });
});

router.get('/dashboard', (req, res) => {
    res.json({ success: true, message: 'KEIL Module API is active.' });
});

// Reuse HR logic (Multi-tenant handled by company_id in payload/query)
router.use('/employees', employeeRoutes);
router.use('/companies', companyRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marketing-visits', marketingVisitRoutes);
router.use('/user-types', userTypeRoutes);
router.use('/permissions', permissionRoutes);

router.get('/categories', getCategories);
router.get('/departments', getDepartments);

export default router;
