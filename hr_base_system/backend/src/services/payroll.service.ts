import { Prisma } from '@prisma/client';
import { buildPayslipPdf, PayslipWithRelations } from '../utils/pdf/payslipPdf';
import { PAYROLL_CONSTANTS } from '../config/payroll.constants';
import { calculatePAYEDecimal } from '../utils/paye';
import { prisma } from '../prismaClient';
import { HttpError } from '../middleware/error.middleware';
import logger from '../utils/logger';

interface PayrollInput {
  employeeId: number;
  month: number;
  year: number;
}

export const getEmployeeByUserId = async (userId: number) => {
  const employee = await prisma.employee.findFirst({
    where: { userId },
  });
  return employee;
};

export const getEmployeeById = async (employeeId: number) => {
  return prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: {
        select: {
          companyId: true,
        },
      },
    },
  });
};

export const getPayslipById = async (id: number, companyId: number) => {
  return prisma.payslip.findFirst({
    where: {
      id,
      employee: {
        user: {
          companyId,
        },
      },
    },
    include: {
      employee: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
  });
};

export const getPayslips = async (where: Prisma.PayslipWhereInput) => {
  const payslips = await prisma.payslip.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
  });
  return payslips;
};

export const runPayroll = async ({
  companyId,
  month,
  year,
  employeeIds,
  requestedBy,
}: {
  companyId: number;
  month: number;
  year: number;
  employeeIds?: number[];
  requestedBy: number;
}) => {
  // Fetch eligible employees scoped to company
  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      user: { companyId },
      ...(employeeIds ? { id: { in: employeeIds } } : {}),
    },
    select: { id: true },
  });

  const created: number[] = [];
  const skipped: { employeeId: number; reason: string }[] = [];

  for (const employee of employees) {
    try {
      const payslip = await generatePayslip({ employeeId: employee.id, month, year });
      created.push(payslip.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      skipped.push({ employeeId: employee.id, reason: message });
    }
  }

  return {
    success: skipped.length === 0,
    created,
    skipped,
    month,
    year,
    requestedBy,
  };
};

export const generatePayslip = async (payrollInput: PayrollInput) => {
  const { employeeId, month, year } = payrollInput;
  logger.info(`[PAYROLL_SERVICE] generatePayslip called`, { employeeId, month, year });

  // Check for duplicate payslip
  const existingPayslip = await prisma.payslip.findFirst({
    where: {
      employeeId,
      month,
      year,
    },
  });

  if (existingPayslip) {
    throw new HttpError(
      `Payslip already exists for employee ${employeeId} for ${month}/${year}. Payslip ID: ${existingPayslip.id}`,
      409
    );
  }

  // 1. Get employee details
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  logger.info(`[PAYROLL_SERVICE] Employee lookup result`, { found: !!employee, employeeId: employee?.id });

  if (!employee) {
    throw new HttpError('Employee not found', 404);
  }

  // 2. Calculate Date Range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // 3. Calculate No-Pay Days
  // Fetch ABSENT attendance records
  const absentRecords = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: endDate },
      status: 'ABSENT',
    },
  });

  // Fetch APPROVED leave requests that overlap with the month
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      AND: [
        { start_date: { lte: endDate } },
        { end_date: { gte: startDate } },
      ],
    },
  });

  let noPayDays = 0;
  for (const record of absentRecords) {
    // Check if this absent day is covered by any approved leave
    // Note: comparing dates directly can be tricky with times. 
    // Assuming dates are stored as midnight UTC or similar consistent format.
    // We'll compare timestamps or date strings to be safe.
    const recordTime = new Date(record.date).setHours(0, 0, 0, 0);

    const isCoveredByLeave = approvedLeaves.some((leave) => {
      const leaveStart = new Date(leave.start_date).setHours(0, 0, 0, 0);
      const leaveEnd = new Date(leave.end_date).setHours(0, 0, 0, 0);
      return recordTime >= leaveStart && recordTime <= leaveEnd;
    });

    if (!isCoveredByLeave) {
      noPayDays++;
    }
  }

  // 4. Calculate Earnings & Deductions (Using Decimal)
  const basicSalary = new Prisma.Decimal(employee.salary?.toString() || '0');
  const employeeAllowances = new Prisma.Decimal(employee.allowances?.toString() || '0');
  const dailyRate = basicSalary.dividedBy(PAYROLL_CONSTANTS.DAYS_IN_MONTH_FOR_DAILY_RATE);
  const noPayDeduction = dailyRate.times(noPayDays);

  // Gross Pay = Basic Salary + Allowances - No Pay Deduction
  // Ensure gross pay doesn't go below 0
  let gross_pay = basicSalary.plus(employeeAllowances).minus(noPayDeduction);
  if (gross_pay.lessThan(0)) {
    gross_pay = new Prisma.Decimal(0);
  }

  // Statutory Deductions
  const epf_employee = gross_pay.times(PAYROLL_CONSTANTS.EPF_EMPLOYEE_RATE);
  const epf_employer = gross_pay.times(PAYROLL_CONSTANTS.EPF_EMPLOYER_RATE);
  const etf = gross_pay.times(PAYROLL_CONSTANTS.ETF_EMPLOYER_RATE);

  // PAYE Calculation (using shared Decimal-aware utility)
  const paye = calculatePAYEDecimal(gross_pay);

  // Net Pay
  const net_pay = gross_pay.minus(epf_employee).minus(paye);

  // 5. Create and return payslip
  const payslip = await prisma.payslip.create({
    data: {
      employeeId,
      month,
      year,
      basic_salary: basicSalary,
      allowances: employeeAllowances,
      gross_pay,
      epf_employee,
      epf_employer,
      etf,
      paye,
      net_pay,
    },
  });

  return payslip;
};

