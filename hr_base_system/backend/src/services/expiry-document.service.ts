import { prisma } from '../prismaClient';
import logger from '../utils/logger';

export interface CreateExpiryDocumentData {
  employeeId: number;
  documentType: string;
  name: string;
  issueDate?: string;
  expiryDate: string;
  alertDaysBefore?: number;
  notes?: string;
  documentId?: number;
}

export interface UpdateExpiryDocumentData {
  documentType?: string;
  name?: string;
  issueDate?: string;
  expiryDate?: string;
  alertDaysBefore?: number;
  notes?: string;
  status?: string;
}

export interface ExpiryDocumentListParams {
  employeeId?: number;
  status?: string;
  documentType?: string;
  expiringWithinDays?: number;
  limit?: number;
  offset?: number;
}

/**
 * List expiry documents for a company with optional filters.
 */
export const listExpiryDocuments = async (companyId: number, params: ExpiryDocumentListParams = {}) => {
  const { employeeId, status, documentType, expiringWithinDays, limit = 50, offset = 0 } = params;

  const where: Record<string, unknown> = {
    employee: { user: { companyId } },
  };

  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (documentType) where.documentType = documentType;
  if (expiringWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + expiringWithinDays);
    where.expiryDate = { lte: futureDate };
    // Only include non-expired non-renewed
    where.status = { in: ['VALID', 'EXPIRING_SOON'] };
  }

  const [documents, total] = await Promise.all([
    prisma.expiryDocument.findMany({
      where,
      include: {
        employee: {
          select: { id: true, first_name: true, last_name: true, job_title: true, department: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.expiryDocument.count({ where }),
  ]);

  return { documents, total, limit, offset };
};

/**
 * Get a single expiry document by ID (scoped to company).
 */
export const getExpiryDocumentById = async (id: number, companyId: number) => {
  const doc = await prisma.expiryDocument.findFirst({
    where: {
      id,
      employee: { user: { companyId } },
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, job_title: true, department: true },
      },
    },
  });

  return doc;
};

/**
 * Create a new expiry document.
 */
export const createExpiryDocument = async (data: CreateExpiryDocumentData, companyId: number) => {
  // Verify employee belongs to company
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, user: { companyId } },
  });

  if (!employee) {
    throw new Error('Employee not found in your company');
  }

  const doc = await prisma.expiryDocument.create({
    data: {
      employeeId: data.employeeId,
      documentType: data.documentType as any,
      name: data.name,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expiryDate: new Date(data.expiryDate),
      alertDaysBefore: data.alertDaysBefore ?? 30,
      notes: data.notes ?? null,
      documentId: data.documentId ?? null,
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true },
      },
    },
  });

  logger.info(`Created expiry document ${doc.id} for employee ${data.employeeId}`);
  return doc;
};

/**
 * Update an expiry document.
 */
export const updateExpiryDocument = async (id: number, data: UpdateExpiryDocumentData, companyId: number) => {
  // Verify document belongs to company
  const existing = await getExpiryDocumentById(id, companyId);
  if (!existing) {
    throw new Error('Expiry document not found');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.documentType !== undefined) updateData.documentType = data.documentType;
  if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate);
  if (data.expiryDate !== undefined) updateData.expiryDate = new Date(data.expiryDate);
  if (data.alertDaysBefore !== undefined) updateData.alertDaysBefore = data.alertDaysBefore;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await prisma.expiryDocument.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true },
      },
    },
  });

  logger.info(`Updated expiry document ${id}`);
  return updated;
};

/**
 * Delete an expiry document.
 */
export const deleteExpiryDocument = async (id: number, companyId: number) => {
  // Verify document belongs to company
  const existing = await getExpiryDocumentById(id, companyId);
  if (!existing) {
    throw new Error('Expiry document not found');
  }

  await prisma.expiryDocument.delete({ where: { id } });
  logger.info(`Deleted expiry document ${id}`);
};

/**
 * Get summary counts for dashboard widget.
 */
export const getExpiryDocumentSummary = async (companyId: number) => {
  const [valid, expiringSoon, expired] = await Promise.all([
    prisma.expiryDocument.count({
      where: { status: 'VALID', employee: { user: { companyId } } },
    }),
    prisma.expiryDocument.count({
      where: { status: 'EXPIRING_SOON', employee: { user: { companyId } } },
    }),
    prisma.expiryDocument.count({
      where: { status: 'EXPIRED', employee: { user: { companyId } } },
    }),
  ]);

  return { valid, expiringSoon, expired, total: valid + expiringSoon + expired };
};
