import request from 'supertest';
import express from 'express';
import cors from 'cors';
import employeeRoutes from '../routes/employee.routes';
import attendanceRoutes from '../routes/attendance.routes';
import payrollRoutes from '../routes/payroll.routes';
import leaveRoutes from '../routes/leave.routes';
import { handleError } from '../middleware/error.middleware';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestCompany,
  createTestUser,
  createTestEmployee,
} from './test-helpers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

// Create a test app instance
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/payroll', payrollRoutes);
  app.use('/api/v1/leave', leaveRoutes);
  app.use(handleError);
  return app;
};

const generateAccessToken = (userId: number, role: string, companyId: number) => {
  return jwt.sign({ id: userId, role, companyId }, JWT_SECRET, { expiresIn: '15m' });
};

const generateExpiredAccessToken = (userId: number, role: string, companyId: number) => {
  return jwt.sign({ id: userId, role, companyId }, JWT_SECRET, { expiresIn: '-10s' });
};

describe('Authorization Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;
  let ownerToken: string;
  let adminToken: string;
  let employeeToken: string;
  let employeeUserId: number;
  let employeeId: number;
  let otherEmployeeId: number;
  let leaveTypeId: number;
  let payslipId: number;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
    const company = await createTestCompany();
    testCompanyId = company.id;

    // Create OWNER user
    const ownerUser = await createTestUser(testCompanyId, 'OWNER');
    ownerToken = generateAccessToken(ownerUser.id, ownerUser.role, testCompanyId);

    // Create ADMIN user
    const adminUser = await createTestUser(testCompanyId, 'ADMIN');
    adminToken = generateAccessToken(adminUser.id, adminUser.role, testCompanyId);

    // Create EMPLOYEE user
    const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
    employeeUserId = employeeUser.id;
    const employee = await createTestEmployee(employeeUser.id);
    employeeId = employee.id;
    employeeToken = generateAccessToken(employeeUser.id, employeeUser.role, testCompanyId);

    // Create another EMPLOYEE user (for cross-access tests)
    const otherEmployeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
    const otherEmployee = await createTestEmployee(otherEmployeeUser.id);
    otherEmployeeId = otherEmployee.id;

    // Create a leave type
    const leaveType = await prisma.leaveType.create({
      data: {
        companyId: testCompanyId,
        name: 'Annual Leave',
        defaultBalance: 14,
      },
    });
    leaveTypeId = leaveType.id;

    // Create leave balance for employee
    await prisma.employeeLeaveBalance.create({
      data: {
        employeeId,
        leaveTypeId,
        accrued: 14,
        used: 0,
        carriedForward: 0,
      },
    });

    // Create a payslip for the employee
    const payslip = await prisma.payslip.create({
      data: {
        employeeId,
        month: 10,
        year: 2024,
        gross_pay: 50000,
        epf_employee: 4000,
        epf_employer: 6000,
        etf: 1500,
        paye: 2000,
        net_pay: 44000,
      },
    });
    payslipId = payslip.id;

    // Create attendance record for employee
    await prisma.attendanceRecord.create({
      data: {
        employeeId,
        date: new Date('2024-11-01'),
        status: 'PRESENT',
      },
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // ==========================================
  // LEAVE TYPES - GET /api/v1/leave/types
  // ==========================================
  describe('GET /api/v1/leave/types', () => {
    it('should allow OWNER to view leave types', async () => {
      const response = await request(app)
        .get('/api/v1/leave/types')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow ADMIN to view leave types', async () => {
      const response = await request(app)
        .get('/api/v1/leave/types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow EMPLOYEE to view leave types', async () => {
      const response = await request(app)
        .get('/api/v1/leave/types')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('name', 'Annual Leave');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/v1/leave/types');

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = generateExpiredAccessToken(employeeUserId, 'EMPLOYEE', testCompanyId);

      const response = await request(app)
        .get('/api/v1/leave/types')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  // ==========================================
  // LEAVE TYPES - POST /api/v1/leave/types
  // ==========================================
  describe('POST /api/v1/leave/types', () => {
    it('should allow OWNER to create leave type', async () => {
      const response = await request(app)
        .post('/api/v1/leave/types')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          companyId: testCompanyId,
          name: 'Sick Leave',
          defaultBalance: 7,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', 'Sick Leave');
    });

    it('should allow ADMIN to create leave type', async () => {
      const response = await request(app)
        .post('/api/v1/leave/types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId: testCompanyId,
          name: 'Casual Leave',
          defaultBalance: 7,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', 'Casual Leave');
    });

    it('should reject EMPLOYEE from creating leave type', async () => {
      const response = await request(app)
        .post('/api/v1/leave/types')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          companyId: testCompanyId,
          name: 'Unauthorized Leave',
          defaultBalance: 5,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ==========================================
  // EMPLOYEE PROFILE - GET /api/v1/employees/:id
  // ==========================================
  describe('GET /api/v1/employees/:id', () => {
    it('should allow OWNER to view any employee profile', async () => {
      const response = await request(app)
        .get(`/api/v1/employees/${employeeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', employeeId);
      expect(response.body).toHaveProperty('first_name');
    });

    it('should allow ADMIN to view any employee profile', async () => {
      const response = await request(app)
        .get(`/api/v1/employees/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', employeeId);
    });

    it('should allow EMPLOYEE to view their own profile', async () => {
      const response = await request(app)
        .get(`/api/v1/employees/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', employeeId);
      expect(response.body).toHaveProperty('userId', employeeUserId);
    });

    it('should forbid EMPLOYEE from viewing another employee profile', async () => {
      const response = await request(app)
        .get(`/api/v1/employees/${otherEmployeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/own profile/i);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get(`/api/v1/employees/${employeeId}`);

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // ATTENDANCE - GET /api/v1/attendance/me
  // ==========================================
  describe('GET /api/v1/attendance/me', () => {
    it('should allow EMPLOYEE to view their own attendance', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/me')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('employeeId', employeeId);
      expect(response.body[0]).toHaveProperty('status', 'PRESENT');
    });

    it('should allow ADMIN to view attendance via /me endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/me')
        .set('Authorization', `Bearer ${adminToken}`);

      // Admin doesn't have employee record, should get 404
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Employee not found');
    });

    it('should support date filtering for EMPLOYEE', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/me?month=11&year=2024')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/v1/attendance/me');

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // ATTENDANCE - POST /api/v1/attendance
  // ==========================================
  describe('POST /api/v1/attendance', () => {
    it('should allow OWNER to create attendance record', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          employeeId,
          date: new Date('2024-11-15').toISOString(),
          status: 'PRESENT',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'PRESENT');
    });

    it('should allow ADMIN to create attendance record', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId,
          date: new Date('2024-11-16').toISOString(),
          status: 'ABSENT',
        });

      expect(response.status).toBe(201);
    });

    it('should reject EMPLOYEE from creating attendance record', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId,
          date: new Date('2024-11-17').toISOString(),
          status: 'PRESENT',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ==========================================
  // PAYSLIPS - GET /api/v1/payroll/payslips
  // ==========================================
  describe('GET /api/v1/payroll/payslips', () => {
    it('should allow OWNER to view all payslips', async () => {
      const response = await request(app)
        .get('/api/v1/payroll/payslips')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow ADMIN to view all payslips', async () => {
      const response = await request(app)
        .get('/api/v1/payroll/payslips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow EMPLOYEE to view only their own payslips', async () => {
      const response = await request(app)
        .get('/api/v1/payroll/payslips')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      // All payslips should belong to the employee
      response.body.forEach((payslip: { employeeId: number }) => {
        expect(payslip.employeeId).toBe(employeeId);
      });
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/v1/payroll/payslips');

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // PAYSLIP PDF - GET /api/v1/payroll/payslips/:id/pdf
  // ==========================================
  describe('GET /api/v1/payroll/payslips/:id/pdf', () => {
    it('should allow OWNER to download any payslip PDF', async () => {
      const response = await request(app)
        .get(`/api/v1/payroll/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should allow ADMIN to download any payslip PDF', async () => {
      const response = await request(app)
        .get(`/api/v1/payroll/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should allow EMPLOYEE to download their own payslip PDF', async () => {
      const response = await request(app)
        .get(`/api/v1/payroll/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('payslip_');
    });

    it('should forbid EMPLOYEE from downloading another employee payslip PDF', async () => {
      // Create payslip for other employee
      const otherPayslip = await prisma.payslip.create({
        data: {
          employeeId: otherEmployeeId,
          month: 10,
          year: 2024,
          gross_pay: 60000,
          epf_employee: 4800,
          epf_employer: 7200,
          etf: 1800,
          paye: 2500,
          net_pay: 52700,
        },
      });

      const response = await request(app)
        .get(`/api/v1/payroll/payslips/${otherPayslip.id}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/own payslips/i);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get(`/api/v1/payroll/payslips/${payslipId}/pdf`);

      expect(response.status).toBe(401);
    });
  });

  // ==========================================
  // EMPLOYEE LIST - GET /api/v1/employees
  // ==========================================
  describe('GET /api/v1/employees', () => {
    it('should allow OWNER to view all employees', async () => {
      const response = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should allow ADMIN to view all employees', async () => {
      const response = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should reject EMPLOYEE from viewing all employees', async () => {
      const response = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ==========================================
  // PAYROLL GENERATION - POST /api/v1/payroll/generate
  // ==========================================
  describe('POST /api/v1/payroll/generate', () => {
    it('should allow OWNER to generate payslip', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          employeeId,
          month: 11,
          year: 2024,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('month', 11);
      expect(response.body).toHaveProperty('year', 2024);
    });

    it('should allow ADMIN to generate payslip', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: otherEmployeeId,
          month: 11,
          year: 2024,
        });

      expect(response.status).toBe(201);
    });

    it('should reject EMPLOYEE from generating payslip', async () => {
      const response = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId,
          month: 12,
          year: 2024,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ==========================================
  // TENANT ISOLATION (CROSS-COMPANY)
  // ==========================================
  describe('Cross-company tenant isolation', () => {
    let otherCompanyId: number;
    let otherOwnerToken: string;
    let otherEmployeeId: number;
    let otherPayslipId: number;

    beforeAll(async () => {
      const otherCompany = await createTestCompany();
      otherCompanyId = otherCompany.id;

      const otherOwnerUser = await createTestUser(otherCompanyId, 'OWNER');
      otherOwnerToken = generateAccessToken(otherOwnerUser.id, otherOwnerUser.role, otherCompanyId);

      const otherEmployeeUser = await createTestUser(otherCompanyId, 'EMPLOYEE');
      const otherEmployee = await createTestEmployee(otherEmployeeUser.id);
      otherEmployeeId = otherEmployee.id;

      await prisma.leaveType.create({
        data: { companyId: otherCompanyId, name: 'Other Company Leave', defaultBalance: 10 },
      });

      const otherPayslip = await prisma.payslip.create({
        data: {
          employeeId: otherEmployeeId,
          month: 10,
          year: 2024,
          gross_pay: 60000,
          epf_employee: 4800,
          epf_employer: 7200,
          etf: 1800,
          paye: 3000,
          net_pay: 50400,
        },
      });
      otherPayslipId = otherPayslip.id;
    });

    it('should not allow OWNER to access another company employee', async () => {
      const response = await request(app)
        .get(`/api/v1/employees/${otherEmployeeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });

    it('should scope leave types by companyId', async () => {
      const companyAResponse = await request(app)
        .get('/api/v1/leave/types')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(companyAResponse.status).toBe(200);
      expect(companyAResponse.body.some((t: { name: string }) => t.name === 'Other Company Leave')).toBe(false);

      const companyBResponse = await request(app)
        .get('/api/v1/leave/types')
        .set('Authorization', `Bearer ${otherOwnerToken}`);

      expect(companyBResponse.status).toBe(200);
      expect(companyBResponse.body.some((t: { name: string }) => t.name === 'Other Company Leave')).toBe(true);
    });

    it('should not include other company payslips in listing', async () => {
      const response = await request(app)
        .get('/api/v1/payroll/payslips')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.some((p: { id: number }) => p.id === otherPayslipId)).toBe(false);
    });

    it('should not allow downloading another company payslip pdf', async () => {
      const response = await request(app)
        .get(`/api/v1/payroll/payslips/${otherPayslipId}/pdf`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });
});
