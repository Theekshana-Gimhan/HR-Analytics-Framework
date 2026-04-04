import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createAttendanceSchema,
  createCorrectionRequestSchema,
  updateCorrectionRequestSchema,
} from '../schemas/validation.schemas';
import * as attendanceController from '../controllers/attendance.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/attendance/me:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get my attendance records
 *     description: Retrieve attendance records for the authenticated employee with optional date filtering
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2024-11-01
 *         description: Filter records from this date (inclusive)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2024-11-30
 *         description: Filter records until this date (inclusive)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           example: 11
 *         description: Filter by month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *           example: 2024
 *         description: Filter by year
 *     responses:
 *       200:
 *         description: List of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */
router.get('/me', checkPermission(Permission.ATTENDANCE_VIEW_OWN), attendanceController.getMyAttendance);

/**
 * @openapi
 * /api/v1/attendance/daily-log:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get daily attendance log
 *     description: Retrieve attendance status for all employees for a specific day, including Late status
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Daily attendance log
 */
router.get('/daily-log', checkPermission(Permission.ATTENDANCE_DAILY_LOG), attendanceController.getDailyLog);

/**
 * @openapi
 * /api/v1/attendance:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get all attendance records (Admin/Owner only)
 *     description: Retrieve all attendance records with optional filtering
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2024-11-01
 *         description: Filter records from this date (inclusive)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2024-11-30
 *         description: Filter records until this date (inclusive)
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *           example: 5
 *         description: Filter by specific employee ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records per page (max 100)
 *     responses:
 *       200:
 *         description: Paginated list of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Owner role required
 */
router.get('/', checkPermission(Permission.ATTENDANCE_VIEW_ALL), attendanceController.getAllAttendance);

/**
 * @openapi
 * /api/v1/attendance:
 *   post:
 *     tags:
 *       - Attendance
 *     summary: Create attendance record
 *     description: Mark single employee attendance for a specific date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - date
 *               - status
 *             properties:
 *               employeeId:
 *                 type: integer
 *                 example: 5
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-10-09T00:00:00Z
 *               status:
 *                 type: string
 *                 enum: [PRESENT, ABSENT]
 *                 example: PRESENT
 *     responses:
 *       201:
 *         description: Attendance recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 */
router.post(
  '/',
  checkPermission(Permission.ATTENDANCE_CREATE),
  validateRequest(createAttendanceSchema),
  attendanceController.createAttendanceRecord
);

/**
 * @openapi
 * /api/v1/attendance/bulk:
 *   post:
 *     tags:
 *       - Attendance
 *     summary: Bulk upload attendance
 *     description: Upload attendance records via CSV file (columns - employeeId, date, status)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns - employeeId, date, status
 *     responses:
 *       201:
 *         description: Bulk upload successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bulk upload successful
 *                 recordsCreated:
 *                   type: integer
 *                   example: 150
 */
router.post('/bulk', checkPermission(Permission.ATTENDANCE_BULK_UPLOAD), attendanceController.bulkUploadAttendance);

// ─── Sprint 2: Check-In / Check-Out ────────────────────────────────────────
router.post('/checkin',  checkPermission(Permission.ATTENDANCE_VIEW_OWN), attendanceController.checkIn);
router.post('/checkout', checkPermission(Permission.ATTENDANCE_VIEW_OWN), attendanceController.checkOut);

// ─── Sprint 2: Monthly Summary ──────────────────────────────────────────────
router.get('/me/summary', checkPermission(Permission.ATTENDANCE_VIEW_OWN), attendanceController.getMySummary);

// ─── Sprint 2: Correction Requests ─────────────────────────────────────────
router.post(
  '/corrections',
  checkPermission(Permission.ATTENDANCE_VIEW_OWN),
  validateRequest(createCorrectionRequestSchema),
  attendanceController.createCorrectionRequest,
);
router.get(
  '/corrections/mine',
  checkPermission(Permission.ATTENDANCE_VIEW_OWN),
  attendanceController.getMyCorrectionRequests,
);
router.get(
  '/corrections',
  checkPermission(Permission.ATTENDANCE_VIEW_ALL),
  attendanceController.getAllCorrectionRequests,
);
router.patch(
  '/corrections/:id',
  checkPermission(Permission.ATTENDANCE_CREATE),
  validateRequest(updateCorrectionRequestSchema),
  attendanceController.updateCorrectionRequest,
);

export default router;