// NOTE: PAYE calculation moved to `src/utils/paye.ts`.

export const generatePayslipPdf = async (payslipId: number) => {
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: {
        include: {
          user: {
            include: {
              company: true,
            },
          },
        },
      },
    },
  });

  if (!payslip) {
    return null;
  }

  const pdfBuffer = await buildPayslipPdf(payslip as PayslipWithRelations);

  return { payslip, pdfBuffer };
};

export const getPayrollStatistics = async ({
  month,
  year,
  companyId,
}: {
  month: number;
  year: number;
  companyId: number;
}) => {
  const payslips = await prisma.payslip.findMany({
    where: {
      month,
      year,
      employee: {
        user: {
          companyId,
        },
      },
    },
  });

  const stats = payslips.reduce(
    (acc, payslip) => {
      acc.totalGrossPay = acc.totalGrossPay.plus(new Prisma.Decimal(payslip.gross_pay?.toString() || '0'));
      acc.totalNetPay = acc.totalNetPay.plus(new Prisma.Decimal(payslip.net_pay?.toString() || '0'));
      acc.totalEpfEmployee = acc.totalEpfEmployee.plus(new Prisma.Decimal(payslip.epf_employee?.toString() || '0'));
      acc.totalEpfEmployer = acc.totalEpfEmployer.plus(new Prisma.Decimal(payslip.epf_employer?.toString() || '0'));
      acc.totalEtf = acc.totalEtf.plus(new Prisma.Decimal(payslip.etf?.toString() || '0'));
      acc.totalPaye = acc.totalPaye.plus(new Prisma.Decimal(payslip.paye?.toString() || '0'));
      return acc;
    },
    {
      totalGrossPay: new Prisma.Decimal(0),
      totalNetPay: new Prisma.Decimal(0),
      totalEpfEmployee: new Prisma.Decimal(0),
      totalEpfEmployer: new Prisma.Decimal(0),
      totalEtf: new Prisma.Decimal(0),
      totalPaye: new Prisma.Decimal(0),
    }
  );

  return {
    totalGrossPay: stats.totalGrossPay.toNumber(),
    totalNetPay: stats.totalNetPay.toNumber(),
    totalEpfEmployee: stats.totalEpfEmployee.toNumber(),
    totalEpfEmployer: stats.totalEpfEmployer.toNumber(),
    totalEtf: stats.totalEtf.toNumber(),
    totalPaye: stats.totalPaye.toNumber(),
    employeeCount: payslips.length,
  };
};
