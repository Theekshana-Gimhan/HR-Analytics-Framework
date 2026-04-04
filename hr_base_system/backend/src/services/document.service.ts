import { Readable } from 'stream';
import { EmployeeDocument } from '@prisma/client';
import { prisma } from '../prismaClient';
import { getStorageProvider } from '../storage';
import config from '../config';
import logger from '../utils/logger';
import { NotFoundError } from '../middleware/error.middleware';

export const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export const MAX_FILE_SIZE_BYTES = config.DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024;

export type UploadDocumentInput = {
  employeeId: number;
  uploadedBy: number;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  category?: string;
};

export const uploadDocument = async (input: UploadDocumentInput): Promise<EmployeeDocument> => {
  const { employeeId, uploadedBy, originalName, mimeType, buffer, category } = input;

  const storage = getStorageProvider();
  const storageResult = await storage.save({
    employeeId,
    originalName,
    mimeType,
    buffer,
  });

  try {
    return await prisma.employeeDocument.create({
      data: {
        employeeId,
        uploadedBy,
        originalName,
        storedName: storageResult.storedName,
        mimeType,
        size: storageResult.size,
        storageProvider: config.STORAGE_DRIVER,
        storagePath: storageResult.storagePath,
        ...(category ? { category: category as import('@prisma/client').DocumentCategory } : {}),
      },
    });
  } catch (error) {
    logger.error('Failed to persist employee document metadata, rolling back file save', {
      error,
      employeeId,
      uploadedBy,
      originalName,
    });

    await storage.delete(storageResult.storagePath).catch((deleteError) => {
      logger.error('Failed to clean up orphaned employee document file', {
        employeeId,
        deleteError,
      });
    });
    throw error;
  }
};

export const listEmployeeDocuments = async (employeeId: number) => {
  return prisma.employeeDocument.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      storageProvider: true,
      createdAt: true,
      uploadedBy: true,
    },
  });
};

export const listAllDocuments = async (companyId: number, search?: string) => {
  return prisma.employeeDocument.findMany({
    where: {
      employee: {
        user: {
          companyId,
        },
      },
      ...(search && {
        OR: [
          { originalName: { contains: search, mode: 'insensitive' } },
          {
            employee: {
              OR: [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      storageProvider: true,
      createdAt: true,
      uploadedBy: true,
      employeeId: true,
      employee: {
        select: {
          first_name: true,
          last_name: true,
          job_title: true,
        },
      },
    },
  });
};

export const getEmployeeDocument = async (
  employeeId: number,
  documentId: number
): Promise<{ metadata: EmployeeDocument; stream: Readable }> => {
  const document = await prisma.employeeDocument.findFirst({
    where: {
      id: documentId,
      employeeId,
    },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  const storage = getStorageProvider();
  const exists = await storage.exists(document.storagePath);
  if (!exists) {
    logger.error('Document metadata exists but file is missing from storage', {
      documentId,
      employeeId,
    });
    throw new NotFoundError('Document file missing from storage');
  }

  const stream = await storage.getStream(document.storagePath);
  return { metadata: document, stream };
};

export const deleteEmployeeDocument = async (employeeId: number, documentId: number) => {
  const document = await prisma.employeeDocument.findFirst({
    where: {
      id: documentId,
      employeeId,
    },
  });

  if (!document) {
    return null;
  }

  const storage = getStorageProvider();
  await storage.delete(document.storagePath);

  await prisma.employeeDocument.delete({
    where: { id: documentId },
  });

  return document;
};
