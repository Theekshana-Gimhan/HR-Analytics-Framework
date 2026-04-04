import request from 'supertest';
import express from 'express';
import cors from 'cors';
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
  app.use('/api/v1/leave', leaveRoutes);
  app.use(handleError);
  return app;
};

const generateAccessToken = (userId: number, role: string, companyId: number) => {
  return jwt.sign({ id: userId, role, companyId }, JWT_SECRET, { expiresIn: '15m' });
};

describe('Leave Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;
  let adminToken: string;
  let employeeToken: string;
  let testEmployeeId: number;
  let testLeaveTypeId: number;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
    const company = await createTestCompany();
    testCompanyId = company.id;

    // Create an admin user
    const adminUser = await createTestUser(testCompanyId, 'ADMIN');
    // adminUser created for auth; id not directly used in this test
    adminToken = generateAccessToken(adminUser.id, adminUser.role, testCompanyId);

    // Create a test employee
    const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
    const employee = await createTestEmployee(employeeUser.id);
    testEmployeeId = employee.id;
    employeeToken = generateAccessToken(employeeUser.id, employeeUser.role, testCompanyId);

    // Create a leave type
    const leaveType = await prisma.leaveType.create({
      data: {
        companyId: testCompanyId,
        name: 'Annual Leave',
        defaultBalance: 14,
      },
    });
    testLeaveTypeId = leaveType.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/leave/types', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/leave/types');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|Authorization/i);
    });

    it('should require admin or owner role', async () => {
      const response = await request(app)
        .post('/api/v1/leave/types')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          companyId: testCompanyId,
          name: 'Sick Leave',
          defaultBalance: 7,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should create leave type with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/leave/types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId: testCompanyId,
          name: 'Medical Leave',
          defaultBalance: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Medical Leave');
      // Statutory cap forces Medical Leave to 7 days
      expect(Number(response.body.defaultBalance)).toBe(7);
      expect(response.body).toHaveProperty('requiresAnniversary', true);
    });

    it('should reject negative default balance', async () => {
      const response = await request(app)
        .post('/api/v1/leave/types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId: testCompanyId,
          name: 'Invalid Leave',
          defaultBalance: -5,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/leave/types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId: testCompanyId,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PUT /api/v1/leave/types/:id', () => {
    it('should require admin or owner role', async () => {
      const response = await request(app)
        .put(`/api/v1/leave/types/${testLeaveTypeId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });

    it('should update leave type fields', async () => {
      // Use a fresh leave type to avoid mutating base statutory type
      const editableType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: 'Editable Leave',
          defaultBalance: 5,
          requiresAnniversary: false,
        },
      });

      const response = await request(app)
        .put(`/api/v1/leave/types/${editableType.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Editable Leave Updated',
          defaultBalance: 15,
          requiresAnniversary: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', editableType.id);
      expect(response.body).toHaveProperty('name', 'Editable Leave Updated');
      expect(Number(response.body.defaultBalance)).toBe(15);
      expect(response.body).toHaveProperty('requiresAnniversary', true);
    });

    it('should reject empty payloads', async () => {
      const editableType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: 'Empty Payload Guard',
          defaultBalance: 8,
        },
      });

      const response = await request(app)
        .put(`/api/v1/leave/types/${editableType.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('DELETE /api/v1/leave/types/:id', () => {
    it('should require admin or owner role', async () => {
      const response = await request(app)
        .delete(`/api/v1/leave/types/${testLeaveTypeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should block deletion when leave requests exist', async () => {
      const protectedType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: 'Protected Type',
          defaultBalance: 20,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 120);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 120);

      const applyResponse = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: protectedType.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(applyResponse.status).toBe(201);

      const deleteResponse = await request(app)
        .delete(`/api/v1/leave/types/${protectedType.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(400);
      expect(deleteResponse.body).toHaveProperty('message');
    });

    it('should delete leave type when no requests exist', async () => {
      const deletableType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: 'Temp Type',
          defaultBalance: 1,
        },
      });

      const response = await request(app)
        .delete(`/api/v1/leave/types/${deletableType.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', deletableType.id);
      expect(response.body).toHaveProperty('name', 'Temp Type');
    });
  });

  describe('POST /api/v1/leave/apply', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/leave/apply');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|Authorization/i);
    });

    it('should apply for leave with valid data', async () => {
      // Use future dates to pass past date validation
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9);

      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: testLeaveTypeId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('employeeId', testEmployeeId);
      expect(response.body).toHaveProperty('leaveTypeId', testLeaveTypeId);
      expect(response.body).toHaveProperty('status', 'PENDING');
    });

    it('should block overlapping leave requests', async () => {
      const today = new Date();
      const firstStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
      const firstEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 16);

      const firstResponse = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: testLeaveTypeId,
          start_date: firstStart.toISOString(),
          end_date: firstEnd.toISOString(),
        });

      expect(firstResponse.status).toBe(201);

      const overlapStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15);
      const overlapEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 17);

      const overlapResponse = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: testLeaveTypeId,
          start_date: overlapStart.toISOString(),
          end_date: overlapEnd.toISOString(),
        });

      expect(overlapResponse.status).toBe(409);
      expect(overlapResponse.body.message).toMatch(/overlapping/i);
    });

    it('should block leave requests when balance is insufficient', async () => {
      const lowBalanceLeaveType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: `Low Balance Leave ${Date.now()}`,
          defaultBalance: 1,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 23);

      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: lowBalanceLeaveType.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Insufficient leave balance/i);
    });

    it('should reject invalid leave type ID', async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);

      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: -1,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: testLeaveTypeId,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject past start dates', async () => {
      const pastDate = new Date('2020-01-01');
      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: testLeaveTypeId,
          start_date: pastDate.toISOString(),
          end_date: pastDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/past|Start date/i);
    });

    it('should cap annual leave to statutory entitlement per year', async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 50); // >14 days to trigger cap

      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: testLeaveTypeId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/14/);
      expect(response.body.message).toMatch(/Insufficient leave balance/i);
    });

    it('should allow requesting exactly the available balance', async () => {
      const exactType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: `Exact Balance Leave ${Date.now()}`,
          defaultBalance: 3,
        },
      });

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 50);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 52); // 3 days

      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: exactType.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(Number(response.body.totalDays)).toBe(3);
    });

    it('should block anniversary-gated leave before the first anniversary', async () => {
      const newEmployeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      await createTestEmployee(newEmployeeUser.id, {
        employmentStartDate: new Date(),
      });
      const newEmployeeToken = generateAccessToken(
        newEmployeeUser.id,
        newEmployeeUser.role,
        testCompanyId
      );

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12);

      const response = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${newEmployeeToken}`)
        .send({
          leaveTypeId: testLeaveTypeId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Insufficient leave balance/i);
    });

    it('should handle year-boundary leave counts and deductions', async () => {
      const boundaryType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: `Boundary Leave ${Date.now()}`,
          defaultBalance: 10,
        },
      });

      const startDate = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 11, 29)); // Dec 29 next year
      const endDate = new Date(Date.UTC(new Date().getUTCFullYear() + 2, 0, 3)); // Jan 3 following year

      const applyResponse = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: boundaryType.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(applyResponse.status).toBe(201);

      const totalDays = Number(applyResponse.body.totalDays);
      expect(totalDays).toBe(6);

      const approveResponse = await request(app)
        .post(`/api/v1/leave/requests/${applyResponse.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveResponse.status).toBe(200);

      const balance = await prisma.employeeLeaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: testEmployeeId,
            leaveTypeId: boundaryType.id,
          },
        },
      });

      expect(balance).not.toBeNull();
      expect(Number(balance?.used)).toBe(totalDays);
    });
  });

  describe('GET /api/v1/leave/requests/:id', () => {
    let testLeaveRequestId: number;

    beforeEach(async () => {
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          employeeId: testEmployeeId,
          leaveTypeId: testLeaveTypeId,
          start_date: new Date('2026-01-10'),
          end_date: new Date('2026-01-12'),
          status: 'PENDING',
          totalDays: 3,
        },
      });
      testLeaveRequestId = leaveRequest.id;
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/v1/leave/requests/${testLeaveRequestId}`);
      expect(response.status).toBe(401);
    });

    it('should allow employee to fetch their own request', async () => {
      const response = await request(app)
        .get(`/api/v1/leave/requests/${testLeaveRequestId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLeaveRequestId);
      expect(response.body).toHaveProperty('employeeId', testEmployeeId);
    });

    it('should allow admin to fetch request by id', async () => {
      const response = await request(app)
        .get(`/api/v1/leave/requests/${testLeaveRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLeaveRequestId);
    });
  });

  describe('Leave edge cases (year boundary, exact balance)', () => {
    it('should calculate totalDays correctly across year boundary', async () => {
      const yearBoundaryType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: `Year Boundary Leave ${Date.now()}`,
          defaultBalance: 14,
          requiresAnniversary: false,
        },
      });

      const now = new Date();
      // Use a later year than other boundary tests to avoid overlapping leave windows
      const startDate = new Date(Date.UTC(now.getUTCFullYear() + 2, 11, 31));
      const endDate = new Date(Date.UTC(now.getUTCFullYear() + 3, 0, 2));

      const applyResponse = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveTypeId: yearBoundaryType.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(applyResponse.status).toBe(201);
      expect(Number(applyResponse.body.totalDays)).toBe(3);

      const approveResponse = await request(app)
        .post(`/api/v1/leave/requests/${applyResponse.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body).toHaveProperty('status', 'APPROVED');
    });

    it('should allow applying when requestedDays equals available balance', async () => {
      const exactType = await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: `Exact Balance Leave ${Date.now()}`,
          defaultBalance: 2,
          requiresAnniversary: false,
        },
      });

      const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      const todayUtc = new Date();
      const employmentStartDate = new Date(
        Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate())
      );
      const employee = await createTestEmployee(employeeUser.id, { employmentStartDate });
      const token = generateAccessToken(employeeUser.id, employeeUser.role, testCompanyId);

      const startDate = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() + 30));
      const endDate = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() + 31));

      const applyResponse = await request(app)
        .post('/api/v1/leave/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          leaveTypeId: exactType.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      expect(applyResponse.status).toBe(201);
      expect(Number(applyResponse.body.totalDays)).toBe(2);

      const approveResponse = await request(app)
        .post(`/api/v1/leave/requests/${applyResponse.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body).toHaveProperty('status', 'APPROVED');

      const balance = await prisma.employeeLeaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: employee.id,
            leaveTypeId: exactType.id,
          },
        },
      });

      expect(balance).toBeTruthy();
      expect(Number(balance?.used ?? 0)).toBeCloseTo(2, 6);
    });
  });

  describe('PATCH /api/v1/leave/:id/status', () => {
    let testLeaveRequestId: number;

    beforeEach(async () => {
      // Create a leave request to test status updates using future dates after employment start
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12);

      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          employeeId: testEmployeeId,
          leaveTypeId: testLeaveTypeId,
          start_date: startDate,
          end_date: endDate,
          status: 'PENDING',
        },
      });
      testLeaveRequestId = leaveRequest.id;
    });

    it('should require authentication', async () => {
      const response = await request(app).patch(`/api/v1/leave/${testLeaveRequestId}/status`);

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|Authorization/i);
    });

    it('should require admin or owner role', async () => {
      const response = await request(app)
        .patch(`/api/v1/leave/${testLeaveRequestId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should approve leave request', async () => {
      const response = await request(app)
        .patch(`/api/v1/leave/${testLeaveRequestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLeaveRequestId);
      expect(response.body).toHaveProperty('status', 'APPROVED');
    });

    it('should reject leave request', async () => {
      const response = await request(app)
        .patch(`/api/v1/leave/${testLeaveRequestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'REJECTED');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch(`/api/v1/leave/${testLeaveRequestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject missing status', async () => {
      const response = await request(app)
        .patch(`/api/v1/leave/${testLeaveRequestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/v1/leave/requests/:id/approve and /reject', () => {
    let testLeaveRequestId: number;

    beforeEach(async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 16);

      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          employeeId: testEmployeeId,
          leaveTypeId: testLeaveTypeId,
          start_date: startDate,
          end_date: endDate,
          status: 'PENDING',
          totalDays: 2,
        },
      });
      testLeaveRequestId = leaveRequest.id;
    });

    it('should approve leave request via approve endpoint', async () => {
      const response = await request(app)
        .post(`/api/v1/leave/requests/${testLeaveRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLeaveRequestId);
      expect(response.body).toHaveProperty('status', 'APPROVED');
    });

    it('should reject leave request via reject endpoint (no body)', async () => {
      const response = await request(app)
        .post(`/api/v1/leave/requests/${testLeaveRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLeaveRequestId);
      expect(response.body).toHaveProperty('status', 'REJECTED');
    });
  });
});
