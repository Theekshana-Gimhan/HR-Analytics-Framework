
import { Router } from 'express';
import * as rosterController from '../controllers/roster.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { assignShiftSchema } from '../schemas/validation.schemas';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/roster/assign:
 *   post:
 *     tags: [Roster]
 *     summary: Assign a shift to an employee
 */
router.post('/assign', checkPermission(Permission.ROSTER_ASSIGN), validateRequest(assignShiftSchema), rosterController.assignShift);

/**
 * @openapi
 * /api/v1/roster:
 *   get:
 *     tags: [Roster]
 *     summary: Get roster for a date range
 */
router.get('/', checkPermission(Permission.ROSTER_VIEW), rosterController.getRoster);

export default router;
