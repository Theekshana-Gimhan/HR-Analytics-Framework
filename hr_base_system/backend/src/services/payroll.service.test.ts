import { Prisma } from '@prisma/client';
import {
  getEmployeeByUserId,
  getEmployeeById,
  getPayslipById,
  getPayslips,
  runPayroll,
  generatePayslip,
  generatePayslipPdf,
  getPayrollStatistics,
} from './payroll.service';
import { prisma } from '../prismaClient';
import { HttpError } from '../middleware/error.middleware';
import { PAYROLL_CONSTANTS } from '../config/payroll.constants';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock('../prismaClient', () => ({
  prisma: {
    employee: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    payslip: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: logger,
  };
});

jest.mock('../utils/pdf/payslipPdf', () => ({
  buildPayslipPdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEmployee = (overrides: Partial<{
  id: number;
  userId: number;
  salary: number;
  allowances: number;
  first_name: string;
  last_name: string;
}> = {}) => ({
  id: overrides.id ?? 1,
  userId: overrides.userId ?? 1,
  first_name: overrides.first_name ?? 'Kamal',
  last_name: overrides.last_name ?? 'Perera',
  salary: overrides.salary ?? 100000,
  allowances: overrides.allowances ?? 10000,
  isActive: true,
  nic: '199912345678',
  employmentStartDate: new Date('2020-01-01'),
  user: { companyId: 1 },
});

const makePayslip = (overrides: Partial<{
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basic_salary: number;
  gross_pay: number;
  net_pay: number;
  epf_employee: number;
  epf_employer: number;
  etf: number;
  paye: number;
}> = {}) => ({
  id: overrides.id ?? 1,
  employeeId: overrides.employeeId ?? 1,
  month: overrides.month ?? 3,
  year: overrides.year ?? 2026,
  basic_salary: new Prisma.Decimal(overrides.basic_salary ?? 100000),
  allowances: new Prisma.Decimal(10000),
  gross_pay: new Prisma.Decimal(overrides.gross_pay ?? 110000),
  net_pay: new Prisma.Decimal(overrides.net_pay ?? 95000),
  epf_employee: new Prisma.Decimal(overrides.epf_employee ?? 8800),
  epf_employer: new Prisma.Decimal(overrides.epf_employer ?? 13200),
  etf: new Prisma.Decimal(overrides.etf ?? 3300),
  paye: new Prisma.Decimal(overrides.paye ?? 0),
  employee: {
    id: overrides.employeeId ?? 1,
    first_name: 'Kamal',
    last_name: 'Perera',
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('payroll.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =======================================================================
  // getEmployeeByUserId
  // =======================================================================
  describe('getEmployeeByUserId', () => {
    it('returns employee when found by userId', async () => {
      const employee = makeEmployee();
      (mockPrisma.employee.findFirst as jest.Mock).mockResolvedValue(employee);

      const result = await getEmployeeByUserId(1);

      expect(result).toEqual(employee);
      expect(mockPrisma.employee.findFirst).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });

    it('returns null when employee not found', async () => {
      (mockPrisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getEmployeeByUserId(999);

      expect(result).toBeNull();
    });
  });

  // =======================================================================
  // getEmployeeById
  // =======================================================================
  describe('getEmployeeById', () => {
    it('returns employee with companyId included', async () => {
      const employee = makeEmployee();
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);

      const result = await getEmployeeById(1);

      expect(result).toEqual(employee);
      expect(mockPrisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          user: { select: { companyId: true } },
        },
      });
    });
  });

  // =======================================================================
  // getPayslipById
  // =======================================================================
  describe('getPayslipById', () => {
    it('returns payslip scoped to company', async () => {
      const payslip = makePayslip();
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(payslip);

      const result = await getPayslipById(1, 1);

      expect(result).toEqual(payslip);
      expect(mockPrisma.payslip.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 1,
            employee: { user: { companyId: 1 } },
          }),
        })
      );
    });

    it('returns null when payslip not found', async () => {
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getPayslipById(999, 1);

      expect(result).toBeNull();
    });
  });

  // =======================================================================
  // getPayslips
  // =======================================================================
  describe('getPayslips', () => {
    it('returns payslips matching where clause with employee info', async () => {
      const payslips = [makePayslip({ id: 1 }), makePayslip({ id: 2 })];
      (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue(payslips);

      const result = await getPayslips({ month: 3, year: 2026 });

      expect(result).toHaveLength(2);
      expect(mockPrisma.payslip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { month: 3, year: 2026 },
          include: expect.objectContaining({
            employee: expect.any(Object),
          }),
          orderBy: { id: 'desc' },
        })
      );
    });
  });

  // =======================================================================
  // generatePayslip
  // =======================================================================
  describe('generatePayslip', () => {
    it('calculates payslip with Sri Lankan statutory deductions', async () => {
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null); // no duplicate
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(makeEmployee({
        salary: 100000,
        allowances: 10000,
      }));
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([]); // no absences
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const result = await generatePayslip({ employeeId: 1, month: 3, year: 2026 });

      // Gross = 100000 + 10000 = 110000
      const grossPay = new Prisma.Decimal(110000);
      expect(result.gross_pay.toString()).toBe(grossPay.toString());

      // EPF Employee = 8% of gross
      const expectedEpfEmployee = grossPay.mul(PAYROLL_CONSTANTS.EPF_EMPLOYEE_RATE);
      expect(result.epf_employee.toString()).toBe(expectedEpfEmployee.toString());

      // EPF Employer = 12% of gross
      const expectedEpfEmployer = grossPay.mul(PAYROLL_CONSTANTS.EPF_EMPLOYER_RATE);
      expect(result.epf_employer.toString()).toBe(expectedEpfEmployer.toString());

      // ETF = 3% of gross
      const expectedEtf = grossPay.mul(PAYROLL_CONSTANTS.ETF_EMPLOYER_RATE);
      expect(result.etf.toString()).toBe(expectedEtf.toString());
    });

    it('throws 409 when payslip already exists for the period', async () => {
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(makePayslip());

      await expect(
        generatePayslip({ employeeId: 1, month: 3, year: 2026 })
      ).rejects.toThrow(HttpError);
    });

    it('throws 404 when employee not found', async () => {
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        generatePayslip({ employeeId: 999, month: 3, year: 2026 })
      ).rejects.toThrow(HttpError);
    });

    it('deducts no-pay days for uncovered absences', async () => {
      const employee = makeEmployee({ salary: 90000, allowances: 0 });
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([
        { employeeId: 1, date: new Date('2026-03-10'), status: 'ABSENT' },
        { employeeId: 1, date: new Date('2026-03-11'), status: 'ABSENT' },
      ]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const result = await generatePayslip({ employeeId: 1, month: 3, year: 2026 });

      // 2 no-pay days: dailyRate = 90000/30 = 3000, deduction = 6000
      // gross = 90000 - 6000 = 84000
      const expectedGross = new Prisma.Decimal(84000);
      expect(result.gross_pay.toString()).toBe(expectedGross.toString());
    });

    it('does not deduct absences covered by approved leave', async () => {
      const employee = makeEmployee({ salary: 90000, allowances: 0 });
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([
        { employeeId: 1, date: new Date('2026-03-10'), status: 'ABSENT' },
      ]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([
        {
          employeeId: 1,
          start_date: new Date('2026-03-09'),
          end_date: new Date('2026-03-11'),
          status: 'APPROVED',
        },
      ]);
      (mockPrisma.payslip.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const result = await generatePayslip({ employeeId: 1, month: 3, year: 2026 });

      // Absence on 3/10 is covered by approved leave, so no deduction
      const expectedGross = new Prisma.Decimal(90000);
      expect(result.gross_pay.toString()).toBe(expectedGross.toString());
    });

    it('sets gross pay to 0 when deductions exceed salary', async () => {
      const employee = makeEmployee({ salary: 3000, allowances: 0 });
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);

      // 25 absent days - deduction would be 25 * (3000/30) = 2500
      const absences = Array.from({ length: 25 }, (_, i) => ({
        employeeId: 1,
        date: new Date(`2026-03-${String(i + 1).padStart(2, '0')}`),
        status: 'ABSENT',
      }));
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue(absences);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const result = await generatePayslip({ employeeId: 1, month: 3, year: 2026 });

      // gross_pay should not be negative
      expect(parseFloat(result.gross_pay.toString())).toBeGreaterThanOrEqual(0);
    });

    it('handles employee with zero allowances', async () => {
      const employee = makeEmployee({ salary: 50000, allowances: 0 });
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const result = await generatePayslip({ employeeId: 1, month: 3, year: 2026 });

      expect(result.gross_pay.toString()).toBe('50000');
    });

    it('handles employee with null allowances', async () => {
      const employee = { ...makeEmployee(), allowances: null };
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const result = await generatePayslip({ employeeId: 1, month: 3, year: 2026 });

      // With null allowances, gross = salary only
      expect(result.gross_pay.toString()).toBe(new Prisma.Decimal(100000).toString());
    });

    it('calculates net pay as gross - EPF employee - PAYE', async () => {
      const employee = makeEmployee({ salary: 100000, allowances: 0 });
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const result = await generatePayslip({ employeeId: 1, month: 3, year: 2026 });

      const gross = new Prisma.Decimal(100000);
      const epfEmployee = gross.mul(PAYROLL_CONSTANTS.EPF_EMPLOYEE_RATE);
      const expectedNet = gross.sub(epfEmployee).sub(result.paye);
      expect(result.net_pay.toString()).toBe(expectedNet.toString());
    });
  });

  // =======================================================================
  // runPayroll
  // =======================================================================
  describe('runPayroll', () => {
    it('runs payroll for all active employees in a company', async () => {
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      // Mock generatePayslip behavior via payslip.findFirst (for duplicate check) + employee + create
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock)
        .mockResolvedValueOnce(makeEmployee({ id: 1 }))
        .mockResolvedValueOnce(makeEmployee({ id: 2 }));
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock)
        .mockResolvedValueOnce({ id: 100 })
        .mockResolvedValueOnce({ id: 101 });

      const result = await runPayroll({
        companyId: 1,
        month: 3,
        year: 2026,
        requestedBy: 1,
      });

      expect(result.created).toEqual([100, 101]);
      expect(result.skipped).toEqual([]);
      expect(result.success).toBe(true);
    });

    it('skips employees that throw errors and continues', async () => {
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      // First employee has existing payslip (duplicate error)
      (mockPrisma.payslip.findFirst as jest.Mock)
        .mockResolvedValueOnce(makePayslip({ id: 50 })) // duplicate for emp 1
        .mockResolvedValueOnce(null); // no duplicate for emp 2
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(makeEmployee({ id: 2 }));
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockResolvedValue({ id: 101 });

      const result = await runPayroll({
        companyId: 1,
        month: 3,
        year: 2026,
        requestedBy: 1,
      });

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].employeeId).toBe(1);
      expect(result.created).toContain(101);
      expect(result.success).toBe(false);
    });

    it('filters by specific employeeIds when provided', async () => {
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([{ id: 5 }]);
      (mockPrisma.payslip.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue(makeEmployee({ id: 5 }));
      (mockPrisma.attendanceRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.payslip.create as jest.Mock).mockResolvedValue({ id: 200 });

      await runPayroll({
        companyId: 1,
        month: 3,
        year: 2026,
        employeeIds: [5],
        requestedBy: 1,
      });

      expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: [5] },
          }),
        })
      );
    });

    it('returns empty created list when no employees exist', async () => {
      (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runPayroll({
        companyId: 1,
        month: 3,
        year: 2026,
        requestedBy: 1,
      });

      expect(result.created).toEqual([]);
      expect(result.success).toBe(true);
    });
  });

  // =======================================================================
  // generatePayslipPdf
  // =======================================================================
  describe('generatePayslipPdf', () => {
    it('returns payslip and PDF buffer when payslip exists', async () => {
      const payslip = makePayslip();
      (mockPrisma.payslip.findUnique as jest.Mock).mockResolvedValue(payslip);

      const result = await generatePayslipPdf(1);

      expect(result).not.toBeNull();
      expect(result!.payslip).toEqual(payslip);
      expect(result!.pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('returns null when payslip not found', async () => {
      (mockPrisma.payslip.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await generatePayslipPdf(999);

      expect(result).toBeNull();
    });
  });

  // =======================================================================
  // getPayrollStatistics
  // =======================================================================
  describe('getPayrollStatistics', () => {
    it('aggregates payslip totals for a month', async () => {
      const payslips = [
        makePayslip({ gross_pay: 100000, net_pay: 85000, epf_employee: 8000, epf_employer: 12000, etf: 3000, paye: 4000 }),
        makePayslip({ gross_pay: 80000, net_pay: 68000, epf_employee: 6400, epf_employer: 9600, etf: 2400, paye: 3200 }),
      ];
      (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue(payslips);

      const result = await getPayrollStatistics({ month: 3, year: 2026, companyId: 1 });

      expect(result.totalGrossPay).toBe(180000);
      expect(result.totalNetPay).toBe(153000);
      expect(result.totalEpfEmployee).toBe(14400);
      expect(result.totalEpfEmployer).toBe(21600);
      expect(result.totalEtf).toBe(5400);
      expect(result.totalPaye).toBe(7200);
      expect(result.employeeCount).toBe(2);
    });

    it('returns zeroes when no payslips exist', async () => {
      (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getPayrollStatistics({ month: 3, year: 2026, companyId: 1 });

      expect(result.totalGrossPay).toBe(0);
      expect(result.totalNetPay).toBe(0);
      expect(result.employeeCount).toBe(0);
    });

    it('scopes payslips to the correct company', async () => {
      (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([]);

      await getPayrollStatistics({ month: 3, year: 2026, companyId: 5 });

      expect(mockPrisma.payslip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            month: 3,
            year: 2026,
            employee: { user: { companyId: 5 } },
          }),
        })
      );
    });
  });
});
