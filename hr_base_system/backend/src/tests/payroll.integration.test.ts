import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request, { Response } from 'supertest';
import express from 'express';
import cors from 'cors';
import payrollRoutes from '../routes/payroll.routes';
import { handleError } from '../middleware/error.middleware';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestCompany,
  createTestUser,
  createTestEmployee,
  prisma,
} from './test-helpers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

// Create a test app instance
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/payroll', payrollRoutes);
  app.use(handleError); // Add error handler for proper error responses
  return app;
};

const generateAccessToken = (userId: number, role: string, companyId: number) => {
  return jwt.sign({ id: userId, role, companyId }, JWT_SECRET, { expiresIn: '15m' });
};

const captureBuffer = (
  res: Response,
  callback: (err: Error | null, data: Buffer | null) => void
) => {
  const data: Buffer[] = [];
  res.on('data', (chunk: Buffer) => data.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(data)));
  res.on('error', (err: Error) => callback(err, null));
};

describe('Payroll Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;
  let adminToken: string;
  let testEmployeeId: number;
  let employeeToken: string;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
    const company = await createTestCompany();
    testCompanyId = company.id;

    // Create an admin user
    const adminUser = await createTestUser(testCompanyId, 'ADMIN');
    adminToken = generateAccessToken(adminUser.id, adminUser.role, testCompanyId);

    // Create a test employee
    const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
    employeeToken = generateAccessToken(employeeUser.id, employeeUser.role, testCompanyId);
    const employee = await createTestEmployee(employeeUser.id);
    testEmployeeId = employee.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/payroll/generate', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/payroll/generate');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|Authorization/i);
    });

    it('should require admin or owner role', async () => {
      const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      const employeeToken = generateAccessToken(
        employeeUser.id,
        employeeUser.role,
        testCompanyId
      );

      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should generate payslip with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('employeeId', testEmployeeId);
      expect(response.body).toHaveProperty('month', 1);
      expect(response.body).toHaveProperty('year', 2024);
      expect(response.body).toHaveProperty('gross_pay');
      expect(response.body).toHaveProperty('epf_employee');
      expect(response.body).toHaveProperty('epf_employer');
      expect(response.body).toHaveProperty('etf');
      expect(response.body).toHaveProperty('paye');
      expect(response.body).toHaveProperty('net_pay');
    });

    it('should reject invalid employee ID', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: -1,
          month: 1,
          year: 2024,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject invalid month', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 13,
          year: 2024,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject invalid year', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 1,
          year: 1999,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should calculate EPF correctly', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 2,
          year: 2024,
        });

      expect(response.status).toBe(201);

      // Verify EPF calculations (8% employee, 12% employer on gross pay)
      // Note: Prisma Decimal values are returned as strings
      const grossPay = Number(response.body.gross_pay);
      const expectedEmployeeEPF = grossPay * 0.08;
      const expectedEmployerEPF = grossPay * 0.12;

      expect(Number(response.body.epf_employee)).toBeCloseTo(expectedEmployeeEPF, 2);
      expect(Number(response.body.epf_employer)).toBeCloseTo(expectedEmployerEPF, 2);
    });

    it('should calculate ETF correctly', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 3,
          year: 2024,
        });

      expect(response.status).toBe(201);

      // Verify ETF calculations (3% of gross pay)
      // Note: Prisma Decimal values are returned as strings
      const grossPay = Number(response.body.gross_pay);
      const expectedETF = grossPay * 0.03;

      expect(Number(response.body.etf)).toBeCloseTo(expectedETF, 2);
    });

    it('should calculate net pay correctly', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 4,
          year: 2024,
        });

      expect(response.status).toBe(201);

      // Verify net pay = gross - epf_employee - paye
      // Note: Prisma Decimal values are returned as strings
      const expectedNetPay =
        Number(response.body.gross_pay) - Number(response.body.epf_employee) - Number(response.body.paye);

      expect(Number(response.body.net_pay)).toBeCloseTo(expectedNetPay, 2);
    });
  });

  describe('GET /api/v1/payroll/payslips/:id/pdf', () => {
    let generatedPayslipId: number;

    beforeAll(async () => {
      const creationResponse = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          month: 5,
          year: 2024,
        });

      generatedPayslipId = creationResponse.body.id;
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/v1/payroll/payslips/${generatedPayslipId}/pdf`);

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|Authorization/i);
    });

    it('should return 404 for unknown payslip', async () => {
      const response = await request(app)
        .get('/api/v1/payroll/payslips/9999/pdf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should provide a PDF file for valid request', async () => {
      const response = await request(app)
        .get(`/api/v1/payroll/payslips/${generatedPayslipId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer()
        .parse(captureBuffer);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment; filename="payslip_');
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(1000);
      expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('GET /api/v1/payroll/payslips', () => {
    const listMonth = 6;
    const listYear = 2024;
    let otherEmployeeId: number;

    beforeAll(async () => {
      const otherEmployeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      const otherEmployee = await createTestEmployee(otherEmployeeUser.id);
      otherEmployeeId = otherEmployee.id;

      // Generate one payslip for each employee in the same period
      await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: testEmployeeId, month: listMonth, year: listYear });

      await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: otherEmployeeId, month: listMonth, year: listYear });
    });

    it('should allow an employee to view only their own payslips', async () => {
      const response = await request(app)
        .get(`/api/v1/payroll/payslips?month=${listMonth}&year=${listYear}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('employeeId', testEmployeeId);
    });

    it('should forbid an employee from requesting another employee\'s payslips via query params', async () => {
      const response = await request(app)
        .get(`/api/v1/payroll/payslips?month=${listMonth}&year=${listYear}&employeeId=${otherEmployeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/Forbidden/i);
    });
  });

  describe('POST /api/v1/payroll/bank-file', () => {
    const exportMonth = 7;
    const exportYear = 2024;
    beforeAll(async () => {
      const employeeUserOne = await createTestUser(testCompanyId, 'EMPLOYEE');
      const employeeOne = await createTestEmployee(employeeUserOne.id, {
        bank_name: 'Commercial Bank of Ceylon PLC',
        bank_code: '7056',
        branch_code: '001',
        account_number: '7056000001',
      });

      const employeeUserTwo = await createTestUser(testCompanyId, 'EMPLOYEE');
      const employeeTwo = await createTestEmployee(employeeUserTwo.id, {
        bank_name: 'Bank of Ceylon',
        bank_code: '7010',
        branch_code: '123',
        account_number: '7010000002',
      });

      const payloads = [
        { employeeId: employeeOne.id, month: exportMonth, year: exportYear },
        { employeeId: employeeTwo.id, month: exportMonth, year: exportYear },
      ];

      for (const payload of payloads) {
        await request(app)
          .post('/api/v1/payroll/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload);
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/bank-file')
        .send({ month: exportMonth, year: exportYear, fileType: 'CIPS' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|Authorization/i);
    });

    it('should generate a CIPS CSV file and persist export metadata', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/bank-file')
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer()
        .parse(captureBuffer)
        .send({
          month: exportMonth,
          year: exportYear,
          fileType: 'CIPS',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('.csv');
      expect(response.headers['x-export-id']).toBeDefined();
      expect(response.headers['x-total-records']).toBe('2');

      const csvContent = (response.body as Buffer).toString('utf-8');
      expect(csvContent).toContain(
        'Sequence,BankCode,BranchCode,AccountNumber,AccountName,Amount,Currency,Narrative,Reference'
      );
      const csvLines = csvContent.trim().split('\n');
      expect(csvLines.length).toBeGreaterThanOrEqual(3); // header + two detail lines

      const exportId = Number(response.headers['x-export-id']);
      const exportRecord = await prisma.bankFileExport.findUnique({ where: { id: exportId } });

      expect(exportRecord).not.toBeNull();
      expect(exportRecord?.totalRecords).toBe(2);
      expect(exportRecord?.fileType).toBe('CIPS');
      expect(exportRecord?.bankCode).toBe('MULTI');
      expect(exportRecord?.month).toBe(exportMonth);
      expect(exportRecord?.year).toBe(exportYear);
    });

    it('should allow filtering by bank code when generating SLIPS files', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/bank-file')
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer()
        .parse(captureBuffer)
        .send({
          month: exportMonth,
          year: exportYear,
          fileType: 'SLIPS',
          bankCodes: ['7010'],
        });

      expect(response.status).toBe(200);
      expect(response.headers['x-total-records']).toBe('1');

      const csvRows = (response.body as Buffer).toString('utf-8').trim().split('\n');
      expect(csvRows.length).toBe(2); // header + one record
      expect(csvRows[1]).toContain('7010');

      const exportId = Number(response.headers['x-export-id']);
      const exportRecord = await prisma.bankFileExport.findUnique({ where: { id: exportId } });
      expect(exportRecord?.bankCode).toBe('7010');
      expect(exportRecord?.fileType).toBe('SLIPS');
    });

    it('should surface validation errors when bank metadata is incomplete', async () => {
      const invalidUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      const invalidEmployee = await createTestEmployee(invalidUser.id, {
        bank_name: null,
        bank_code: null,
        branch_code: null,
        account_number: null,
      });

      await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: invalidEmployee.id,
          month: 8,
          year: exportYear,
        });

      const response = await request(app)
        .post('/api/v1/payroll/bank-file')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 8,
          year: exportYear,
          fileType: 'CIPS',
        });

      expect(response.status).toBe(422);
      expect(response.body).toBeDefined();
      expect(response.body.message || response.text).toMatch(/Missing bank metadata/i);
    });

    it('should surface validation errors when bank metadata format is invalid', async () => {
      const invalidUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      const invalidEmployee = await createTestEmployee(invalidUser.id, {
        bank_name: 'Commercial Bank of Ceylon PLC',
        bank_code: '70A6',
        branch_code: '12',
        account_number: 'ABC123',
      });

      await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: invalidEmployee.id,
          month: 9,
          year: exportYear,
        });

      const response = await request(app)
        .post('/api/v1/payroll/bank-file')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 9,
          year: exportYear,
          fileType: 'CIPS',
        });

      expect(response.status).toBe(422);
      expect(response.body).toBeDefined();
      expect(response.body.message || response.text).toMatch(/Invalid bank metadata/i);
      expect(response.body.message || response.text).toContain(String(invalidEmployee.id));
    });

    it('should return 404 when no payslips exist for the given period', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/bank-file')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2030,
          fileType: 'SLIPS',
        });

      expect(response.status).toBe(404);
      expect(response.body).toBeDefined();
      expect(response.body.message || response.text).toMatch(/No payslips found/i);
    });
  });
});
