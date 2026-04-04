import { Response, NextFunction } from 'express';
import { CustomRequest } from './auth.middleware';
import { recordAuditLog, AuditActionType } from '../services/audit.service';

/**
 * Express middleware factory for recording audit log entries.
 * Attaches after the route handler completes successfully.
 *
 * Usage in routes:
 *   router.post('/types', authenticate, authorize(['OWNER', 'ADMIN']),
 *     auditLog(AuditAction.LEAVE_TYPE_CREATED, 'LeaveType'),
 *     controller.createLeaveType
 *   );
 *
 * Or call recordAuditLog directly inside controllers/services for
 * more fine-grained control (e.g., when you need the created entity ID).
 */
export const auditLog = (action: AuditActionType, entityType: string) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    // Hook into the response finish event so we only log successful operations
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only audit on success (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const parsedParamId = parseInt(req.params?.id, 10);
        const bodyId = (body as Record<string, unknown>)?.id as number | undefined;
        const resolvedEntityId = bodyId !== undefined ? bodyId : (isNaN(parsedParamId) ? undefined : parsedParamId);
        const clientIp = req.ip || req.socket.remoteAddress;

        // Fire-and-forget
        setImmediate(() => {
          recordAuditLog({
            userId: req.user!.id,
            companyId: req.user!.companyId,
            action,
            entityType,
            entityId: resolvedEntityId != null && !isNaN(resolvedEntityId) ? resolvedEntityId : undefined,
            ipAddress: clientIp,
            userAgent: req.get('user-agent'),
          });
        });
      }

      return originalJson(body);
    };

    next();
  };
};
