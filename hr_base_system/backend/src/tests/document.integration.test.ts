import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import employeeRoutes from '../routes/employee.routes';
import { handleError } from '../middleware/error.middleware';
import config from '../config';
import { resetStorageProvider } from '../storage';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestCompany,
  createTestUser,
  createTestEmployee,
  clearEmployeeDocuments,
  findEmployeeDocumentById,
} from './test-helpers';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

const TEST_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'test-documents');

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

describe('Employee Documents Integration Tests', () => {
  let app: express.Application;
  let testCompanyId: number;
  let adminToken: string;
  let adminUserId: number;
  let employeeToken: string;
  let employeeUserId: number;
  let employeeId: number;

  beforeAll(async () => {
    await fs.rm(TEST_UPLOAD_ROOT, { recursive: true, force: true });
    config.LOCAL_STORAGE_ROOT = TEST_UPLOAD_ROOT;
    resetStorageProvider();

    app = createTestApp();
    await setupTestDatabase();

    const company = await createTestCompany();
    testCompanyId = company.id;

    const adminUser = await createTestUser(testCompanyId, 'ADMIN');
    adminUserId = adminUser.id;
    adminToken = generateAccessToken(adminUser.id, adminUser.role, testCompanyId);

    const employeeUser = await createTestUser(testCompanyId, 'EMPLOYEE');
    employeeUserId = employeeUser.id;
    employeeToken = generateAccessToken(employeeUser.id, employeeUser.role, testCompanyId);
    const employee = await createTestEmployee(employeeUser.id);
    employeeId = employee.id;
  });

  afterEach(async () => {
    await clearEmployeeDocuments();
    await fs.rm(TEST_UPLOAD_ROOT, { recursive: true, force: true });
    resetStorageProvider();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await fs.rm(TEST_UPLOAD_ROOT, { recursive: true, force: true });
    resetStorageProvider();
  });

  it('should reject unauthenticated upload attempts', async () => {
    const response = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .attach('file', Buffer.from('contract'), 'contract.pdf');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message', 'No token provided');
  });

  it('should prevent employees from uploading documents for other employees', async () => {
    const otherUser = await createTestUser(testCompanyId, 'EMPLOYEE');
    await createTestEmployee(otherUser.id);
    const otherToken = generateAccessToken(otherUser.id, 'EMPLOYEE', testCompanyId);

    const response = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('file', Buffer.from('contract'), 'contract.pdf');

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message', 'Access denied or employee not found');
  });

  it('should reject unsupported file types', async () => {
    const response = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('text'), 'notes.txt');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Unsupported file type');
  });

  it('should reject .exe uploads even if the MIME type is spoofed', async () => {
    const response = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('not really a pdf'), {
        filename: 'malware.exe',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Unsupported file type');
  });

  it('should reject oversized uploads', async () => {
    const oversizedBuffer = Buffer.alloc(config.DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024 + 1, 1);

    const response = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', oversizedBuffer, { filename: 'large.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'File exceeds maximum allowed size');
  });

  it('should allow an admin to manage the full document lifecycle', async () => {
    const fileBuffer = Buffer.from('Employee Contract PDF Content');

    const uploadResponse = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fileBuffer, { filename: 'contract.pdf', contentType: 'application/pdf' });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body).toMatchObject({
      originalName: 'contract.pdf',
      mimeType: 'application/pdf',
      storageProvider: 'local',
      uploadedBy: adminUserId,
    });

    const documentId = uploadResponse.body.id;
    expect(typeof documentId).toBe('number');

    const listResponse = await request(app)
      .get(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items).toHaveLength(1);
    expect(listResponse.body.items[0]).toMatchObject({
      id: documentId,
      originalName: 'contract.pdf',
      mimeType: 'application/pdf',
      uploadedBy: adminUserId,
    });

    const downloadResponse = await request(app)
      .get(`/api/v1/employees/${employeeId}/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer()
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on('data', (chunk: Buffer) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
        res.on('error', (err: Error) => callback(err, null));
      });

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-type']).toBe('application/pdf');
    expect(Buffer.isBuffer(downloadResponse.body)).toBe(true);
    expect(downloadResponse.body.equals(fileBuffer)).toBe(true);

    const documentRecord = await findEmployeeDocumentById(documentId);
    expect(documentRecord).not.toBeNull();
    const storagePath = documentRecord!.storagePath;

    const storageFilePath = path.join(TEST_UPLOAD_ROOT, storagePath);
    await expect(fs.access(storageFilePath)).resolves.not.toThrow();

    const deleteResponse = await request(app)
      .delete(`/api/v1/employees/${employeeId}/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toHaveProperty('message', 'Document deleted successfully');

    const listAfterDelete = await request(app)
      .get(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.body.items).toHaveLength(0);

    await expect(findEmployeeDocumentById(documentId)).resolves.toBeNull();
    await expect(fs.access(storageFilePath)).rejects.toThrow();
  });

  it('should allow an employee to manage their own documents', async () => {
    const fileBuffer = Buffer.from('Employee self-upload');

    const uploadResponse = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .attach('file', fileBuffer, { filename: 'selfie.png', contentType: 'image/png' });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body).toMatchObject({
      originalName: 'selfie.png',
      mimeType: 'image/png',
      uploadedBy: employeeUserId,
    });

    const documentId = uploadResponse.body.id;

    const downloadResponse = await request(app)
      .get(`/api/v1/employees/${employeeId}/documents/${documentId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .buffer()
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on('data', (chunk: Buffer) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
        res.on('error', (err: Error) => callback(err, null));
      });

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.body.equals(fileBuffer)).toBe(true);
  });
});
