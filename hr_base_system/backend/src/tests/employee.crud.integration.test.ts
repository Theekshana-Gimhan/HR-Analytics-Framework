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
} from './test-helpers';
import jwt from 'jsonwebtoken';

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

describe('Employee CRUD Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;
  let adminToken: string;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
    const company = await createTestCompany();
    testCompanyId = company.id;

    const adminUser = await createTestUser(testCompanyId, 'ADMIN');
    // adminUser created for auth; id not directly used in this test
    adminToken = generateAccessToken(adminUser.id, adminUser.role, testCompanyId);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('GET /api/v1/employees/:id should return 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/v1/employees/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'Employee not found');
  });

  it('should create, retrieve, update and delete an employee', async () => {
    // Create user and employee via helpers
    const user = await createTestUser(testCompanyId, 'EMPLOYEE');
    const createdEmployee = await createTestEmployee(user.id);

    // GET by id
    const getRes = await request(app)
      .get(`/api/v1/employees/${createdEmployee.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty('id', createdEmployee.id);

    // Update
    const updateRes = await request(app)
      .put(`/api/v1/employees/${createdEmployee.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ job_title: 'Updated Title', salary: 75000 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toHaveProperty('job_title', 'Updated Title');
    expect(updateRes.body.salary).toBe('75000');

    // Search with pagination
    const searchRes = await request(app)
      .get('/api/v1/employees')
      .query({ search: 'Updated', page: '1', limit: '10' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body).toHaveProperty('data');
    expect(Array.isArray(searchRes.body.data)).toBe(true);
    expect(searchRes.body).toHaveProperty('pagination');

    // Delete (soft)
    const delRes = await request(app)
      .delete(`/api/v1/employees/${createdEmployee.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body).toHaveProperty('message', 'Employee deleted (soft)');
  });
});
