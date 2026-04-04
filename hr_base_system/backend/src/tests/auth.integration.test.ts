import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth.routes';
import { handleError } from '../middleware/error.middleware';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestCompany,
  createTestUser,
} from './test-helpers';

// Create a test app instance
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(handleError);
  return app;
};

describe('Authentication Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;

  beforeAll(async () => {
    app = createTestApp();
    await setupTestDatabase();
    const company = await createTestCompany();
    testCompanyId = company.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a test user with known credentials
      const user = await createTestUser(testCompanyId, 'ADMIN');

      const response = await request(app).post('/api/v1/auth/login').send({
        email: user.email, // Use the created user's email
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.expiresIn).toBe(900); // 15 minutes
      expect(response.body.tokenType).toBe('Bearer');
    });

    it('should reject invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('email'),
          }),
        ])
      );
    });

    it('should reject short password', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: '123',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('6 characters'),
          }),
        ])
      );
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should reject missing fields', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      // Login to get a refresh token
      const user = await createTestUser(testCompanyId, 'ADMIN');

      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'password123',
      });

      validRefreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: validRefreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('expiresIn', 900);
      expect(response.body).toHaveProperty('tokenType', 'Bearer');
      expect(response.body).toHaveProperty('refreshToken'); // Should return a new refresh token (rotation)
      expect(response.body.refreshToken).not.toBe(validRefreshToken); // New token should be different
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid_token_12345',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid or expired refresh token');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('should not reuse revoked refresh token', async () => {
      // First, logout to revoke the token
      await request(app).post('/api/v1/auth/logout').send({
        refreshToken: validRefreshToken,
      });

      // Try to use the revoked token
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: validRefreshToken,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid or expired refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      const user = await createTestUser(testCompanyId, 'ADMIN');

      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'password123',
      });

      validRefreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully with valid refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/logout').send({
        refreshToken: validRefreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should return 404 for non-existent refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/logout').send({
        refreshToken: 'non_existent_token_12345',
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Refresh token not found');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/logout').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/v1/auth/logout-all').send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/token|Authorization/i); // Flexible matching
    });

    it('should logout from all devices', async () => {
      const user = await createTestUser(testCompanyId, 'ADMIN');

      // Create multiple sessions
      const login1 = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'password123',
      });

      const login2 = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'password123',
      });

      // Logout from all devices using first session's access token
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${login1.body.accessToken}`)
        .send({});

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty(
        'message',
        'Logged out from all devices successfully'
      );

      // Verify both refresh tokens are invalidated
      const refresh1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login1.body.refreshToken });

      const refresh2 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login2.body.refreshToken });

      expect(refresh1.status).toBe(401);
      expect(refresh2.status).toBe(401);
    });
  });
});
