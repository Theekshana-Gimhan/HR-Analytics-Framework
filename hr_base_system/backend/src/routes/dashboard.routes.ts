import express from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { CACHE_CONFIGS } from '../services/cache';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    Get dashboard statistics (total employees, pending leaves, upcoming leaves)
 * @access  Private (All authenticated users)
 * @cache   60s TTL, keyed by companyId
 */
router.get('/stats', checkPermission(Permission.DASHBOARD_VIEW), cacheMiddleware(CACHE_CONFIGS.dashboardStats), dashboardController.getStats);

/**
 * @route   GET /api/v1/dashboard/liquidity
 * @desc    Get estimated real-time payroll cost for the current month
 * @access  Private
 * @cache   60s TTL, keyed by companyId
 */
router.get('/liquidity', checkPermission(Permission.DASHBOARD_VIEW), cacheMiddleware(CACHE_CONFIGS.dashboardLiquidity), dashboardController.getLiquidity);

export default router;
