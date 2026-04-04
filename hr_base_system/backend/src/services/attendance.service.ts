import csv from 'csv-parser';
import { Readable } from 'stream';
import { prisma } from '../prismaClient';
import { Prisma, AttendanceStatus, CorrectionStatus } from '@prisma/client';

export class DuplicateAttendanceError extends Error {
  constructor(employeeId: number, date: Date) {
    super(`Attendance record already exists for employee ${employeeId} on ${date.toISOString().split('T')[0]}`);
    this.name = 'DuplicateAttendanceError';
  }
}

const toUtcMidnight = (date: Date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
};

const getUtcDayRange = (date: Date) => {
  const start = toUtcMidnight(date);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

export const createAttendanceRecord = async (
  attendanceData: Prisma.AttendanceRecordCreateInput
) => {
  // Check for duplicate attendance record (same employee + date)
  const employeeId = (attendanceData.employee as { connect: { id: number } }).connect.id;
  const date = attendanceData.date as Date;

  const { start: startOfDay, end: endOfDay } = getUtcDayRange(date);

  const existingRecord = await prisma.attendanceRecord.findFirst({
    where: {
      employeeId: employeeId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (existingRecord) {
    throw new DuplicateAttendanceError(employeeId, date);
  }

  return await prisma.attendanceRecord.create({
    data: {
      ...attendanceData,
      date: toUtcMidnight(date),
    },
  });
};

/**
 * Get attendance records with filters
 */
export const getAttendanceRecords = async (filters: Prisma.AttendanceRecordWhereInput) => {
  return await prisma.attendanceRecord.findMany({
    where: filters,
    orderBy: {
      date: 'desc',
    },
  });
};


export const getDailyLog = async (date: Date, companyId: number) => {
  const startOfDay = toUtcMidnight(date);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // 1. Get all active employees for the company
  const employees = await prisma.employee.findMany({
    where: {
      user: { companyId },
      isActive: true
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      job_title: true,
      department: true,
    }
  });

  // 2. Get shifts for the day
  const shifts = await prisma.employeeShift.findMany({
    where: {
      employee: { user: { companyId } },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      shiftTemplate: true,
    },
  });

  // 3. Get attendance records for the day
  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      employee: { user: { companyId } },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // 4. Combine data
  const dailyLog = employees.map((employee: { id: number; first_name: string; last_name: string; job_title: string; department: string | null }) => {
    const shift = shifts.find((s: { employeeId: number }) => s.employeeId === employee.id);
    const record = attendance.find((a: { employeeId: number }) => a.employeeId === employee.id);

    let status = 'ABSENT';
    let checkInTime = null;
    let checkOutTime = null;
    let isLate = false;
    let shiftStartTime = null;
    let shiftEndTime = null;

    if (shift && shift.shiftTemplate) {
      shiftStartTime = shift.shiftTemplate.startTime;
      shiftEndTime = shift.shiftTemplate.endTime;
    }

    if (record) {
      status = record.status;
      checkInTime = record.checkInTime;
      checkOutTime = record.checkOutTime;

      // Calculate Late Status
      if (checkInTime && shiftStartTime) {
        // Parse shift start time (HH:mm)
        const [hours, minutes] = shiftStartTime.split(':').map(Number);

        // Create shift start date object (in UTC, matching the record date)
        const shiftStart = new Date(record.date);
        shiftStart.setUTCHours(hours, minutes, 0, 0);

        // Add 15 min grace period
        const gracePeriod = 15 * 60 * 1000;

        if (checkInTime.getTime() > shiftStart.getTime() + gracePeriod) {
          isLate = true;
          // If status is PRESENT but late, we might want to flag it. 
          // For now, we keep status as PRESENT but UI will show Late indicator.
        }
      }
    } else if (!shift) {
      status = 'NO_SHIFT';
    }

    return {
      employeeId: employee.id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      department: employee.department,
      jobTitle: employee.job_title,
      shiftStartTime,
      shiftEndTime,
      checkInTime,
      checkOutTime,
      status,
      isLate,
      attendanceId: record?.id
    };
  });

  return dailyLog;
};

type AttendanceCsvRecord = {
  employeeId: string;
  date: string;
  status: string;
};

export interface BulkUploadResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export class InvalidCsvError extends Error {
  errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'InvalidCsvError';
    this.errors = errors;
  }
}

export const bulkUploadAttendance = async (buffer: Buffer, companyId: number): Promise<BulkUploadResult> => {
  const results: AttendanceCsvRecord[] = [];
  let headersValidated = false;
  const requiredHeaders = ['employeeId', 'date', 'status'];
  // Keep in sync with Prisma enum AttendanceStatus
  const validStatuses = ['PRESENT', 'ABSENT'];

  return new Promise<BulkUploadResult>((resolve, reject) => {
    // Feed csv-parser a single Buffer chunk to avoid per-character streaming issues
    const stream = Readable.from([buffer]);

    stream
      .pipe(csv())
      .on('headers', (headers: string[]) => {
        // Validate headers
        const missing = requiredHeaders.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          return reject(new InvalidCsvError(
            `Invalid CSV format: missing required columns`,
            [`Missing columns: ${missing.join(', ')}`, `Required columns: employeeId, date, status`]
          ));
        }
        headersValidated = true;
      })
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        if (!headersValidated) {
          return reject(new InvalidCsvError('Invalid CSV format: unable to parse headers'));
        }

        if (results.length === 0) {
          return reject(new InvalidCsvError('CSV file is empty or contains no data rows'));
        }

        const errors: string[] = [];
        let imported = 0;
        let skipped = 0;

        for (let i = 0; i < results.length; i++) {
          const record = results[i];
          const rowNum = i + 2; // +2 because row 1 is header, arrays are 0-indexed

          // Validate required fields
          if (!record.employeeId || !record.date || !record.status) {
            errors.push(`Row ${rowNum}: Missing required field(s) - employeeId, date, and status are required`);
            skipped++;
            continue;
          }

          // Validate employeeId is a number
          const employeeId = parseInt(record.employeeId);
          if (isNaN(employeeId) || employeeId <= 0) {
            errors.push(`Row ${rowNum}: Invalid employeeId "${record.employeeId}" - must be a positive number`);
            skipped++;
            continue;
          }

          // Validate date format
          const date = new Date(record.date);
          if (isNaN(date.getTime())) {
            errors.push(`Row ${rowNum}: Invalid date format "${record.date}" - use YYYY-MM-DD format`);
            skipped++;
            continue;
          }

          // Validate status
          const status = record.status.toUpperCase();
          if (!validStatuses.includes(status)) {
            errors.push(`Row ${rowNum}: Invalid status "${record.status}" - must be PRESENT or ABSENT`);
            skipped++;
            continue;
          }

          try {
            // Check for duplicate
            const { start: startOfDay, end: endOfDay } = getUtcDayRange(date);

            const existingRecord = await prisma.attendanceRecord.findFirst({
              where: {
                employeeId: employeeId,
                date: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
            });

            if (existingRecord) {
              errors.push(`Row ${rowNum}: Duplicate - attendance already exists for employee ${employeeId} on ${record.date}`);
              skipped++;
              continue;
            }

            // Check employee exists
            const employee = await prisma.employee.findFirst({
              where: { id: employeeId, user: { companyId } },
            });

            if (!employee) {
              errors.push(`Row ${rowNum}: Employee with ID ${employeeId} not found`);
              skipped++;
              continue;
            }

            await prisma.attendanceRecord.create({
              data: {
                employee: { connect: { id: employeeId } },
                date: toUtcMidnight(date),
                status: status as AttendanceStatus,
              },
            });
            imported++;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Row ${rowNum}: Failed to create record - ${errorMessage}`);
            skipped++;
          }
        }

        // If all rows failed, reject with error
        if (imported === 0 && errors.length > 0) {
          return reject(new InvalidCsvError(
            `Upload failed: no records could be imported`,
            errors.slice(0, 10) // Limit errors to first 10
          ));
        }

        resolve({
          success: imported > 0,
          imported,
          skipped,
          errors: errors.slice(0, 10), // Limit errors to first 10
        });
      })
      .on('error', (err) => reject(new InvalidCsvError(
        'Failed to parse CSV file',
        [err instanceof Error ? err.message : String(err)]
      )));
  });
};

// ─── Sprint 2: Check-In / Check-Out ────────────────────────────────────────

export class NoShiftCheckInError extends Error {
  constructor() {
    super('No attendance record or check-in is not allowed without a record. Create the attendance record first or contact your admin.');
    this.name = 'NoShiftCheckInError';
  }
}

export class AlreadyCheckedInError extends Error {
  constructor() {
    super('You have already checked in for today.');
    this.name = 'AlreadyCheckedInError';
  }
}

export class NotCheckedInError extends Error {
  constructor() {
    super('You have not checked in for today yet.');
    this.name = 'NotCheckedInError';
  }
}

export const checkIn = async (employeeId: number) => {
  const now = new Date();
  const { start: startOfDay, end: endOfDay } = getUtcDayRange(now);

  // Upsert: if record exists update checkInTime, otherwise create PRESENT record
  const existing = await prisma.attendanceRecord.findFirst({
    where: { employeeId, date: { gte: startOfDay, lte: endOfDay } },
  });

  if (existing) {
    if (existing.checkInTime) {
      throw new AlreadyCheckedInError();
    }
    return await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkInTime: now },
    });
  }

  // No record yet — create PRESENT with checkInTime
  return await prisma.attendanceRecord.create({
    data: {
      employee: { connect: { id: employeeId } },
      date: toUtcMidnight(now),
      status: AttendanceStatus.PRESENT,
      checkInTime: now,
    },
  });
};

export const checkOut = async (employeeId: number) => {
  const now = new Date();
  const { start: startOfDay, end: endOfDay } = getUtcDayRange(now);

  const existing = await prisma.attendanceRecord.findFirst({
    where: { employeeId, date: { gte: startOfDay, lte: endOfDay } },
  });

  if (!existing || !existing.checkInTime) {
    throw new NotCheckedInError();
  }

  return await prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: { checkOutTime: now },
  });
};

// ─── Sprint 2: Monthly Summary ──────────────────────────────────────────────

export const getMonthlySummary = async (employeeId: number, month: number, year: number) => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { status: true },
  });

  const summary: Record<string, number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    HALF_DAY: 0,
    WFH: 0,
    ON_LEAVE: 0,
  };

  for (const r of records) {
    if (r.status in summary) {
      summary[r.status]++;
    }
  }

  return { month, year, employeeId, total: records.length, summary };
};

// ─── Sprint 2: Correction Requests ─────────────────────────────────────────

export interface CreateCorrectionRequestInput {
  employeeId: number;
  date: Date;
  requestedStatus: AttendanceStatus;
  reason: string;
  attendanceId?: number;
}

export const createCorrectionRequest = async (input: CreateCorrectionRequestInput) => {
  return await prisma.attendanceCorrectionRequest.create({
    data: {
      employee: { connect: { id: input.employeeId } },
      date: toUtcMidnight(input.date),
      requestedStatus: input.requestedStatus,
      reason: input.reason,
      ...(input.attendanceId ? { attendance: { connect: { id: input.attendanceId } } } : {}),
    },
  });
};

export const getMyCorrectionRequests = async (employeeId: number) => {
  return await prisma.attendanceCorrectionRequest.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
    include: {
      attendance: { select: { id: true, status: true, checkInTime: true, checkOutTime: true } },
    },
  });
};

export const getCompanyCorrectionRequests = async (companyId: number) => {
  return await prisma.attendanceCorrectionRequest.findMany({
    where: {
      employee: { user: { companyId } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, department: true },
      },
      attendance: { select: { id: true, status: true, checkInTime: true, checkOutTime: true } },
    },
  });
};

export const updateCorrectionRequestStatus = async (
  id: number,
  companyId: number,
  status: CorrectionStatus,
  adminNotes?: string,
) => {
  // Verify it belongs to the company
  const request = await prisma.attendanceCorrectionRequest.findFirst({
    where: { id, employee: { user: { companyId } } },
  });

  if (!request) {
    return null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.attendanceCorrectionRequest.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes ?? request.adminNotes,
        updatedAt: new Date(),
      },
    });

    // If approved, also update the actual attendance record's status
    if (status === CorrectionStatus.APPROVED && request.attendanceId) {
      await tx.attendanceRecord.update({
        where: { id: request.attendanceId },
        data: { status: request.requestedStatus },
      });
    }

    return updatedRequest;
  });

  return updated;
};

