import { Router } from 'express';
import * as payrollController from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import { validateRequest } from '../middleware/validation.middleware';
import { generatePayslipSchema, generateBankFileSchema, runPayrollSchema } from '../schemas/validation.schemas';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/payroll/payslips:
 *   get:
 *     tags:
 *       - Payroll
 *     summary: Get payslips
 *     description: Retrieve a list of payslips with optional filtering by year, month, and employee. Admins can see all payslips, employees can only see their own.
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *           example: 2025
 *         description: Filter by year
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           example: 10
 *         description: Filter by month (1-12)
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filter by employee ID (admin only)
 *     responses:
 *       200:
 *         description: List of payslips
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payslip'
 *       401:
 *         description: Unauthorized
 */
router.get('/payslips', checkPermission(Permission.PAYSLIP_VIEW, Permission.PAYSLIP_VIEW_SELF), payrollController.getPayslips);

/**
 * @openapi
 * /api/v1/payroll/generate:
 *   post:
 *     tags:
 *       - Payroll
 *     summary: Generate payslip
 *     description: Generate payslip for an employee with EPF (8% employee, 12% employer), ETF (3% employer), and PAYE tax calculations per Sri Lankan regulations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - month
 *               - year
 *             properties:
 *               employeeId:
 *                 type: integer
 *                 example: 5
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 9
 *                 description: Month (1-12)
 *               year:
 *                 type: integer
 *                 minimum: 2000
 *                 maximum: 2100
 *                 example: 2025
 *     responses:
 *       201:
 *         description: Payslip generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payslip'
 *       400:
 *         description: Validation error or payslip already exists
 */
router.post(
  '/generate',
  checkPermission(Permission.PAYSLIP_GENERATE),
  validateRequest(generatePayslipSchema),
  payrollController.generatePayslip
);

router.post(
  '/run',
  checkPermission(Permission.PAYROLL_RUN),
  validateRequest(runPayrollSchema),
  payrollController.runPayroll
);

/**
 * @openapi
 * /api/v1/payroll/bank-file:
 *   post:
 *     tags:
 *       - Payroll
 *     summary: Generate bank transfer file
 *     description: Generate a CIPS or SLIPS compliant CSV file for salary disbursement across employee bank accounts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *               - fileType
 *             properties:
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 9
 *               year:
 *                 type: integer
 *                 minimum: 2000
 *                 maximum: 2100
 *                 example: 2025
 *               fileType:
 *                 type: string
 *                 enum: [CIPS, SLIPS]
 *                 example: CIPS
 *               bankCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional list of Sri Lankan bank codes to filter the export.
 *               narration:
 *                 type: string
 *                 description: Override the default narration used in the export file.
 *     responses:
 *       200:
 *         description: CSV bank transfer file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validation error
 *       404:
 *         description: No payslips found for the given criteria
 */
router.post(
  '/bank-file',
  checkPermission(Permission.BANK_FILE_GENERATE),
  validateRequest(generateBankFileSchema),
  payrollController.generateBankFileExport
);

router.get('/payslips/:id', checkPermission(Permission.PAYSLIP_VIEW, Permission.PAYSLIP_VIEW_SELF), payrollController.getPayslipById);

/**
 * @openapi
 * /api/v1/payroll/payslips/{id}/pdf:
 *   get:
 *     tags:
 *       - Payroll
 *     summary: Download payslip PDF
 *     description: Generate a branded PDF payslip for the specified payslip record, including employee information, deductions, and employer contributions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Unique ID of the payslip
 *     responses:
 *       200:
 *         description: Payslip PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid payslip id
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Payslip not found
 */
router.get(
  '/payslips/:id/pdf',
  checkPermission(Permission.PAYSLIP_DOWNLOAD_PDF, Permission.PAYSLIP_DOWNLOAD_PDF_SELF),
  payrollController.downloadPayslipPdf
);

/**
 * @openapi
 * /api/v1/payroll/statistics:
 *   get:
 *     tags:
 *       - Payroll
 *     summary: Get payroll statistics
 *     description: Get payroll statistics for a specific month and year.
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *         description: Month (1-12)
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Year
 *     responses:
 *       200:
 *         description: Payroll statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalGrossPay:
 *                   type: number
 *                 totalNetPay:
 *                   type: number
 *                 totalEpfEmployee:
 *                   type: number
 *                 totalEpfEmployer:
 *                   type: number
 *                 totalEtf:
 *                   type: number
 *                 totalPaye:
 *                   type: number
 *                 employeeCount:
 *                   type: number
 */
router.get(
  '/statistics',
  checkPermission(Permission.PAYROLL_STATISTICS),
  payrollController.getPayrollStatistics
);

export default router;
