import { prisma } from '../prismaClient';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

/**
 * Standard audit action constants for consistent logging across the application.
 */
export const AuditAction = {
  // Leave
  LEAVE_REQUESTED: 'LEAVE_REQUESTED',
  LEAVE_APPROVED: 'LEAVE_APPROVED',
  LEAVE_REJECTED: 'LEAVE_REJECTED',
  LEAVE_TYPE_CREATED: 'LEAVE_TYPE_CREATED',
  LEAVE_TYPE_UPDATED: 'LEAVE_TYPE_UPDATED',
  LEAVE_TYPE_DELETED: 'LEAVE_TYPE_DELETED',

  // Payroll
  PAYROLL_RUN: 'PAYROLL_RUN',
  PAYSLIP_GENERATED: 'PAYSLIP_GENERATED',
  BANK_FILE_EXPORTED: 'BANK_FILE_EXPORTED',

  // Employee management
  EMPLOYEE_CREATED: 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED: 'EMPLOYEE_UPDATED',
  EMPLOYEE_DELETED: 'EMPLOYEE_DELETED',
  EMPLOYEE_DOCUMENT_UPLOADED: 'EMPLOYEE_DOCUMENT_UPLOADED',
  EMPLOYEE_DOCUMENT_DELETED: 'EMPLOYEE_DOCUMENT_DELETED',

  // Roster / Shifts
  SHIFT_TEMPLATE_CREATED: 'SHIFT_TEMPLATE_CREATED',
  SHIFT_TEMPLATE_UPDATED: 'SHIFT_TEMPLATE_UPDATED',
  SHIFT_TEMPLATE_DELETED: 'SHIFT_TEMPLATE_DELETED',
  SHIFT_ASSIGNED: 'SHIFT_ASSIGNED',

  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Admin
  PROFILE_UPDATED: 'PROFILE_UPDATED',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

export interface AuditLogEntry {
  userId: number;
  companyId: number;
  action: AuditActionType;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record an audit log entry. This is fire-and-forget to avoid
 * blocking the request — failures are logged but never thrown.
 */
export const recordAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        companyId: entry.companyId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        details: entry.details ?? (Prisma.JsonNull as any),
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (error) {
    // Never let audit logging break the main flow
    logger.error('Failed to record audit log', { entry, error });
  }
};

/**
 * Query audit logs for a company with optional filters.
 */
export const getAuditLogs = async (
  companyId: number,
  options: {
    userId?: number;
    action?: string;
    entityType?: string;
    entityId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
) => {
  const { userId, action, entityType, entityId, startDate, endDate, limit = 50, offset = 0 } = options;

  const where: Record<string, unknown> = { companyId };

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
};
