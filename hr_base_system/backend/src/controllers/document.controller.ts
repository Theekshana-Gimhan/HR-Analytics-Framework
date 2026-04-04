import { Response, NextFunction } from 'express';
import { prisma } from '../prismaClient';
import { CustomRequest } from '../middleware/auth.middleware';
import { isManagerRole } from '../middleware/rbac';
import * as documentService from '../services/document.service';
import logger from '../utils/logger';
import * as path from 'path';

const ALLOWED_FILE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const ensureEmployeeAccess = async (req: CustomRequest, employeeId: number) => {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, isActive: true },
    select: { id: true, userId: true, user: { select: { companyId: true } } },
  });

  if (!employee) {
    return { status: 404 as const, employee: null };
  }

  const user = req.user;
  if (!user) {
    return { status: 401 as const, employee: null };
  }

  const isAdmin = isManagerRole(user.role);
  const isSelf = !isAdmin && employee.userId === user.id;

  // Enforce tenant isolation for admin/owner access
  if (isAdmin && employee.user.companyId !== user.companyId) {
    return { status: 404 as const, employee: null };
  }

  if (!isAdmin && !isSelf) {
    return { status: 403 as const, employee: null };
  }

  return { status: 200 as const, employee };
};

export const uploadEmployeeDocument = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    if (Number.isNaN(employeeId) || employeeId <= 0) {
      return res.status(400).json({ message: 'Invalid employee id' });
    }

    const access = await ensureEmployeeAccess(req, employeeId);
    if (access.status !== 200) {
      return res.status(access.status).json({ message: 'Access denied or employee not found' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const fileExtension = path.extname(file.originalname ?? '').toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.has(fileExtension)) {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    if (!documentService.ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    if (file.size > documentService.MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ message: 'File exceeds maximum allowed size' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const category = typeof req.body?.category === 'string' ? req.body.category : undefined;

    const document = await documentService.uploadDocument({
      employeeId,
      uploadedBy: req.user.id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      category,
    });

    logger.info('Employee document uploaded', {
      employeeId,
      uploadedBy: req.user.id,
      documentId: document.id,
      originalName: document.originalName,
    });

    return res.status(201).json({
      id: document.id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      storageProvider: document.storageProvider,
      category: document.category,
      createdAt: document.createdAt,
      uploadedBy: document.uploadedBy,
    });
  } catch (error) {
    next(error);
  }
};

export const listEmployeeDocuments = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    if (Number.isNaN(employeeId) || employeeId <= 0) {
      return res.status(400).json({ message: 'Invalid employee id' });
    }

    const access = await ensureEmployeeAccess(req, employeeId);
    if (access.status !== 200) {
      return res.status(access.status).json({ message: 'Access denied or employee not found' });
    }

    const documents = await documentService.listEmployeeDocuments(employeeId);
    return res.json({ items: documents });
  } catch (error) {
    next(error);
  }
};

export const downloadEmployeeDocument = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const documentId = parseInt(req.params.documentId, 10);

    if (
      Number.isNaN(employeeId) ||
      employeeId <= 0 ||
      Number.isNaN(documentId) ||
      documentId <= 0
    ) {
      return res.status(400).json({ message: 'Invalid id supplied' });
    }

    const access = await ensureEmployeeAccess(req, employeeId);
    if (access.status !== 200) {
      return res.status(access.status).json({ message: 'Access denied or employee not found' });
    }

    const { metadata, stream } = await documentService.getEmployeeDocument(employeeId, documentId);

    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(metadata.originalName)}"`
    );

    stream.on('error', (error) => {
      logger.error('Stream error while downloading employee document', {
        error,
        employeeId,
        documentId,
      });
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to download document' });
      } else {
        res.destroy(error);
      }
    });

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployeeDocument = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    const documentId = parseInt(req.params.documentId, 10);

    if (
      Number.isNaN(employeeId) ||
      employeeId <= 0 ||
      Number.isNaN(documentId) ||
      documentId <= 0
    ) {
      return res.status(400).json({ message: 'Invalid id supplied' });
    }

    const access = await ensureEmployeeAccess(req, employeeId);
    if (access.status !== 200) {
      return res.status(access.status).json({ message: 'Access denied or employee not found' });
    }

    const deleted = await documentService.deleteEmployeeDocument(employeeId, documentId);
    if (!deleted) {
      return res.status(404).json({ message: 'Document not found' });
    }

    logger.info('Employee document deleted', {
      employeeId,
      documentId,
      user: req.user?.id,
    });

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const listAllDocuments = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const search = req.query.search as string | undefined;
    const documents = await documentService.listAllDocuments(req.user.companyId, search);

    // Transform to match frontend expectations with camelCase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedDocuments = documents.map((doc: any) => ({
      id: doc.id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      storageProvider: doc.storageProvider,
      createdAt: doc.createdAt,
      uploadedBy: doc.uploadedBy,
      employeeId: doc.employeeId,
      employee: doc.employee ? {
        firstName: doc.employee.first_name,
        lastName: doc.employee.last_name,
        jobTitle: doc.employee.job_title,
      } : undefined,
    }));

    return res.json({ items: transformedDocuments });
  } catch (error) {
    next(error);
  }
};
