import { Response, NextFunction } from 'express';
import { LeaveStatus, Prisma } from '@prisma/client';
import * as leaveService from '../services/leave.service';
import { CustomRequest } from '../middleware/auth.middleware';
import { isManagerRole } from '../middleware/rbac';
import logger from '../utils/logger';
import { invalidateCompanyCache, CACHE_CONFIGS } from '../services/cache';

type LeaveRequestWhereClause = {
  status?: LeaveStatus;
  employeeId?: number;
  OR?: Prisma.LeaveRequestWhereInput[];
};

export const getAllLeaveTypes = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const leaveTypes = await leaveService.getAllLeaveTypes(req.user.companyId);
    logger.debug(`Retrieved ${leaveTypes.length} leave types`);
    res.json(leaveTypes);
  } catch (error) {
    next(error);
  }
};

export const createLeaveType = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      console.error('Error: Company ID is missing from user token.');
      return res.status(400).json({ message: 'Company ID is required' });
    }

    const leaveTypeData = {
      ...req.body,
      companyId
    };

    const leaveType = await leaveService.createLeaveType(leaveTypeData);
    // Invalidate leave types cache for this company
    invalidateCompanyCache(CACHE_CONFIGS.leaveTypes.prefix, companyId);
    logger.info(`Leave type created: ${req.body.name}`);
    res.status(201).json(leaveType);
  } catch (error) {
    logger.error('Failed to create leave type', {
      error: error instanceof Error ? error.message : error,
      body: req.body
    });
    next(error);
  }
};

export const updateLeaveType = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const leaveTypeId = parseInt(id, 10);
    if (Number.isNaN(leaveTypeId)) {
      return res.status(400).json({ message: 'Invalid leave type id' });
    }

    const updated = await leaveService.updateLeaveType(leaveTypeId, req.user.companyId, req.body);
    // Invalidate leave types cache for this company
    invalidateCompanyCache(CACHE_CONFIGS.leaveTypes.prefix, req.user.companyId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteLeaveType = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const leaveTypeId = parseInt(id, 10);
    if (Number.isNaN(leaveTypeId)) {
      return res.status(400).json({ message: 'Invalid leave type id' });
    }

    const deleted = await leaveService.deleteLeaveType(leaveTypeId, req.user.companyId);
    // Invalidate leave types cache for this company
    invalidateCompanyCache(CACHE_CONFIGS.leaveTypes.prefix, req.user.companyId);
    res.json(deleted);
  } catch (error) {
    next(error);
  }
};

export const applyForLeave = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const leaveRequest = await leaveService.applyForLeave(req.user.id, req.body, req.user.companyId);
    // Invalidate dashboard cache (pending leave counts change)
    invalidateCompanyCache(CACHE_CONFIGS.dashboardStats.prefix, req.user.companyId);
    logger.info(
      `Leave application submitted: User ${req.user.id}, Type ${req.body.leaveTypeId}, From ${req.body.start_date} to ${req.body.end_date}`
    );
    res.status(201).json(leaveRequest);
  } catch (error) {
    next(error);
  }
};

export const updateLeaveRequestStatus = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const leaveRequest = await leaveService.updateLeaveRequestStatus(
      parseInt(id),
      status,
      req.user.companyId
    );
    // Invalidate dashboard cache (leave status change affects counts)
    invalidateCompanyCache(CACHE_CONFIGS.dashboardStats.prefix, req.user.companyId);
    logger.info(`Leave request ${id} status updated to: ${status}`);
    res.json(leaveRequest);
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequests = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { status, year, month, employeeId } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Build filter
    const where: LeaveRequestWhereClause = {};

    if (status) {
      where.status = status as LeaveStatus;
    }

    if (employeeId) {
      // Only managers can filter by arbitrary employeeId
      if (!isManagerRole(userRole)) {
        return res.status(403).json({ message: 'Forbidden: cannot view other employees\' requests' });
      }
      where.employeeId = parseInt(employeeId as string);
    } else if (!isManagerRole(userRole) && userId) {
      // Non-managers can only see their own requests
      const employee = await leaveService.getEmployeeByUserId(userId);
      if (employee?.id) {
        where.employeeId = employee.id;
      }
    }

    // If year and month specified, filter by date range
    if (year && month) {
      const y = parseInt(year as string);
      const m = parseInt(month as string);
      const startDate = new Date(Date.UTC(y, m - 1, 1));
      const endDate = new Date(Date.UTC(y, m, 0)); // Last day of month

      where.OR = [
        {
          start_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          end_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          AND: [{ start_date: { lte: startDate } }, { end_date: { gte: endDate } }],
        },
      ];
    }

    const leaveRequests = await leaveService.getLeaveRequests(where, req.user.companyId);
    logger.debug(`Retrieved ${leaveRequests.length} leave requests`);
    res.json(leaveRequests);
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequestById = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid leave request id' });
    }

    const employeeId = isManagerRole(req.user.role)
        ? undefined
        : (await leaveService.getEmployeeByUserId(req.user.id))?.id;

    const leaveRequest = await leaveService.getLeaveRequestById(id, req.user.companyId, employeeId);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    return res.json(leaveRequest);
  } catch (error) {
    next(error);
  }
};

export const approveLeaveRequest = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const leaveRequest = await leaveService.updateLeaveRequestStatus(
      parseInt(id),
      LeaveStatus.APPROVED,
      req.user.companyId
    );
    logger.info(`Leave request ${id} approved by user ${req.user?.id}`);
    res.json(leaveRequest);
  } catch (error) {
    next(error);
  }
};

export const rejectLeaveRequest = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = (req.body ?? {}) as { reason?: string };
    // Note: The service updateLeaveRequestStatus doesn't currently accept a reason for rejection in the signature
    // shown in the view_file output (it only takes id and status). 
    // If we need to store the reason, we'd need to update the service signature.
    // For now, we'll proceed with just the status update to fix the 404.

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const leaveRequest = await leaveService.updateLeaveRequestStatus(
      parseInt(id),
      LeaveStatus.REJECTED,
      req.user.companyId
    );
    logger.info(`Leave request ${id} rejected by user ${req.user?.id}. Reason: ${reason}`);
    res.json(leaveRequest);
  } catch (error) {
    next(error);
  }
};

export const getMyLeaveBalance = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const employee = await leaveService.getEmployeeByUserId(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }
    const balances = await leaveService.getEmployeeLeaveBalances(employee.id);
    logger.debug(`Leave balances fetched for self (employee ${employee.id})`);
    res.json({ employeeId: employee.id, balances });
  } catch (error) {
    next(error);
  }
};
