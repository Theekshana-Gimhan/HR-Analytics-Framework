import { Response } from 'express';
import { CustomRequest } from '../middleware/auth.middleware';
import { getAuditLogs } from '../services/audit.service';
import logger from '../utils/logger';

/**
 * GET /api/v1/audit-logs
 * Query params: userId, action, entityType, entityId, startDate, endDate, limit, offset
 * OWNER-only (enforced via RBAC permission AUDIT_LOG_VIEW)
 */
export const listAuditLogs = async (req: CustomRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const options: {
      userId?: number;
      action?: string;
      entityType?: string;
      entityId?: number;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {};

    if (req.query.userId) options.userId = Number(req.query.userId);
    if (req.query.action) options.action = String(req.query.action);
    if (req.query.entityType) options.entityType = String(req.query.entityType);
    if (req.query.entityId) options.entityId = Number(req.query.entityId);
    if (req.query.startDate) options.startDate = new Date(String(req.query.startDate));
    if (req.query.endDate) options.endDate = new Date(String(req.query.endDate));
    if (req.query.limit) options.limit = Math.min(Number(req.query.limit), 100);
    if (req.query.offset) options.offset = Number(req.query.offset);

    const result = await getAuditLogs(companyId, options);

    return res.json(result);
  } catch (error) {
    logger.error('Failed to fetch audit logs', { error });
    return res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};
