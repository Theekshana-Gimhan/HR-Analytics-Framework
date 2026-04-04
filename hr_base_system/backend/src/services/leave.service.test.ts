import { Prisma, LeaveStatus, LeaveBalanceReason } from '@prisma/client';
import {
  getAllLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getEmployeeLeaveBalances,
  applyForLeave,
  updateLeaveRequestStatus,
  getEmployeeByUserId,
  getLeaveRequests,
  getLeaveRequestById,
  initializeLeaveBalancesForEmployee,
} from './leave.service';
import { prisma } from '../prismaClient';
import { HttpError, BadRequestError, NotFoundError, ConflictError } from '../middleware/error.middleware';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock('../prismaClient', () => {
  const txClient = {
    leaveType: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    employeeLeaveBalance: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    leaveRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    leaveBalanceTransaction: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  return {
    prisma: {
      ...txClient,
      $transaction: jest.fn((fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient)),
    },
  };
});

jest.mock('./email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../templates/email-templates', () => ({
  leaveRequestSubmittedTemplate: jest.fn().mockReturnValue('<html>submitted</html>'),
  leaveApprovedTemplate: jest.fn().mockReturnValue('<html>approved</html>'),
  leaveRejectedTemplate: jest.fn().mockReturnValue('<html>rejected</html>'),
}));

jest.mock('../utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockPrisma = prisma as unknown as jest.Mocked<typeof prisma> & {
  $transaction: jest.Mock;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPANY_ID = 1;

const makeLeaveType = (overrides: Partial<{
  id: number;
  name: string;
  defaultBalance: number;
  requiresAnniversary: boolean;
  companyId: number;
}> = {}) => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? 'Annual Leave',
  defaultBalance: new Prisma.Decimal(overrides.defaultBalance ?? 14),
  requiresAnniversary: overrides.requiresAnniversary ?? true,
  companyId: overrides.companyId ?? COMPANY_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeEmployee = (overrides: Partial<{
  id: number;
  userId: number;
  first_name: string;
  last_name: string;
  employmentStartDate: Date;
}> = {}) => ({
  id: overrides.id ?? 1,
  userId: overrides.userId ?? 1,
  first_name: overrides.first_name ?? 'Kamal',
  last_name: overrides.last_name ?? 'Perera',
  employmentStartDate: overrides.employmentStartDate ?? new Date('2020-01-01'),
  isActive: true,
  user: { companyId: COMPANY_ID },
});

const makeBalance = (overrides: Partial<{
  id: number;
  employeeId: number;
  leaveTypeId: number;
  accrued: number;
  used: number;
  carriedForward: number;
}> = {}) => ({
  id: overrides.id ?? 1,
  employeeId: overrides.employeeId ?? 1,
  leaveTypeId: overrides.leaveTypeId ?? 1,
  accrued: new Prisma.Decimal(overrides.accrued ?? 14),
  used: new Prisma.Decimal(overrides.used ?? 0),
  carriedForward: new Prisma.Decimal(overrides.carriedForward ?? 0),
  lastAccruedAt: new Date(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('leave.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =======================================================================
  // getAllLeaveTypes
  // =======================================================================
  describe('getAllLeaveTypes', () => {
    it('returns leave types for a company ordered by id', async () => {
      const leaveTypes = [
        makeLeaveType({ id: 1, name: 'Annual Leave' }),
        makeLeaveType({ id: 2, name: 'Casual Leave' }),
      ];
      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue(leaveTypes);

      const result = await getAllLeaveTypes(COMPANY_ID);

      expect(result).toEqual(leaveTypes);
      expect(mockPrisma.leaveType.findMany).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID },
        orderBy: { id: 'asc' },
      });
    });

    it('returns empty array when no leave types exist', async () => {
      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getAllLeaveTypes(COMPANY_ID);

      expect(result).toEqual([]);
    });
  });

  // =======================================================================
  // createLeaveType
  // =======================================================================
  describe('createLeaveType', () => {
    it('creates a leave type and initializes balances for employees', async () => {
      const leaveType = makeLeaveType({ id: 10, name: 'Sick Leave' });
      (mockPrisma.leaveType.create as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      (mockPrisma.employeeLeaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await createLeaveType({
        name: 'Sick Leave',
        default_balance: 10,
        requires_anniversary: false,
        companyId: COMPANY_ID,
      });

      expect(result).toEqual(leaveType);
      expect(mockPrisma.employeeLeaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ employeeId: 1, leaveTypeId: 10 }),
          expect.objectContaining({ employeeId: 2, leaveTypeId: 10 }),
        ]),
      });
    });

    it('enforces statutory cap for Annual Leave (14 days)', async () => {
      const leaveType = makeLeaveType({ id: 1, name: 'Annual Leave', defaultBalance: 14 });
      (mockPrisma.leaveType.create as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      await createLeaveType({
        name: 'Annual Leave',
        default_balance: 20, // Trying to set 20 but statutory says 14
        companyId: COMPANY_ID,
      });

      const createCall = (mockPrisma.leaveType.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.defaultBalance).toBe(14); // Enforced statutory cap
    });

    it('enforces statutory cap for Casual Leave (7 days)', async () => {
      const leaveType = makeLeaveType({ id: 2, name: 'Casual Leave', defaultBalance: 7 });
      (mockPrisma.leaveType.create as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      await createLeaveType({
        name: 'Casual Leave',
        default_balance: 15,
        companyId: COMPANY_ID,
      });

      const createCall = (mockPrisma.leaveType.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.defaultBalance).toBe(7);
    });

    it('enforces statutory cap for Medical Leave (7 days)', async () => {
      const leaveType = makeLeaveType({ id: 3, name: 'Medical Leave', defaultBalance: 7 });
      (mockPrisma.leaveType.create as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      await createLeaveType({
        name: 'Medical Leave',
        default_balance: 10,
        companyId: COMPANY_ID,
      });

      const createCall = (mockPrisma.leaveType.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.defaultBalance).toBe(7);
      expect(createCall.data.requiresAnniversary).toBe(true);
    });

    it('throws BadRequestError when required fields are missing', async () => {
      await expect(
        createLeaveType({
          name: '',
          default_balance: undefined as unknown as number,
          companyId: 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      ).rejects.toThrow(BadRequestError);
    });

    it('skips balance creation when no employees exist', async () => {
      const leaveType = makeLeaveType();
      (mockPrisma.leaveType.create as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      await createLeaveType({
        name: 'Annual Leave',
        default_balance: 14,
        companyId: COMPANY_ID,
      });

      expect(mockPrisma.employeeLeaveBalance.createMany).not.toHaveBeenCalled();
    });
  });

  // =======================================================================
  // updateLeaveType
  // =======================================================================
  describe('updateLeaveType', () => {
    it('updates leave type fields', async () => {
      const existing = makeLeaveType({ id: 1, name: 'Old Name' });
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(existing);
      (mockPrisma.leaveType.update as jest.Mock).mockResolvedValue({
        ...existing,
        name: 'New Name',
      });

      const result = await updateLeaveType(1, COMPANY_ID, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockPrisma.leaveType.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New Name' },
      });
    });

    it('throws 404 when leave type not found', async () => {
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        updateLeaveType(999, COMPANY_ID, { name: 'Updated' })
      ).rejects.toThrow(HttpError);
    });

    it('maps snake_case fields to camelCase', async () => {
      const existing = makeLeaveType();
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(existing);
      (mockPrisma.leaveType.update as jest.Mock).mockResolvedValue(existing);

      await updateLeaveType(1, COMPANY_ID, {
        default_balance: 21,
        requires_anniversary: false,
      });

      expect(mockPrisma.leaveType.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          defaultBalance: 21,
          requiresAnniversary: false,
        }),
      });
    });
  });

  // =======================================================================
  // deleteLeaveType
  // =======================================================================
  describe('deleteLeaveType', () => {
    it('deletes leave type when no requests exist', async () => {
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(makeLeaveType());
      (mockPrisma.leaveRequest.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.leaveType.delete as jest.Mock).mockResolvedValue(makeLeaveType());

      await deleteLeaveType(1, COMPANY_ID);

      expect(mockPrisma.leaveType.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws 404 when leave type not found', async () => {
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(deleteLeaveType(999, COMPANY_ID)).rejects.toThrow(HttpError);
    });

    it('throws 400 when leave requests exist for the type', async () => {
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(makeLeaveType());
      (mockPrisma.leaveRequest.count as jest.Mock).mockResolvedValue(5);

      await expect(deleteLeaveType(1, COMPANY_ID)).rejects.toThrow(/Cannot delete leave type/);
    });
  });

  // =======================================================================
  // getEmployeeLeaveBalances
  // =======================================================================
  describe('getEmployeeLeaveBalances', () => {
    it('returns computed balances with availability', async () => {
      const leaveType = makeLeaveType({ id: 1, name: 'Annual Leave', defaultBalance: 14 });
      const employee = makeEmployee({ employmentStartDate: new Date('2020-01-01') });
      const balance = makeBalance({ accrued: 14, used: 3, carriedForward: 2 });

      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([leaveType]);
      (mockPrisma.leaveType.findUnique as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.employeeLeaveBalance.upsert as jest.Mock).mockResolvedValue(balance);
      (mockPrisma.employeeLeaveBalance.findUnique as jest.Mock).mockResolvedValue({
        ...balance,
        leaveType,
      });
      (mockPrisma.employeeLeaveBalance.update as jest.Mock).mockResolvedValue(balance);
      (mockPrisma.leaveBalanceTransaction.create as jest.Mock).mockResolvedValue({});

      const result = await getEmployeeLeaveBalances(1);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            leaveTypeId: 1,
            leaveTypeName: 'Annual Leave',
            accrued: expect.any(Number),
            used: expect.any(Number),
          }),
        ])
      );
    });
  });

  // =======================================================================
  // applyForLeave
  // =======================================================================
  describe('applyForLeave', () => {
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 5);
    const futureEnd = new Date(futureStart);
    futureEnd.setDate(futureEnd.getDate() + 2);

    const setupApplyForLeave = () => {
      const leaveType = makeLeaveType({ id: 1, name: 'Annual Leave', defaultBalance: 14 });
      const employee = makeEmployee({ id: 10, userId: 1, employmentStartDate: new Date('2020-01-01') });
      const balance = makeBalance({ employeeId: 10, leaveTypeId: 1, accrued: 14, used: 0 });

      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.leaveType.findUnique as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([leaveType]);
      (mockPrisma.employeeLeaveBalance.upsert as jest.Mock).mockResolvedValue(balance);
      (mockPrisma.employeeLeaveBalance.findUnique as jest.Mock).mockResolvedValue(balance);
      (mockPrisma.employeeLeaveBalance.update as jest.Mock).mockResolvedValue(balance);
      (mockPrisma.leaveBalanceTransaction.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null); // no overlap
      (mockPrisma.leaveRequest.create as jest.Mock).mockResolvedValue({
        id: 1,
        employeeId: 10,
        leaveTypeId: 1,
        start_date: futureStart,
        end_date: futureEnd,
        status: LeaveStatus.PENDING,
        totalDays: 3,
        leave_type: { name: 'Annual Leave' },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ email: 'kamal@simpala.lk' });

      return { leaveType, employee, balance };
    };

    it('creates a pending leave request', async () => {
      setupApplyForLeave();

      const result = await applyForLeave(
        1,
        {
          leaveTypeId: 1,
          start_date: futureStart.toISOString(),
          end_date: futureEnd.toISOString(),
        },
        COMPANY_ID
      );

      expect(result.status).toBe(LeaveStatus.PENDING);
      expect(mockPrisma.leaveRequest.create).toHaveBeenCalled();
    });

    it('throws BadRequestError when end date is before start date', async () => {
      setupApplyForLeave();
      const pastEnd = new Date(futureStart);
      pastEnd.setDate(pastEnd.getDate() - 1);

      await expect(
        applyForLeave(
          1,
          {
            leaveTypeId: 1,
            start_date: futureStart.toISOString(),
            end_date: pastEnd.toISOString(),
          },
          COMPANY_ID
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when start date is in the past', async () => {
      setupApplyForLeave();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      await expect(
        applyForLeave(
          1,
          {
            leaveTypeId: 1,
            start_date: pastDate.toISOString(),
            end_date: futureEnd.toISOString(),
          },
          COMPANY_ID
        )
      ).rejects.toThrow(/past/);
    });

    it('throws BadRequestError when invalid dates are provided', async () => {
      setupApplyForLeave();

      await expect(
        applyForLeave(
          1,
          {
            leaveTypeId: 1,
            start_date: 'not-a-date',
            end_date: futureEnd.toISOString(),
          },
          COMPANY_ID
        )
      ).rejects.toThrow(/Invalid leave dates/);
    });

    it('throws NotFoundError when employee not found', async () => {
      setupApplyForLeave();
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        applyForLeave(
          1,
          {
            leaveTypeId: 1,
            start_date: futureStart.toISOString(),
            end_date: futureEnd.toISOString(),
          },
          COMPANY_ID
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when leave type not found', async () => {
      setupApplyForLeave();
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        applyForLeave(
          1,
          {
            leaveTypeId: 999,
            start_date: futureStart.toISOString(),
            end_date: futureEnd.toISOString(),
          },
          COMPANY_ID
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when overlapping leave exists', async () => {
      setupApplyForLeave();
      (mockPrisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue({ id: 99 });

      await expect(
        applyForLeave(
          1,
          {
            leaveTypeId: 1,
            start_date: futureStart.toISOString(),
            end_date: futureEnd.toISOString(),
          },
          COMPANY_ID
        )
      ).rejects.toThrow(ConflictError);
    });

    it('throws BadRequestError when insufficient balance', async () => {
      const leaveType = makeLeaveType({ id: 1, name: 'Annual Leave', defaultBalance: 14 });
      const employee = makeEmployee({ id: 10, userId: 1, employmentStartDate: new Date('2020-01-01') });
      // Only 1 day available
      const lowBalance = makeBalance({ employeeId: 10, leaveTypeId: 1, accrued: 1, used: 0, carriedForward: 0 });

      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.leaveType.findFirst as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.leaveType.findUnique as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([leaveType]);
      (mockPrisma.employeeLeaveBalance.upsert as jest.Mock).mockResolvedValue(lowBalance);
      (mockPrisma.employeeLeaveBalance.findUnique as jest.Mock).mockResolvedValue(lowBalance);
      (mockPrisma.employeeLeaveBalance.update as jest.Mock).mockResolvedValue(lowBalance);
      (mockPrisma.leaveBalanceTransaction.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null); // no overlap

      // Request 5 days but only have 1
      const start = new Date();
      start.setDate(start.getDate() + 5);
      const end = new Date(start);
      end.setDate(end.getDate() + 4); // 5 days

      await expect(
        applyForLeave(
          1,
          {
            leaveTypeId: 1,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
          },
          COMPANY_ID
        )
      ).rejects.toThrow(/Insufficient leave balance/);
    });
  });

  // =======================================================================
  // updateLeaveRequestStatus
  // =======================================================================
  describe('updateLeaveRequestStatus', () => {
    const setupUpdateStatus = (status: LeaveStatus = LeaveStatus.PENDING) => {
      const leaveType = makeLeaveType({ id: 1, name: 'Annual Leave' });
      const leaveRequest = {
        id: 1,
        employeeId: 10,
        leaveTypeId: 1,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-03-03'),
        status,
        totalDays: new Prisma.Decimal(3),
        employee: {
          id: 10,
          first_name: 'Kamal',
          last_name: 'Perera',
          user: { companyId: COMPANY_ID, email: 'kamal@simpala.lk' },
        },
        leave_type: leaveType,
      };
      const balance = makeBalance({ employeeId: 10, leaveTypeId: 1, accrued: 14, used: 0 });
      const employee = makeEmployee({ id: 10, employmentStartDate: new Date('2020-01-01') });

      (mockPrisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(leaveRequest);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.leaveType.findUnique as jest.Mock).mockResolvedValue(leaveType);
      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([leaveType]);
      (mockPrisma.employeeLeaveBalance.upsert as jest.Mock).mockResolvedValue(balance);
      (mockPrisma.employeeLeaveBalance.findUnique as jest.Mock).mockResolvedValue(balance);
      (mockPrisma.employeeLeaveBalance.update as jest.Mock).mockResolvedValue({
        ...balance,
        used: new Prisma.Decimal(3),
      });
      (mockPrisma.leaveBalanceTransaction.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.leaveRequest.update as jest.Mock).mockResolvedValue({
        ...leaveRequest,
        status: LeaveStatus.APPROVED,
        employee: {
          ...leaveRequest.employee,
          user: { email: 'kamal@simpala.lk' },
        },
        leave_type: { name: 'Annual Leave' },
      });

      return { leaveRequest, balance, leaveType };
    };

    it('approves a pending leave request and deducts balance', async () => {
      setupUpdateStatus(LeaveStatus.PENDING);

      const result = await updateLeaveRequestStatus(1, LeaveStatus.APPROVED, COMPANY_ID);

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(mockPrisma.employeeLeaveBalance.update).toHaveBeenCalled();
      expect(mockPrisma.leaveBalanceTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: LeaveBalanceReason.USAGE,
          }),
        })
      );
    });

    it('throws 404 when leave request not found', async () => {
      (mockPrisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        updateLeaveRequestStatus(999, LeaveStatus.APPROVED, COMPANY_ID)
      ).rejects.toThrow(HttpError);
    });

    it('throws 404 when leave request belongs to a different company', async () => {
      const leaveRequest = {
        id: 1,
        employeeId: 10,
        leaveTypeId: 1,
        start_date: new Date(),
        end_date: new Date(),
        status: LeaveStatus.PENDING,
        totalDays: new Prisma.Decimal(1),
        employee: {
          id: 10,
          first_name: 'Test',
          last_name: 'User',
          user: { companyId: 999 }, // different company
        },
        leave_type: makeLeaveType(),
      };
      (mockPrisma.leaveRequest.findUnique as jest.Mock).mockResolvedValue(leaveRequest);

      await expect(
        updateLeaveRequestStatus(1, LeaveStatus.APPROVED, COMPANY_ID)
      ).rejects.toThrow(/not found/);
    });

    it('reverses balance when rejecting a previously approved request', async () => {
      setupUpdateStatus(LeaveStatus.APPROVED);

      // Override the update mock to return REJECTED with all required date fields
      (mockPrisma.leaveRequest.update as jest.Mock).mockResolvedValue({
        id: 1,
        status: LeaveStatus.REJECTED,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-03-03'),
        employee: {
          first_name: 'Kamal',
          last_name: 'Perera',
          user: { email: 'kamal@simpala.lk' },
        },
        leave_type: { name: 'Annual Leave' },
      });

      const result = await updateLeaveRequestStatus(1, LeaveStatus.REJECTED, COMPANY_ID);

      expect(result.status).toBe(LeaveStatus.REJECTED);
      // Should create a REVERSAL transaction
      expect(mockPrisma.leaveBalanceTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: LeaveBalanceReason.REVERSAL,
          }),
        })
      );
    });
  });

  // =======================================================================
  // getEmployeeByUserId
  // =======================================================================
  describe('getEmployeeByUserId', () => {
    it('returns employee when user exists with employee record', async () => {
      const employee = makeEmployee();
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        employee,
      });

      const result = await getEmployeeByUserId(1);

      expect(result).toEqual(employee);
    });

    it('returns null when user has no employee record', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        employee: null,
      });

      const result = await getEmployeeByUserId(1);

      expect(result).toBeNull();
    });

    it('returns null when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getEmployeeByUserId(999);

      expect(result).toBeNull();
    });
  });

  // =======================================================================
  // getLeaveRequests
  // =======================================================================
  describe('getLeaveRequests', () => {
    it('returns leave requests scoped to company', async () => {
      const requests = [
        {
          id: 1,
          status: LeaveStatus.PENDING,
          employee: { first_name: 'Kamal', last_name: 'Perera' },
          leave_type: { name: 'Annual Leave' },
        },
      ];
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(requests);

      const result = await getLeaveRequests({ status: LeaveStatus.PENDING }, COMPANY_ID);

      expect(result).toEqual(requests);
      expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                employee: { user: { companyId: COMPANY_ID } },
              }),
            ]),
          }),
        })
      );
    });
  });

  // =======================================================================
  // getLeaveRequestById
  // =======================================================================
  describe('getLeaveRequestById', () => {
    it('returns leave request by id scoped to company', async () => {
      const request = {
        id: 1,
        employee: { first_name: 'Kamal', last_name: 'Perera' },
        leave_type: { name: 'Annual Leave' },
      };
      (mockPrisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(request);

      const result = await getLeaveRequestById(1, COMPANY_ID);

      expect(result).toEqual(request);
    });

    it('returns null when request not found', async () => {
      (mockPrisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getLeaveRequestById(999, COMPANY_ID);

      expect(result).toBeNull();
    });

    it('filters by employeeId when provided', async () => {
      (mockPrisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null);

      await getLeaveRequestById(1, COMPANY_ID, 10);

      expect(mockPrisma.leaveRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 1,
            employeeId: 10,
          }),
        })
      );
    });
  });

  // =======================================================================
  // initializeLeaveBalancesForEmployee
  // =======================================================================
  describe('initializeLeaveBalancesForEmployee', () => {
    it('creates balance records for all company leave types', async () => {
      const leaveTypes = [
        makeLeaveType({ id: 1, name: 'Annual Leave' }),
        makeLeaveType({ id: 2, name: 'Casual Leave' }),
      ];
      const employee = makeEmployee();
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue(leaveTypes);
      (mockPrisma.employeeLeaveBalance.upsert as jest.Mock).mockResolvedValue(makeBalance());

      const result = await initializeLeaveBalancesForEmployee(1);

      expect(result).toEqual(leaveTypes);
      expect(mockPrisma.employeeLeaveBalance.upsert).toHaveBeenCalledTimes(2);
    });

    it('throws NotFoundError when employee not found', async () => {
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(initializeLeaveBalancesForEmployee(999)).rejects.toThrow(NotFoundError);
    });
  });
});
