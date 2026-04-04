jest.mock('../utils/logger');

import { Response, NextFunction } from 'express';
import { CustomRequest } from '../middleware/auth.middleware';
import {
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  isManagerRole,
  checkPermission,
} from '../middleware/rbac';

describe('RBAC Middleware', () => {
  describe('Permission Enum', () => {
    it('should have all expected permission categories', () => {
      // Spot-check key permissions exist
      expect(Permission.EMPLOYEE_LIST).toBe('EMPLOYEE_LIST');
      expect(Permission.EMPLOYEE_CREATE).toBe('EMPLOYEE_CREATE');
      expect(Permission.LEAVE_TYPE_VIEW).toBe('LEAVE_TYPE_VIEW');
      expect(Permission.PAYROLL_RUN).toBe('PAYROLL_RUN');
      expect(Permission.DASHBOARD_VIEW).toBe('DASHBOARD_VIEW');
      expect(Permission.SYSTEM_JOB_RUN).toBe('SYSTEM_JOB_RUN');
      expect(Permission.SHIFT_TEMPLATE_MANAGE).toBe('SHIFT_TEMPLATE_MANAGE');
      expect(Permission.ROSTER_ASSIGN).toBe('ROSTER_ASSIGN');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('OWNER should have all permissions', () => {
      const allPermissions = Object.values(Permission);
      for (const perm of allPermissions) {
        expect(ROLE_PERMISSIONS.OWNER.has(perm)).toBe(true);
      }
    });

    it('ADMIN should have management permissions but not SYSTEM_JOB_RUN', () => {
      expect(ROLE_PERMISSIONS.ADMIN.has(Permission.EMPLOYEE_CREATE)).toBe(true);
      expect(ROLE_PERMISSIONS.ADMIN.has(Permission.LEAVE_TYPE_CREATE)).toBe(true);
      expect(ROLE_PERMISSIONS.ADMIN.has(Permission.PAYROLL_RUN)).toBe(true);
      expect(ROLE_PERMISSIONS.ADMIN.has(Permission.DASHBOARD_VIEW)).toBe(true);
      expect(ROLE_PERMISSIONS.ADMIN.has(Permission.SYSTEM_JOB_RUN)).toBe(false);
    });

    it('EMPLOYEE should only have self-service permissions', () => {
      // Should have
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.EMPLOYEE_VIEW_SELF)).toBe(true);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.LEAVE_TYPE_VIEW)).toBe(true);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.LEAVE_REQUEST_CREATE)).toBe(true);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.LEAVE_REQUEST_VIEW_SELF)).toBe(true);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.PAYSLIP_VIEW_SELF)).toBe(true);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.ATTENDANCE_VIEW_OWN)).toBe(true);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.SHIFT_TEMPLATE_VIEW)).toBe(true);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.ROSTER_VIEW)).toBe(true);

      // Should NOT have
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.EMPLOYEE_LIST)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.EMPLOYEE_CREATE)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.EMPLOYEE_DELETE)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.LEAVE_TYPE_CREATE)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.LEAVE_REQUEST_APPROVE)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.PAYROLL_RUN)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.DASHBOARD_VIEW)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.SYSTEM_JOB_RUN)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.SHIFT_TEMPLATE_MANAGE)).toBe(false);
      expect(ROLE_PERMISSIONS.EMPLOYEE.has(Permission.ROSTER_ASSIGN)).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    it('should return true for valid role-permission combos', () => {
      expect(hasPermission('OWNER', Permission.SYSTEM_JOB_RUN)).toBe(true);
      expect(hasPermission('ADMIN', Permission.EMPLOYEE_CREATE)).toBe(true);
      expect(hasPermission('EMPLOYEE', Permission.LEAVE_REQUEST_CREATE)).toBe(true);
    });

    it('should return false for invalid role-permission combos', () => {
      expect(hasPermission('ADMIN', Permission.SYSTEM_JOB_RUN)).toBe(false);
      expect(hasPermission('EMPLOYEE', Permission.EMPLOYEE_DELETE)).toBe(false);
    });

    it('should return false for unknown roles', () => {
      expect(hasPermission('SUPERADMIN', Permission.EMPLOYEE_LIST)).toBe(false);
      expect(hasPermission('', Permission.EMPLOYEE_LIST)).toBe(false);
    });
  });

  describe('hasAnyPermission()', () => {
    it('should return true if role has at least one permission', () => {
      expect(
        hasAnyPermission('EMPLOYEE', [Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_VIEW_SELF])
      ).toBe(true);
    });

    it('should return false if role has none of the permissions', () => {
      expect(
        hasAnyPermission('EMPLOYEE', [Permission.EMPLOYEE_DELETE, Permission.PAYROLL_RUN])
      ).toBe(false);
    });
  });

  describe('isManagerRole()', () => {
    it('should return true for OWNER and ADMIN', () => {
      expect(isManagerRole('OWNER')).toBe(true);
      expect(isManagerRole('ADMIN')).toBe(true);
    });

    it('should return false for EMPLOYEE and unknown roles', () => {
      expect(isManagerRole('EMPLOYEE')).toBe(false);
      expect(isManagerRole('UNKNOWN')).toBe(false);
    });
  });

  describe('checkPermission() middleware', () => {
    let req: Partial<CustomRequest>;
    let res: Partial<Response>;
    let next: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jsonMock = jest.fn().mockReturnThis();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      req = {
        method: 'GET',
        path: '/test',
        user: { id: 1, role: 'ADMIN', companyId: 5 },
      };
      res = {
        status: statusMock,
        json: jsonMock,
      };
      next = jest.fn();
    });

    it('should call next() when user has required permission', () => {
      const middleware = checkPermission(Permission.EMPLOYEE_LIST);
      middleware(req as CustomRequest, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks required permission', () => {
      req.user = { id: 2, role: 'EMPLOYEE', companyId: 5 };
      const middleware = checkPermission(Permission.EMPLOYEE_DELETE);
      middleware(req as CustomRequest, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden: insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      req.user = undefined;
      const middleware = checkPermission(Permission.EMPLOYEE_LIST);
      middleware(req as CustomRequest, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should grant access when user has ANY of multiple permissions', () => {
      req.user = { id: 2, role: 'EMPLOYEE', companyId: 5 };
      const middleware = checkPermission(Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_VIEW_SELF);
      middleware(req as CustomRequest, res as Response, next);
      // EMPLOYEE has VIEW_SELF
      expect(next).toHaveBeenCalled();
    });

    it('should deny when user has NONE of multiple permissions', () => {
      req.user = { id: 2, role: 'EMPLOYEE', companyId: 5 };
      const middleware = checkPermission(Permission.EMPLOYEE_DELETE, Permission.PAYROLL_RUN);
      middleware(req as CustomRequest, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow OWNER access to SYSTEM_JOB_RUN', () => {
      req.user = { id: 1, role: 'OWNER', companyId: 5 };
      const middleware = checkPermission(Permission.SYSTEM_JOB_RUN);
      middleware(req as CustomRequest, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny ADMIN access to SYSTEM_JOB_RUN', () => {
      req.user = { id: 1, role: 'ADMIN', companyId: 5 };
      const middleware = checkPermission(Permission.SYSTEM_JOB_RUN);
      middleware(req as CustomRequest, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('Security: permission boundaries', () => {
    it('EMPLOYEE cannot approve leave', () => {
      expect(hasPermission('EMPLOYEE', Permission.LEAVE_REQUEST_APPROVE)).toBe(false);
    });

    it('EMPLOYEE cannot generate payslips', () => {
      expect(hasPermission('EMPLOYEE', Permission.PAYSLIP_GENERATE)).toBe(false);
    });

    it('EMPLOYEE cannot delete employees', () => {
      expect(hasPermission('EMPLOYEE', Permission.EMPLOYEE_DELETE)).toBe(false);
    });

    it('EMPLOYEE cannot view dashboard', () => {
      expect(hasPermission('EMPLOYEE', Permission.DASHBOARD_VIEW)).toBe(false);
    });

    it('EMPLOYEE cannot manage shift templates', () => {
      expect(hasPermission('EMPLOYEE', Permission.SHIFT_TEMPLATE_MANAGE)).toBe(false);
    });

    it('EMPLOYEE cannot assign roster', () => {
      expect(hasPermission('EMPLOYEE', Permission.ROSTER_ASSIGN)).toBe(false);
    });

    it('EMPLOYEE cannot run system jobs', () => {
      expect(hasPermission('EMPLOYEE', Permission.SYSTEM_JOB_RUN)).toBe(false);
    });

    it('ADMIN cannot run system jobs', () => {
      expect(hasPermission('ADMIN', Permission.SYSTEM_JOB_RUN)).toBe(false);
    });

    it('OWNER has every permission in the enum', () => {
      const all = Object.values(Permission);
      expect(all.length).toBeGreaterThan(0);
      for (const p of all) {
        expect(hasPermission('OWNER', p)).toBe(true);
      }
    });
  });
});
