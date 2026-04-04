import { Response } from 'express';
import { CustomRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';
import logger from '../utils/logger';

export const dashboardController = {
  /**
   * Get dashboard statistics
   * @route GET /api/v1/dashboard/stats
   * @access Private (All authenticated users)
   */
  async getStats(req: CustomRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
      const stats = await dashboardService.getDashboardStats(req.user.companyId);
      return res.json(stats);
    } catch (error) {
      logger.error('Error fetching dashboard stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId: req.user.companyId,
        correlationId: req.correlationId,
      });
      return res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
    }
  },

  /**
   * Get liquidity metrics (estimated real-time cost)
   * @route GET /api/v1/dashboard/liquidity
   * @access Private (All authenticated users)
   */
  async getLiquidity(req: CustomRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
      const metrics = await dashboardService.getLiquidityMetrics(req.user.companyId);
      return res.json(metrics);
    } catch (error) {
      logger.error('Error fetching liquidity metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId: req.user.companyId,
        correlationId: req.correlationId,
      });
      return res.status(500).json({ message: 'Failed to fetch liquidity metrics' });
    }
  },
};
