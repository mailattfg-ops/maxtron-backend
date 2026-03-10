import { Router } from 'express';
import inventoryRoutes from './inventoryRoutes';
import employeeRoutes from './employeeRoutes';
import companyRoutes from './companyRoutes';
import attendanceRoutes from './attendanceRoutes';
import marketingVisitRoutes from './marketingVisitRoutes';
import customerRoutes from './customerRoutes';
import permissionRoutes from './permissionRoutes';
import vehicleRoutes from './vehicleRoutes';
import orderRoutes from './orderRoutes';
import rawMaterialRoutes from './rawMaterialRoutes';
import supplierRoutes from './supplierRoutes';
import rmOrderRoutes from './rmOrderRoutes';
import salesRoutes from './salesRoutes';
import purchaseEntryRoutes from './purchaseEntryRoutes';
import consumptionRoutes from './consumptionRoutes';
import dbgRoutes from './dbgRoutes';
import { getStockSummary } from '../controllers/stockController';
import purchaseReturnRoutes from './purchaseReturnRoutes';
import userTypeRoutes from './userTypeRoutes';
import productionRoutes from './productionRoutes';
import productRoutes from './productRoutes';
import financeRoutes from './financeRoutes';
import { getDepartments } from '../controllers/departmentController';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { getDashboardSummary } from '../controllers/dashboardController';
import { protect } from '../../../middleware/authMiddleware';

const router = Router();

// Modular routing for Maxtron Operations
router.use('/inventory', inventoryRoutes);
router.use('/employees', employeeRoutes);
router.use('/companies', companyRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marketing-visits', marketingVisitRoutes);
router.use('/customers', customerRoutes);
router.use('/permissions', permissionRoutes);
router.use('/user-types', userTypeRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/orders', orderRoutes);
router.use('/raw-materials', rawMaterialRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/suppliers/dbg', dbgRoutes);
router.use('/rm-orders', rmOrderRoutes);
router.use('/sales', salesRoutes);
router.use('/purchase-entries', purchaseEntryRoutes);
router.use('/consumptions', consumptionRoutes);
router.use('/purchase-returns', purchaseReturnRoutes);
router.use('/production', productionRoutes);
router.use('/products', productRoutes);
router.use('/finance', financeRoutes);
router.get('/departments', protect, getDepartments);

// Dashboard Summary
router.get('/dashboard-summary', protect, getDashboardSummary);

// Categories CRUD
router.get('/categories', protect, getCategories);
router.post('/categories', protect, createCategory);
router.put('/categories/:id', protect, updateCategory);
router.delete('/categories/:id', protect, deleteCategory);

export default router;
