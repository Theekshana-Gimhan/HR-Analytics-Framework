/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Replaces hardcoded `authorize(['ADMIN', 'OWNER'])` calls with semantic
 * permission checks: `checkPermission('EMPLOYEE_CREATE')`.
 *
 * Permissions are mapped to roles in a central registry. To add a new
 * permission, add it to the `Permission` enum, then assign it to the
 * appropriate roles in `ROLE_PERMISSIONS`.
 *
 * When granular role differentiation is needed (e.g., OWNER-only actions),
 * simply adjust the mapping here — no route files need to change.
 */

import { Response, NextFunction } from 'express';
import { CustomRequest } from './auth.middleware';
import logger from '../utils/logger';

// ── Permission Enum ─────────────────────────────────────────────────────────

export enum Permission {
  // Employee management
  EMPLOYEE_LIST = 'EMPLOYEE_LIST',
  EMPLOYEE_CREATE = 'EMPLOYEE_CREATE',
  EMPLOYEE_VIEW = 'EMPLOYEE_VIEW', // any employee (admins)
  EMPLOYEE_VIEW_SELF = 'EMPLOYEE_VIEW_SELF', // own profile only
  EMPLOYEE_UPDATE = 'EMPLOYEE_UPDATE',
  EMPLOYEE_DELETE = 'EMPLOYEE_DELETE',

  // Documents
  DOCUMENT_LIST_ALL = 'DOCUMENT_LIST_ALL', // company-wide document listing
  DOCUMENT_MANAGE = 'DOCUMENT_MANAGE', // upload/download/delete for any employee
  DOCUMENT_MANAGE_SELF = 'DOCUMENT_MANAGE_SELF', // own documents only

  // Leave management
  LEAVE_TYPE_VIEW = 'LEAVE_TYPE_VIEW',
  LEAVE_TYPE_CREATE = 'LEAVE_TYPE_CREATE',
  LEAVE_TYPE_UPDATE = 'LEAVE_TYPE_UPDATE',
  LEAVE_TYPE_DELETE = 'LEAVE_TYPE_DELETE',
  LEAVE_REQUEST_VIEW = 'LEAVE_REQUEST_VIEW', // all requests
  LEAVE_REQUEST_VIEW_SELF = 'LEAVE_REQUEST_VIEW_SELF', // own requests
  LEAVE_REQUEST_CREATE = 'LEAVE_REQUEST_CREATE',
  LEAVE_REQUEST_APPROVE = 'LEAVE_REQUEST_APPROVE',
  LEAVE_REQUEST_REJECT = 'LEAVE_REQUEST_REJECT',
  LEAVE_BALANCE_VIEW = 'LEAVE_BALANCE_VIEW', // any employee's balance
  LEAVE_BALANCE_VIEW_SELF = 'LEAVE_BALANCE_VIEW_SELF', // own balance

  // Payroll
  PAYSLIP_VIEW = 'PAYSLIP_VIEW', // all payslips
  PAYSLIP_VIEW_SELF = 'PAYSLIP_VIEW_SELF', // own payslips
  PAYSLIP_GENERATE = 'PAYSLIP_GENERATE',
  PAYROLL_RUN = 'PAYROLL_RUN',
  BANK_FILE_GENERATE = 'BANK_FILE_GENERATE',
  PAYSLIP_DOWNLOAD_PDF = 'PAYSLIP_DOWNLOAD_PDF', // any payslip PDF
  PAYSLIP_DOWNLOAD_PDF_SELF = 'PAYSLIP_DOWNLOAD_PDF_SELF', // own payslip PDF
  PAYROLL_STATISTICS = 'PAYROLL_STATISTICS',

  // Attendance
  ATTENDANCE_VIEW_OWN = 'ATTENDANCE_VIEW_OWN',
  ATTENDANCE_VIEW_ALL = 'ATTENDANCE_VIEW_ALL',
  ATTENDANCE_DAILY_LOG = 'ATTENDANCE_DAILY_LOG',
  ATTENDANCE_CREATE = 'ATTENDANCE_CREATE',
  ATTENDANCE_BULK_UPLOAD = 'ATTENDANCE_BULK_UPLOAD',

  // Dashboard
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',

  // Shift & Roster
  SHIFT_TEMPLATE_VIEW = 'SHIFT_TEMPLATE_VIEW',
  SHIFT_TEMPLATE_MANAGE = 'SHIFT_TEMPLATE_MANAGE',
  ROSTER_VIEW = 'ROSTER_VIEW',
  ROSTER_ASSIGN = 'ROSTER_ASSIGN',

  // System
  SYSTEM_JOB_RUN = 'SYSTEM_JOB_RUN',

  // User Management
  USER_MANAGE = 'USER_MANAGE',

  // Company Settings
  COMPANY_VIEW = 'COMPANY_VIEW',
  COMPANY_EDIT = 'COMPANY_EDIT',

  // Audit
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW',

  // Expiry Documents
  EXPIRY_DOCUMENT_VIEW = 'EXPIRY_DOCUMENT_VIEW',
  EXPIRY_DOCUMENT_MANAGE = 'EXPIRY_DOCUMENT_MANAGE',
}

// ── Role Type ───────────────────────────────────────────────────────────────

export type Role = 'OWNER' | 'ADMIN' | 'EMPLOYEE';

// ── Role → Permission Map ───────────────────────────────────────────────────

const OWNER_PERMISSIONS: ReadonlySet<Permission> = new Set(
  Object.values(Permission) as Permission[],
);

