import { Response, NextFunction } from 'express';
import * as employeeService from '../services/employee.service';
import logger from '../utils/logger';
import { CustomRequest } from '../middleware/auth.middleware';
import { isManagerRole } from '../middleware/rbac';
import { getEmployeeLeaveBalances as fetchEmployeeLeaveBalances } from '../services/leave.service';
import { invalidateCompanyCache, CACHE_CONFIGS } from '../services/cache';

export const getAllEmployees = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { search, page, limit } = req.query as { search?: string; page?: string; limit?: string };
    const p = page ? parseInt(page, 10) || 1 : 1;
    const l = limit ? parseInt(limit, 10) || 20 : 20;

    const result = await employeeService.searchEmployees(search, p, l, req.user.companyId);
    logger.debug(`Search employees: query=${search} page=${p} limit=${l} total=${result.total}`);
    // Map to frontend-expected shape
    return res.json({
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized: Missing company association' });
    }

    const employee = await employeeService.createEmployee(req.body, companyId);
    // Invalidate employee list + dashboard caches
    invalidateCompanyCache(CACHE_CONFIGS.employees.prefix, companyId);
    invalidateCompanyCache(CACHE_CONFIGS.dashboardStats.prefix, companyId);
    invalidateCompanyCache(CACHE_CONFIGS.dashboardLiquidity.prefix, companyId);
    logger.info(
      `Employee created successfully: ${employee.first_name} ${employee.last_name} (ID: ${employee.id})`
    );
    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
};

export const getEmployee = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const employee = await employeeService.getEmployeeById(id, req.user.companyId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // If user is an EMPLOYEE, ensure they can only view their own profile
    if (!isManagerRole(req.user.role)) {
      const userEmployee = await employeeService.getEmployeeByUserId(req.user.id);
      if (userEmployee?.id !== id) {
        return res.status(403).json({ message: 'Forbidden: Can only view own profile' });
      }
    }

    res.json(employee);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const existing = await employeeService.getEmployeeById(id, req.user.companyId);
    if (!existing) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const updated = await employeeService.updateEmployee(id, req.body, req.user.companyId);
    // Invalidate employee + dashboard caches
    invalidateCompanyCache(CACHE_CONFIGS.employees.prefix, req.user.companyId);
    invalidateCompanyCache(CACHE_CONFIGS.dashboardLiquidity.prefix, req.user.companyId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const existing = await employeeService.getEmployeeById(id, req.user.companyId);
    if (!existing) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const deleted = await employeeService.deleteEmployee(id, req.user.companyId);
    // Invalidate employee + dashboard caches
    invalidateCompanyCache(CACHE_CONFIGS.employees.prefix, req.user.companyId);
    invalidateCompanyCache(CACHE_CONFIGS.dashboardStats.prefix, req.user.companyId);
    invalidateCompanyCache(CACHE_CONFIGS.dashboardLiquidity.prefix, req.user.companyId);
    res.json({ message: 'Employee deleted (soft)', employee: deleted });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeLeaveBalances = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    if (Number.isNaN(employeeId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const employee = await employeeService.getEmployeeById(employeeId, req.user.companyId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const isSelf = !isManagerRole(req.user.role) && employee.userId === req.user.id;
    const isManager = isManagerRole(req.user.role);

    if (!isSelf && !isManager) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const balances = await fetchEmployeeLeaveBalances(employeeId);
    logger.debug(`Leave balances fetched for employee ${employeeId} by user ${req.user.id}`);
    res.json({ employeeId, balances });
  } catch (error) {
    next(error);
  }
};
