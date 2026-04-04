import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import {
  validateRequest,
  validateQuery,
  validateParams,
} from '../middleware/validation.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { CACHE_CONFIGS } from '../services/cache';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  employeeIdParamsSchema,
  employeeDocumentParamsSchema,
} from '../schemas/validation.schemas';
import * as employeeController from '../controllers/employee.controller';
import * as documentController from '../controllers/document.controller';
import config from '../config';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024 },
});

const uploadSingleDocument = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err?: any) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds maximum allowed size' : err.message;
      res.status(400).json({ message });
      return;
    }

    next(err);
  });
};

router.use(authenticate);

/**
 * @openapi
 * /api/v1/employees:
 *   get:
 *     tags:
 *       - Employees
 *     summary: Get all employees
 *     description: Retrieve list of all employees in the company. Requires ADMIN or OWNER role.
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/',
  checkPermission(Permission.EMPLOYEE_LIST),
  validateQuery(employeeQuerySchema),
  cacheMiddleware(CACHE_CONFIGS.employees, (req) => {
    // Include query params in cache key so different filters get different cache entries
    const q = req.query;
    const parts = [q.status, q.department, q.page, q.limit].filter(Boolean).map(String);
    return parts.length > 0 ? `list:${parts.join(':')}` : 'list';
  }),
  employeeController.getAllEmployees
);

/**
 * @openapi
 * /api/v1/employees/documents:
 *   get:
 *     tags:
 *       - Employees
 *     summary: List all documents across all employees
 *     description: Returns metadata for all documents in the company. Accessible to admins and owners. Supports optional search parameter.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search documents by filename or employee name
 *     responses:
 *       200:
 *         description: Document metadata list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeDocument'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/documents',
  checkPermission(Permission.DOCUMENT_LIST_ALL),
  documentController.listAllDocuments
);

/**
 * @openapi
 * /api/v1/employees:
 *   post:
 *     tags:
 *       - Employees
 *     summary: Create new employee
 *     description: Add a new employee to the system. Requires ADMIN or OWNER role. Password must be 8+ characters with uppercase, lowercase, and number.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *               - password
 *               - nic
 *               - job_title
 *               - salary
 *               - bank_details
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: Jane
 *               last_name:
 *                 type: string
 *                 example: Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane.smith@simpala.lk
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *                 description: Min 8 chars, must include uppercase, lowercase, and number
 *               nic:
 *                 type: string
 *                 example: 920123456V
 *               job_title:
 *                 type: string
 *                 example: Software Engineer
 *               salary:
 *                 type: number
 *                 example: 150000
 *               bank_details:
 *                 type: string
 *                 example: Bank of Ceylon - 0123456789
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: 1992-01-23
 *               phone_number:
 *                 type: string
 *                 example: +94771234567
 *               address:
 *                 type: string
 *                 example: 123 Main Street, Colombo 03
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/',
  checkPermission(Permission.EMPLOYEE_CREATE),
  validateRequest(createEmployeeSchema),
  employeeController.createEmployee
);

/**
 * @openapi
 * /api/v1/employees/{id}/leave-balance:
 *   get:
 *     tags:
 *       - Employees
 *     summary: Get leave balance for an employee
 *     description: Employees can view their own leave balances. Admins and owners can view any employee's balances.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Leave balance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeId:
 *                   type: integer
 *                 balances:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Employee not found
 */
router.get(
  '/:id/leave-balance',
  checkPermission(Permission.LEAVE_BALANCE_VIEW, Permission.LEAVE_BALANCE_VIEW_SELF),
  employeeController.getEmployeeLeaveBalances
);

/**
 * @openapi
 * /api/v1/employees/{id}:
 *   get:
 *     tags:
 *       - Employees
 *     summary: Get single employee
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Not found
 */
router.get('/:id', checkPermission(Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_VIEW_SELF), employeeController.getEmployee);

/**
 * @openapi
 * /api/v1/employees/{id}:
 *   put:
 *     tags:
 *       - Employees
 *     summary: Update employee
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       description: Partial employee object to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               job_title:
 *                 type: string
 *               salary:
 *                 type: number
 *               bank_details:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated employee
 */
router.put(
  '/:id',
  checkPermission(Permission.EMPLOYEE_UPDATE),
  validateRequest(updateEmployeeSchema),
  employeeController.updateEmployee
);

/**
 * @openapi
 * /api/v1/employees/{id}:
 *   delete:
 *     tags:
 *       - Employees
 *     summary: Soft delete employee
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted (soft) employee
 */
router.delete('/:id', checkPermission(Permission.EMPLOYEE_DELETE), employeeController.deleteEmployee);

/**
 * @openapi
 * /api/v1/employees/documents:
 *   get:
 *     tags:
 *       - Employees
 *     summary: List all documents across all employees
 *     description: Returns metadata for all documents in the company. Accessible to admins and owners. Supports optional search parameter.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search documents by filename or employee name
 *     responses:
 *       200:
 *         description: Document metadata list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeDocument'
 *       401:
 *         description: Unauthorized
 */
// NOTE: Duplicate /documents route removed — handled above at line ~112

/**
 * @openapi
 * /api/v1/employees/{id}/documents:
 *   get:
 *     tags:
 *       - Employees
 *     summary: List employee documents
 *     description: Returns metadata for all documents uploaded for the specified employee. Accessible to admins/owners and the employee themselves.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document metadata list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeDocument'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/:id/documents',
  checkPermission(Permission.DOCUMENT_MANAGE, Permission.DOCUMENT_MANAGE_SELF),
  validateParams(employeeIdParamsSchema),
  documentController.listEmployeeDocuments
);

/**
 * @openapi
 * /api/v1/employees/{id}/documents:
 *   post:
 *     tags:
 *       - Employees
 *     summary: Upload employee document
 *     description: Upload a document (PDF/JPG/PNG) for the specified employee. Accepts multipart/form-data with a single file field named `file`.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeDocument'
 *       400:
 *         description: Validation error or unsupported file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/:id/documents',
  checkPermission(Permission.DOCUMENT_MANAGE, Permission.DOCUMENT_MANAGE_SELF),
  validateParams(employeeIdParamsSchema),
  uploadSingleDocument,
  documentController.uploadEmployeeDocument
);

/**
 * @openapi
 * /api/v1/employees/{id}/documents/{documentId}:
 *   get:
 *     tags:
 *       - Employees
 *     summary: Download employee document
 *     description: Downloads the requested employee document as binary content.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Binary document content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
router.get(
  '/:id/documents/:documentId',
  checkPermission(Permission.DOCUMENT_MANAGE, Permission.DOCUMENT_MANAGE_SELF),
  validateParams(employeeDocumentParamsSchema),
  documentController.downloadEmployeeDocument
);

/**
 * @openapi
 * /api/v1/employees/{id}/documents/{documentId}:
 *   delete:
 *     tags:
 *       - Employees
 *     summary: Delete employee document
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
router.delete(
  '/:id/documents/:documentId',
  checkPermission(Permission.DOCUMENT_MANAGE, Permission.DOCUMENT_MANAGE_SELF),
  validateParams(employeeDocumentParamsSchema),
  documentController.deleteEmployeeDocument
);

export default router;
