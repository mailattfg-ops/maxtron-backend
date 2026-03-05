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
import { getUserTypes } from '../controllers/userTypeController';
import { getDepartments } from '../controllers/departmentController';
import { getCategories } from '../controllers/categoryController';
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
router.use('/vehicles', vehicleRoutes);
router.use('/orders', orderRoutes);
router.get('/user-types', protect, getUserTypes);
router.get('/departments', protect, getDepartments);
router.get('/categories', protect, getCategories);

export default router;
