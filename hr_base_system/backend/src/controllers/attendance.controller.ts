import { Response, NextFunction } from 'express';
import { CustomRequest } from '../middleware/auth.middleware';
import * as attendanceService from '../services/attendance.service';
import {
  DuplicateAttendanceError,
  InvalidCsvError,
  AlreadyCheckedInError,
  NotCheckedInError,
} from '../services/attendance.service';
import * as employeeService from '../services/employee.service';
import multer from 'multer';
import logger from '../utils/logger';
import { HttpError } from '../middleware/error.middleware';
import { AttendanceStatus, CorrectionStatus } from '@prisma/client';

const upload = multer({ storage: multer.memoryStorage() });

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseStartDateUtc = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (!isDateOnly(value)) return date;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
};

const parseEndDateUtc = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (!isDateOnly(value)) return date;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
};

const toUtcMidnightFromInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
};

const getDayType = (date: Date) => {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) {
    return 'WEEKEND';
  }
  return 'WEEKDAY';
};

const attachDayType = <T extends { date: Date }>(records: T[]) =>
  records.map((record) => ({
    ...record,
    dayType: getDayType(record.date),
  }));

export const createAttendanceRecord = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.companyId) {
      throw new HttpError('User is not associated with a company', 403);
    }

    const employeeId = Number(req.body.employeeId);
    const employee = await employeeService.getEmployeeById(employeeId, req.user.companyId);
    if (!employee) {
      throw new HttpError('Employee not found', 404);
    }

    const normalizedDate = req.body.date ? toUtcMidnightFromInput(req.body.date) : null;
    if (!normalizedDate) {
      throw new HttpError('Invalid date format', 400);
    }

    // Transform incoming request body into Prisma-friendly shape
    const data = {
      employee: { connect: { id: employeeId } },
      date: normalizedDate,
      status: req.body.status,
    };

    const attendanceRecord = await attendanceService.createAttendanceRecord(data);
    // Log the created record (structured logging)
    logger.info('Attendance record created (db response):', { attendanceRecord });
    res.status(201).json(attendanceRecord);
  } catch (error) {
    // Handle duplicate attendance error
    if (error instanceof DuplicateAttendanceError) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
};

