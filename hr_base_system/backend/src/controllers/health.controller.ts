import { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import logger from '../utils/logger';
import { getCache } from '../services/cache';

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Service health check
 *     description: Check API and database connectivity. No authentication required.
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-10-09T12:00:00Z
 *                 service:
 *                   type: string
 *                   example: simpala-hr-backend
 *                 database:
 *                   type: string
 *                   example: connected
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: simpala-hr-backend
 *                 database:
 *                   type: string
 *                   example: disconnected
 *                 error:
 *                   type: string
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    await prisma.$queryRawUnsafe('SELECT 1');

    // Check cache health
    const cacheStats = getCache().stats; // Accessing stats as a property

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'simpala-hr-backend',
      database: 'connected',
      cache: cacheStats !== undefined ? 'healthy' : 'unhealthy',
    });
  } catch (error) {
    logger.error('Health check failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'simpala-hr-backend',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
