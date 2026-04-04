
import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';

const router = Router();

// All job routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /jobs/check-expiry:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Trigger document expiry check
 *     description: Checks for expiring documents and sends notifications. Protected by X-Job-Secret header.
 *     parameters:
 *       - in: header
 *         name: x-job-secret
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Job completed successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/check-expiry', checkPermission(Permission.SYSTEM_JOB_RUN), jobController.checkDocumentExpiry);

/**
 * @openapi
 * /jobs/scan-ghosts:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Trigger ghost employee scan
 *     description: Checks for scheduled shifts where employees failed to attend. Marks them as ABSENT. Protected by X-Job-Secret header.
 *     parameters:
 *       - in: header
 *         name: x-job-secret
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Job completed successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/scan-ghosts', checkPermission(Permission.SYSTEM_JOB_RUN), jobController.scanGhosts);

export default router;
