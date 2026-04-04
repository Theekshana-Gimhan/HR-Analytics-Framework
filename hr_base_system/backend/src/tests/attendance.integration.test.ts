import request from 'supertest';
import express from 'express';
import cors from 'cors';
import attendanceRoutes from '../routes/attendance.routes';
import { handleError } from '../middleware/error.middleware';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestCompany,
  createTestUser,
  createTestEmployee,
} from './test-helpers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

// Create a test app instance
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use(handleError);
  return app;
};

const generateAccessToken = (userId: number, role: string, companyId: number) => {
  return jwt.sign({ id: userId, role, companyId }, JWT_SECRET, { expiresIn: '15m' });
};

describe('Attendance Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;
  let adminToken: string;
  let testEmployeeId: number;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
    const company = await createTestCompany();
    testCompanyId = company.id;

    // Create an admin user
    const adminUser = await createTestUser(testCompanyId, 'ADMIN');
    // adminUser created but id not required in this test
    adminToken = generateAccessToken(adminUser.id, adminUser.role, testCompanyId);

    // Create a test employee
    const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
    const employee = await createTestEmployee(employeeUser.id);
    testEmployeeId = employee.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/attendance', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/attendance');

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
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: testEmployeeId,
          date: new Date().toISOString(),
          status: 'PRESENT',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should create attendance record with valid data', async () => {
      const testDate = new Date('2024-01-15T08:00:00Z');

      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          date: testDate.toISOString(),
          status: 'PRESENT',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('employeeId', testEmployeeId);
      expect(response.body).toHaveProperty('status', 'PRESENT');
    });

    it('should reject invalid employee ID', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: -1,
          date: new Date().toISOString(),
          status: 'PRESENT',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          date: new Date().toISOString(),
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should accept ABSENT status', async () => {
      const testDate = new Date('2024-01-16T08:00:00Z');

      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: testEmployeeId,
          date: testDate.toISOString(),
          status: 'ABSENT',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'ABSENT');
    });

    it('should not allow cross-company employeeId', async () => {
      const otherCompany = await createTestCompany();
      const otherEmployeeUser = await createTestUser(otherCompany.id, 'EMPLOYEE');
      const otherEmployee = await createTestEmployee(otherEmployeeUser.id);

      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: otherEmployee.id,
          date: new Date('2024-01-17T08:00:00Z').toISOString(),
          status: 'PRESENT',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(String(response.body.message)).toMatch(/Employee not found/i);
    });
  });

  describe('POST /api/v1/attendance/bulk', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/attendance/bulk');

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
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${employeeToken}`)
        .attach('file', Buffer.from('dummy'), 'test.csv');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'No file uploaded');
    });

    it('should reject invalid CSV format', async () => {
      const invalidCsv = 'invalid,data,format\n1,2,3';

      const response = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(invalidCsv), 'invalid.csv');

      // Expecting 400 because invalid CSV format is a client error
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should skip rows for cross-company employees', async () => {
      const otherCompany = await createTestCompany();
      const otherEmployeeUser = await createTestUser(otherCompany.id, 'EMPLOYEE');
      const otherEmployee = await createTestEmployee(otherEmployeeUser.id);

      const csv = [
        'employeeId,date,status',
        `${testEmployeeId},2024-02-01,PRESENT`,
        `${otherEmployee.id},2024-02-02,PRESENT`,
      ].join('\n');

      const response = await request(app)
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csv), 'attendance.csv');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('imported', 1);
      expect(response.body).toHaveProperty('skipped', 1);
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect((response.body.errors as string[]).join(' ')).toMatch(/not found/i);
    });
  });
});