const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set([
  // Employee management
  Permission.EMPLOYEE_LIST,
  Permission.EMPLOYEE_CREATE,
  Permission.EMPLOYEE_VIEW,
  Permission.EMPLOYEE_VIEW_SELF,
  Permission.EMPLOYEE_UPDATE,
  Permission.EMPLOYEE_DELETE,

  // Documents
  Permission.DOCUMENT_LIST_ALL,
  Permission.DOCUMENT_MANAGE,
  Permission.DOCUMENT_MANAGE_SELF,

  // Leave
  Permission.LEAVE_TYPE_VIEW,
  Permission.LEAVE_TYPE_CREATE,
  Permission.LEAVE_TYPE_UPDATE,
  Permission.LEAVE_TYPE_DELETE,
  Permission.LEAVE_REQUEST_VIEW,
  Permission.LEAVE_REQUEST_VIEW_SELF,
  Permission.LEAVE_REQUEST_CREATE,
  Permission.LEAVE_REQUEST_APPROVE,
  Permission.LEAVE_REQUEST_REJECT,
  Permission.LEAVE_BALANCE_VIEW,
  Permission.LEAVE_BALANCE_VIEW_SELF,

  // Payroll
  Permission.PAYSLIP_VIEW,
  Permission.PAYSLIP_VIEW_SELF,
  Permission.PAYSLIP_GENERATE,
  Permission.PAYROLL_RUN,
  Permission.BANK_FILE_GENERATE,
  Permission.PAYSLIP_DOWNLOAD_PDF,
  Permission.PAYSLIP_DOWNLOAD_PDF_SELF,
  Permission.PAYROLL_STATISTICS,

  // Attendance
  Permission.ATTENDANCE_VIEW_OWN,
  Permission.ATTENDANCE_VIEW_ALL,
  Permission.ATTENDANCE_DAILY_LOG,
  Permission.ATTENDANCE_CREATE,
  Permission.ATTENDANCE_BULK_UPLOAD,

  // Dashboard
  Permission.DASHBOARD_VIEW,

  // Shift & Roster
  Permission.SHIFT_TEMPLATE_VIEW,
  Permission.SHIFT_TEMPLATE_MANAGE,
  Permission.ROSTER_VIEW,
  Permission.ROSTER_ASSIGN,

  // Shift & Roster
  Permission.SHIFT_TEMPLATE_VIEW,
  Permission.SHIFT_TEMPLATE_MANAGE,
  Permission.ROSTER_VIEW,
  Permission.ROSTER_ASSIGN,

  // No SYSTEM_JOB_RUN for ADMIN

  // Company Settings
  Permission.COMPANY_VIEW,
  Permission.COMPANY_EDIT,

  // Expiry Documents
  Permission.EXPIRY_DOCUMENT_VIEW,
  Permission.EXPIRY_DOCUMENT_MANAGE,
]);

const EMPLOYEE_PERMISSIONS: ReadonlySet<Permission> = new Set([
  // Self-service only
  Permission.EMPLOYEE_VIEW_SELF,

  // Documents (own)
  Permission.DOCUMENT_MANAGE_SELF,

  // Leave
  Permission.LEAVE_TYPE_VIEW,
  Permission.LEAVE_REQUEST_VIEW_SELF,
  Permission.LEAVE_REQUEST_CREATE,
  Permission.LEAVE_BALANCE_VIEW_SELF,

  // Payroll (own)
  Permission.PAYSLIP_VIEW_SELF,
  Permission.PAYSLIP_DOWNLOAD_PDF_SELF,

  // Attendance (own)
  Permission.ATTENDANCE_VIEW_OWN,

  // Shift & Roster (view only)
  Permission.SHIFT_TEMPLATE_VIEW,
  Permission.ROSTER_VIEW,

  // Company Settings
  Permission.COMPANY_VIEW,
]);

/**
 * Central role → permissions registry.
 * Add new roles here when needed (e.g., MANAGER, HR_OFFICER).
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  OWNER: OWNER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  EMPLOYEE: EMPLOYEE_PERMISSIONS,
};

// ── Helper Functions ────────────────────────────────────────────────────────

/** Check if a role has a specific permission */
export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  return perms ? perms.has(permission) : false;
}

/** Check if a role has ANY of the given permissions */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Check if a role is a manager role (ADMIN or OWNER) */
export function isManagerRole(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

// ── Middleware ───────────────────────────────────────────────────────────────

/**
 * Permission-based authorization middleware.
 *
 * Usage:
 *   router.get('/employees', authenticate, checkPermission(Permission.EMPLOYEE_LIST), controller.list);
 *
 * For routes accessible by multiple permission levels (e.g., admin sees all, employee sees own):
 *   router.get('/:id', authenticate, checkPermission(Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_VIEW_SELF), controller.get);
 *   // The controller then narrows scope based on `isManagerRole(req.user.role)`
 */
export function checkPermission(...requiredPermissions: Permission[]) {
  return (req: CustomRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRole = req.user.role;
    const granted = hasAnyPermission(userRole, requiredPermissions);

    if (!granted) {
      logger.warn(
        `RBAC denied: user=${req.user.id} role=${userRole} ` +
        `required=[${requiredPermissions.join(',')}] path=${req.path}`
      );
      res.status(403).json({ message: 'Forbidden: insufficient permissions' });
      return;
    }

    logger.debug(
      `RBAC granted: user=${req.user.id} role=${userRole} ` +
      `permission=${requiredPermissions.find((p) => hasPermission(userRole, p))}`
    );
    next();
  };
}
