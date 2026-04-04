import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import { validateRequest } from '../middleware/validation.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { CACHE_CONFIGS } from '../services/cache';
import {
  createLeaveTypeSchema,
  applyForLeaveSchema,
  updateLeaveStatusSchema,
  updateLeaveTypeSchema,
} from '../schemas/validation.schemas';
import * as leaveController from '../controllers/leave.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/leave/types:
 *   get:
 *     tags:
 *       - Leave
 *     summary: Get all leave types
 *     description: Retrieve all leave types for the company (Annual, Casual, Medical, etc.)
 *     responses:
 *       200:
 *         description: List of leave types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LeaveType'
 */
router.get('/balance/me', leaveController.getMyLeaveBalance);

router.get('/types', checkPermission(Permission.LEAVE_TYPE_VIEW), cacheMiddleware(CACHE_CONFIGS.leaveTypes), leaveController.getAllLeaveTypes);

/**
 * @openapi
 * /api/v1/leave/requests:
 *   get:
 *     tags:
 *       - Leave
 *     summary: Get leave requests
 *     description: Retrieve leave requests with optional filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by status
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Filter by month
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: Filter by employee ID (admins only)
 *     responses:
 *       200:
 *         description: List of leave requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LeaveRequest'
 */
router.get('/requests', checkPermission(Permission.LEAVE_REQUEST_VIEW, Permission.LEAVE_REQUEST_VIEW_SELF), leaveController.getLeaveRequests);

router.get(
  '/requests/:id',
  checkPermission(Permission.LEAVE_REQUEST_VIEW, Permission.LEAVE_REQUEST_VIEW_SELF),
  leaveController.getLeaveRequestById
);

/**
 * @openapi
 * /api/v1/leave/types:
 *   post:
 *     tags:
 *       - Leave
 *     summary: Create leave type
 *     description: Create a new leave type (e.g., Annual Leave - 14 days, Casual - 7 days per Sri Lankan law)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - name
 *               - default_balance
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: Annual Leave
 *               default_balance:
 *                 type: number
 *                 example: 14
 *                 description: Days per year
 *     responses:
 *       201:
 *         description: Leave type created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveType'
 */
router.post(
  '/types',
  checkPermission(Permission.LEAVE_TYPE_CREATE),
  validateRequest(createLeaveTypeSchema),
  leaveController.createLeaveType
);

router.put(
  '/types/:id',
  checkPermission(Permission.LEAVE_TYPE_UPDATE),
  validateRequest(updateLeaveTypeSchema),
  leaveController.updateLeaveType
);

router.delete('/types/:id', checkPermission(Permission.LEAVE_TYPE_DELETE), leaveController.deleteLeaveType);

/**
 * @openapi
 * /api/v1/leave/apply:
 *   post:
 *     tags:
 *       - Leave
 *     summary: Apply for leave
 *     description: Submit a leave request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveTypeId
 *               - start_date
 *               - end_date
 *             properties:
 *               leaveTypeId:
 *                 type: integer
 *                 example: 1
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2025-10-15
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: 2025-10-20
 *     responses:
 *       201:
 *         description: Leave request submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveRequest'
 */
router.post('/apply', checkPermission(Permission.LEAVE_REQUEST_CREATE), validateRequest(applyForLeaveSchema), leaveController.applyForLeave);

// Also support POST /leave/requests for REST-style API (same handler as /apply)
router.post('/requests', checkPermission(Permission.LEAVE_REQUEST_CREATE), validateRequest(applyForLeaveSchema), leaveController.applyForLeave);

/**
 * @openapi
 * /api/v1/leave/{id}/status:
 *   patch:
 *     tags:
 *       - Leave
 *     summary: Update leave request status
 *     description: Approve or reject a leave request. Requires ADMIN or OWNER role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Leave request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED]
 *                 example: APPROVED
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveRequest'
 */
router.patch(
  '/:id/status',
  checkPermission(Permission.LEAVE_REQUEST_APPROVE),
  validateRequest(updateLeaveStatusSchema),
  leaveController.updateLeaveRequestStatus
);

/**
 * @openapi
 * /api/v1/leave/requests/{id}/approve:
 *   post:
 *     tags:
 *       - Leave
 *     summary: Approve leave request
 *     description: Approve a leave request. Requires ADMIN or OWNER role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Leave request ID
 *     responses:
 *       200:
 *         description: Leave request approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveRequest'
 */
router.post(
  '/requests/:id/approve',
  checkPermission(Permission.LEAVE_REQUEST_APPROVE),
  leaveController.approveLeaveRequest
);

/**
 * @openapi
 * /api/v1/leave/requests/{id}/reject:
 *   post:
 *     tags:
 *       - Leave
 *     summary: Reject leave request
 *     description: Reject a leave request. Requires ADMIN or OWNER role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Leave request ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave request rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveRequest'
 */
router.post(
  '/requests/:id/reject',
  checkPermission(Permission.LEAVE_REQUEST_REJECT),
  leaveController.rejectLeaveRequest
);

export default router;
