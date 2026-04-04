import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import * as auditController from '../controllers/audit.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/audit-logs:
 *   get:
 *     tags:
 *       - Audit
 *     summary: List audit logs (OWNER only)
 *     description: >
 *       Retrieve paginated audit logs for the company. Supports filtering
 *       by userId, action, entityType, entityId, and date range.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: entityId
 *         schema: { type: integer }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated audit log entries
 *       403:
 *         description: Forbidden – insufficient permissions
 */
router.get('/', checkPermission(Permission.AUDIT_LOG_VIEW), auditController.listAuditLogs);

export default router;