export const bulkUploadAttendance = [
  upload.single('file'),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.companyId) {
        throw new HttpError('User is not associated with a company', 403);
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const result = await attendanceService.bulkUploadAttendance(req.file.buffer, req.user.companyId);
      logger.info(
        `Bulk attendance upload: ${req.file.originalname}, imported: ${result.imported}, skipped: ${result.skipped}`
      );

      res.status(200).json({
        success: result.success,
        message: `Successfully imported ${result.imported} record(s)${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
      });
    } catch (error) {
      // Handle CSV validation errors
      if (error instanceof InvalidCsvError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors,
        });
      }
      next(error);
    }
  },
];

export const getMyAttendance = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get employee record for authenticated user
    const employee = await employeeService.getEmployeeByUserId(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Parse query filters
    const { startDate, endDate, month, year } = req.query;

    const filters: {
      employeeId: number;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      employeeId: employee.id,
    };

    // Handle date range filtering
    if (startDate || endDate || month || year) {
      filters.date = {};

      if (startDate) {
        const parsed = parseStartDateUtc(startDate as string);
        if (parsed) filters.date.gte = parsed;
      }

      if (endDate) {
        const parsed = parseEndDateUtc(endDate as string);
        if (parsed) filters.date.lte = parsed;
      }

      // If month and year are provided, override start/end dates
      if (month && year) {
        const monthNum = Number.parseInt(month as string, 10);
        const yearNum = Number.parseInt(year as string, 10);
        filters.date.gte = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
        filters.date.lte = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
      }
    }

    const attendanceRecords = await attendanceService.getAttendanceRecords(filters);
    const enriched = attachDayType(attendanceRecords);

    logger.info('Attendance records retrieved', {
      userId: req.user.id,
      employeeId: employee.id,
      filters,
      count: attendanceRecords.length,
    });

    return res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
};

// Get all attendance records (Admin/Owner only)
export const getAllAttendance = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Parse query filters
    const { startDate, endDate, employeeId, page = '1', limit = '50' } = req.query;

    // Build Prisma filter - AttendanceRecord doesn't have companyId directly.
    // Employee is linked to User via userId, and User has companyId.
    // So we filter through: employee -> user -> companyId
    const filters: {
      employee?: {
        user: {
          companyId: number;
        };
      };
      employeeId?: number;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    // Filter by company (multi-tenancy) through employee -> user relation
    if (req.user.companyId) {
      filters.employee = { user: { companyId: req.user.companyId } };
    }

    // Filter by specific employee
    if (employeeId) {
      filters.employeeId = Number(employeeId);
    }

    // Handle date range filtering
    if (startDate || endDate) {
      filters.date = {};

      if (startDate) {
        const parsed = parseStartDateUtc(startDate as string);
        if (parsed) filters.date.gte = parsed;
      }

      if (endDate) {
        const parsed = parseEndDateUtc(endDate as string);
        if (parsed) filters.date.lte = parsed;
      }
    }

    const attendanceRecords = await attendanceService.getAttendanceRecords(filters);
    const enriched = attachDayType(attendanceRecords);

    // Apply pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedRecords = enriched.slice(startIndex, startIndex + limitNum);

    logger.info('All attendance records retrieved', {
      userId: req.user.id,
      companyId: req.user.companyId,
      filters,
      totalCount: enriched.length,
      returnedCount: paginatedRecords.length,
    });

    return res.status(200).json({
      data: paginatedRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: enriched.length,
        pages: Math.ceil(enriched.length / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get daily log for attendance view
export const getDailyLog = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user?.companyId) {
    return res.status(403).json({ message: 'User is not associated with a company' });
  }

  try {
    const { date } = req.query;

    // Default to today if not provided
    const queryDate = date
      ? new Date(date as string)
      : new Date();

    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const data = await attendanceService.getDailyLog(queryDate, req.user.companyId);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// ─── Sprint 2: Check-In ─────────────────────────────────────────────────────
export const checkIn = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const employee = await employeeService.getEmployeeByUserId(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const record = await attendanceService.checkIn(employee.id);
    logger.info('Check-in recorded', { userId: req.user.id, employeeId: employee.id, recordId: record.id });
    return res.status(200).json({ message: 'Checked in successfully', record });
  } catch (error) {
    if (error instanceof AlreadyCheckedInError) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
};

// ─── Sprint 2: Check-Out ────────────────────────────────────────────────────
export const checkOut = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const employee = await employeeService.getEmployeeByUserId(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const record = await attendanceService.checkOut(employee.id);
    logger.info('Check-out recorded', { userId: req.user.id, employeeId: employee.id, recordId: record.id });
    return res.status(200).json({ message: 'Checked out successfully', record });
  } catch (error) {
    if (error instanceof NotCheckedInError) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
};

// ─── Sprint 2: Monthly Summary ──────────────────────────────────────────────
export const getMySummary = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const employee = await employeeService.getEmployeeByUserId(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getUTCMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year  as string, 10) : now.getUTCFullYear();

    if (isNaN(month) || month < 1 || month > 12) return res.status(400).json({ message: 'Invalid month' });
    if (isNaN(year)  || year  < 2000)             return res.status(400).json({ message: 'Invalid year' });

    const summary = await attendanceService.getMonthlySummary(employee.id, month, year);
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

// ─── Sprint 2: Correction Requests (Employee) ───────────────────────────────
export const createCorrectionRequest = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const employee = await employeeService.getEmployeeByUserId(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const { date, requestedStatus, reason, attendanceId } = req.body;
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'Invalid date' });

    const request = await attendanceService.createCorrectionRequest({
      employeeId: employee.id,
      date: parsedDate,
      requestedStatus: requestedStatus as AttendanceStatus,
      reason,
      attendanceId: attendanceId ? parseInt(attendanceId, 10) : undefined,
    });

    logger.info('Correction request created', { userId: req.user.id, employeeId: employee.id, requestId: request.id });
    return res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

export const getMyCorrectionRequests = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const employee = await employeeService.getEmployeeByUserId(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const requests = await attendanceService.getMyCorrectionRequests(employee.id);
    return res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

// ─── Sprint 2: Correction Requests (Admin/Owner) ────────────────────────────
export const getAllCorrectionRequests = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user?.companyId) return res.status(403).json({ message: 'User is not associated with a company' });
  try {
    const requests = await attendanceService.getCompanyCorrectionRequests(req.user.companyId);
    return res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const updateCorrectionRequest = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user?.companyId) return res.status(403).json({ message: 'User is not associated with a company' });
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid correction request ID' });

    const { status, adminNotes } = req.body;
    const updated = await attendanceService.updateCorrectionRequestStatus(
      id,
      req.user.companyId,
      status as CorrectionStatus,
      adminNotes,
    );

    if (!updated) return res.status(404).json({ message: 'Correction request not found' });

    logger.info('Correction request updated', { userId: req.user.id, requestId: id, status });
    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
