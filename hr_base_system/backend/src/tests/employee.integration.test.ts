import request from 'supertest';
import express from 'express';
import cors from 'cors';
import employeeRoutes from '../routes/employee.routes';
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
import { resetCache } from '../services/cache';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

// Create a test app instance
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/employees', employeeRoutes);
  app.use(handleError);
  return app;
};

const generateAccessToken = (userId: number, role: string, companyId: number) => {
  return jwt.sign({ id: userId, role, companyId }, JWT_SECRET, { expiresIn: '15m' });
};

describe('Employee Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;
  let adminToken: string;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
    const company = await createTestCompany();
    testCompanyId = company.id;

    // Create an admin user
    const adminUser = await createTestUser(testCompanyId, 'ADMIN');
    // adminUser created for auth; id not directly used in this test file
    adminToken = generateAccessToken(adminUser.id, adminUser.role, testCompanyId);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/employees', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/employees');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/token|Authorization/i);
    });

    it('should return empty array when no employees exist', async () => {
      const response = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({ total: 0 });
    });

    it('should return list of employees', async () => {
      // Create a test employee using the helper function
      const user = await createTestUser(testCompanyId, 'EMPLOYEE');
      await createTestEmployee(user.id);

      // Clear cache to avoid stale empty results from prior test
      resetCache();

      const response = await request(app)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('POST /api/v1/employees', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/employees').send({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        nic: 'NIC123456',
        job_title: 'Developer',
        salary: 50000,
        bank_details: 'Bank Account 123',
      });

      expect(response.status).toBe(401);
    });

    it('should require admin or owner role', async () => {
      const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      const employeeToken = generateAccessToken(employeeUser.id, 'EMPLOYEE', testCompanyId);

      const response = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'password123',
          nic: 'NIC123456',
          job_title: 'Developer',
          salary: 50000,
          bank_details: 'Bank Account 123',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Forbidden: insufficient permissions');
    });

    it('should create employee with valid data', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'Jane',
          last_name: 'Smith',
          email: `jane${timestamp}@example.com`,
          password: 'Password123', // Updated to meet strong password requirements: min 8 chars, uppercase, lowercase, number
          nic: `NIC${timestamp}`,
          job_title: 'Designer',
          salary: 60000,
          bank_details: 'Bank Account 456',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name', 'Jane');
      expect(response.body).toHaveProperty('last_name', 'Smith');
      expect(response.body).toHaveProperty('nic', `NIC${timestamp}`);
      expect(response.body).toHaveProperty('job_title', 'Designer');
      // Prisma returns Decimal as string
      expect(Number(response.body.salary)).toBe(60000);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          email: 'invalid-email',
          password: 'Password123',
          nic: 'NIC789',
          job_title: 'Developer',
          salary: 50000,
          bank_details: 'Bank Account 789',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
          }),
        ])
      );
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'John',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('should reject negative salary', async () => {
      const response = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'Password123',
          nic: 'NIC999',
          job_title: 'Developer',
          salary: -1000,
          bank_details: 'Bank Account 999',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'salary',
            message: expect.stringContaining('positive'),
          }),
        ])
      );
    });
  });

  describe('GET /api/v1/employees/:id/leave-balance', () => {
    let employeeToken: string;
    let employeeId: number;

    beforeEach(async () => {
      const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      employeeToken = generateAccessToken(employeeUser.id, 'EMPLOYEE', testCompanyId);
      const employee = await createTestEmployee(employeeUser.id);
      employeeId = employee.id;

      await prisma.leaveType.create({
        data: {
          companyId: testCompanyId,
          name: `Annual Leave ${Date.now()}`,
          defaultBalance: 14,
        },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/v1/employees/${employeeId}/leave-balance`);

      expect(response.status).toBe(401);
    });

    it('should allow employee to view their own balances', async () => {
      const response = await request(app)
        .get(`/api/v1/employees/${employeeId}/leave-balance`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employeeId', employeeId);
      expect(Array.isArray(response.body.balances)).toBe(true);
      expect(response.body.balances.length).toBeGreaterThan(0);
    });

    it('should prevent employees from viewing other employees balances', async () => {
      const otherUser = await createTestUser(testCompanyId, 'EMPLOYEE');
      const otherToken = generateAccessToken(otherUser.id, 'EMPLOYEE', testCompanyId);

      const response = await request(app)
        .get(`/api/v1/employees/${employeeId}/leave-balance`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Forbidden');
    });

    it('should allow admins to view any employee balance', async () => {
      const response = await request(app)
        .get(`/api/v1/employees/${employeeId}/leave-balance`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employeeId', employeeId);
    });
  });
});
