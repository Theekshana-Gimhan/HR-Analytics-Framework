import { LeaveStatus, LeaveType, Prisma, LeaveBalanceReason, PrismaClient } from '@prisma/client';
import { BalanceWithLeaveType, CreateLeaveTypeData, ApplyForLeaveData } from '@simpala/types';
import { prisma } from '../prismaClient';
import { HttpError, BadRequestError, NotFoundError, ConflictError } from '../middleware/error.middleware';
import { sendEmail } from './email.service';
import {
  leaveRequestSubmittedTemplate,
  leaveApprovedTemplate,
  leaveRejectedTemplate,
} from '../templates/email-templates';

type TxClient = Prisma.TransactionClient;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const STATUTORY_LEAVE_RULES: Record<string, { cap: number; requiresAnniversary?: boolean }> = {
  'Annual Leave': { cap: 14, requiresAnniversary: true },
  'Casual Leave': { cap: 7, requiresAnniversary: false },
  'Medical Leave': { cap: 7, requiresAnniversary: true },
};

const toNumber = (value: Prisma.Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  return Number(value);
};

const normalizeDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const calculateLeaveDays = (start: Date, end: Date) => {
  const normalizedStart = normalizeDate(start);
  const normalizedEnd = normalizeDate(end);
  if (normalizedEnd < normalizedStart) {
    throw new BadRequestError('End date must be on or after start date');
  }
  return Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / MS_PER_DAY) + 1;
};

const calculateCompletedYears = (startDate: Date, asOf: Date) => {
  let years = asOf.getUTCFullYear() - startDate.getUTCFullYear();
  const anniversary = new Date(startDate);
  anniversary.setUTCFullYear(startDate.getUTCFullYear() + years);
  if (anniversary > asOf) {
    years -= 1;
  }
  return years < 0 ? 0 : years;
};

const getClient = (tx?: TxClient) => tx ?? prisma;

const enforceStatutoryLeaveType = async (
  leaveType: LeaveType,
  client: PrismaClient | TxClient
) => {
  const rule = STATUTORY_LEAVE_RULES[leaveType.name];
  if (!rule) {
    return leaveType;
  }

  const updates: Prisma.LeaveTypeUpdateInput = {};

  if (Math.abs(toNumber(leaveType.defaultBalance) - rule.cap) > 1e-6) {
    updates.defaultBalance = rule.cap;
  }

  if (
    rule.requiresAnniversary !== undefined &&
    leaveType.requiresAnniversary !== rule.requiresAnniversary
  ) {
    updates.requiresAnniversary = rule.requiresAnniversary;
  }

  if (Object.keys(updates).length === 0) {
    return leaveType;
  }

  // Persist the correction so subsequent requests stay compliant with statutory caps
  return await client.leaveType.update({
    where: { id: leaveType.id },
    data: updates,
  });
};

const ensureBalanceRecord = async (
  employeeId: number,
  leaveTypeId: number,
  client: PrismaClient | TxClient
) => {
  return await client.employeeLeaveBalance.upsert({
    where: {
      employeeId_leaveTypeId: {
        employeeId,
        leaveTypeId,
      },
    },
    update: {},
    create: {
      employeeId,
      leaveTypeId,
    },
  });
};

const getStatutoryRule = (leaveType: { name: string }) => STATUTORY_LEAVE_RULES[leaveType.name];

const computeAvailability = (balance: {
  accrued: Prisma.Decimal | number;
  carriedForward: Prisma.Decimal | number;
  used: Prisma.Decimal | number;
}) => {
  return toNumber(balance.accrued) + toNumber(balance.carriedForward) - toNumber(balance.used);
};

const computeAvailabilityWithCap = (
  balance: {
    accrued: Prisma.Decimal | number;
    carriedForward: Prisma.Decimal | number;
    used: Prisma.Decimal | number;
  },
  leaveType: { name: string }
) => {
  const availableRaw = computeAvailability(balance);
  const ruleCap = getStatutoryRule(leaveType)?.cap;
  if (ruleCap === undefined) {
    return availableRaw;
  }

  const carriedForward = toNumber(balance.carriedForward);
  const cappedAccrued = Math.min(availableRaw, ruleCap + carriedForward);
  return Math.max(0, cappedAccrued);
};

const syncLeaveBalance = async (
  employeeId: number,
  leaveTypeId: number,
  client: PrismaClient | TxClient,
  asOf: Date = new Date()
) => {
  const [employee, leaveTypeRaw, balance] = await Promise.all([
    client.employee.findUnique({ where: { id: employeeId } }),
    client.leaveType.findUnique({ where: { id: leaveTypeId } }),
    client.employeeLeaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId: {
          employeeId,
          leaveTypeId,
        },
      },
    }),
  ]);

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  if (!leaveTypeRaw) {
    throw new NotFoundError('Leave type not found');
  }

  const leaveType = await enforceStatutoryLeaveType(leaveTypeRaw, client);

  const existingBalance = balance ?? (await ensureBalanceRecord(employeeId, leaveTypeId, client));

  const accrued = toNumber(existingBalance.accrued);
  const used = toNumber(existingBalance.used);
  const carriedForward = toNumber(existingBalance.carriedForward);
  const defaultBalance = toNumber(leaveType.defaultBalance);

  const asOfDate = normalizeDate(asOf);
  const completedYears = calculateCompletedYears(employee.employmentStartDate, asOfDate);
  const eligiblePeriods = leaveType.requiresAnniversary ? (completedYears >= 1 ? 1 : 0) : 1;
  const targetAccrued = Math.min(defaultBalance, Math.max(0, eligiblePeriods * defaultBalance));

  if (Math.abs(targetAccrued - accrued) > 1e-6) {
    const delta = targetAccrued - accrued;
    const updatedBalance = await client.employeeLeaveBalance.update({
      where: { id: existingBalance.id },
      data: {
        accrued: targetAccrued,
        lastAccruedAt: asOfDate,
      },
    });

    const available = computeAvailability({
      accrued: targetAccrued,
      carriedForward,
      used,
    });
    await client.leaveBalanceTransaction.create({
      data: {
        leaveBalanceId: updatedBalance.id,
        change: delta,
        balanceAfter: available,
        reason: delta >= 0 ? LeaveBalanceReason.ACCRUAL : LeaveBalanceReason.ADJUSTMENT,
        note: `Accrual sync as of ${asOf.toISOString().slice(0, 10)}`,
      },
    });

    return updatedBalance;
  }

  if (!existingBalance.lastAccruedAt) {
    return await client.employeeLeaveBalance.update({
      where: { id: existingBalance.id },
      data: { lastAccruedAt: asOfDate },
    });
  }

  return existingBalance;
};

export const initializeLeaveBalancesForEmployee = async (
  employeeId: number,
  tx?: TxClient
): Promise<LeaveType[]> => {
  const client = getClient(tx);
  const employee = await client.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  const leaveTypes = await client.leaveType.findMany({
    where: {
      companyId: employee.user.companyId,
    },
  });

  await Promise.all(
    leaveTypes.map(async (type: LeaveType) => {
      await ensureBalanceRecord(employee.id, type.id, client);
    })
  );

  return leaveTypes;
};

export const getAllLeaveTypes = async (companyId: number) => {
  return await prisma.leaveType.findMany({
    where: {
      companyId,
    },
    orderBy: {
      id: 'asc',
    },
  });
};

export const createLeaveType = async (leaveTypeData: CreateLeaveTypeData) => {
  return await prisma.$transaction(async (tx: TxClient) => {
    const { name, default_balance, requires_anniversary, companyId } = leaveTypeData;

    // Validate required fields explicitly
    if (!companyId || !name || default_balance === undefined) {
      throw new BadRequestError(
        `Missing required fields: companyId=${companyId}, name=${name}, default_balance=${default_balance}`
      );
    }

    // Log the exact data being passed to Prisma for debugging
    const statutoryRule = STATUTORY_LEAVE_RULES[name];
    const createData = {
      name,
      companyId,
      defaultBalance: statutoryRule?.cap ?? default_balance,
      requiresAnniversary: statutoryRule?.requiresAnniversary ?? requires_anniversary ?? false,
    };
    // 1. Create the leave type using direct field assignment (NOT relation connect)
    const leaveType = await tx.leaveType.create({
      data: createData,
    });

    // 2. Find all active employees in that company
    const employees = await tx.employee.findMany({
      where: {
        user: {
          companyId: companyId,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    // 3. Create a leave balance record for each active employee
    if (employees.length > 0) {
      await tx.employeeLeaveBalance.createMany({
        data: employees.map((employee: { id: number }) => ({
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          accrued: 0,
          used: 0,
          carriedForward: 0,
        })),
      });
    }

    return leaveType;
  });
};

export const updateLeaveType = async (
  leaveTypeId: number,
  companyId: number,
  data: {
    name?: string;
    default_balance?: number;
    requires_anniversary?: boolean;
  }
) => {
  const existing = await prisma.leaveType.findFirst({
    where: {
      id: leaveTypeId,
      companyId,
    },
  });

  if (!existing) {
    throw new HttpError('Leave type not found', 404);
  }

  return await prisma.leaveType.update({
    where: { id: leaveTypeId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.default_balance !== undefined ? { defaultBalance: data.default_balance } : {}),
      ...(data.requires_anniversary !== undefined
        ? { requiresAnniversary: data.requires_anniversary }
        : {}),
    },
  });
};

export const deleteLeaveType = async (leaveTypeId: number, companyId: number) => {
  const existing = await prisma.leaveType.findFirst({
    where: {
      id: leaveTypeId,
      companyId,
    },
  });

  if (!existing) {
    throw new HttpError('Leave type not found', 404);
  }

  const requestCount = await prisma.leaveRequest.count({
    where: {
      leaveTypeId,
      leave_type: {
        companyId,
      },
    },
  });

  if (requestCount > 0) {
    throw new HttpError(
      'Cannot delete leave type because leave requests already exist for it',
      400
    );
  }

  // Cascades will clean up balances + balance transactions (see Prisma schema).
  return await prisma.leaveType.delete({ where: { id: leaveTypeId } });
};

export const getEmployeeLeaveBalances = async (employeeId: number) => {
  return await prisma.$transaction(async (tx: TxClient) => {
    const leaveTypes = await initializeLeaveBalancesForEmployee(employeeId, tx);

    const synchronizedBalances = (await Promise.all(
      leaveTypes.map(async (leaveType: LeaveType) => {
        await syncLeaveBalance(employeeId, leaveType.id, tx, new Date());
        return await tx.employeeLeaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId: {
              employeeId,
              leaveTypeId: leaveType.id,
            },
          },
          include: {
            leaveType: true,
          },
        });
      })
    )) as (BalanceWithLeaveType | null)[];

    const filteredBalances = synchronizedBalances.filter(
      (balance: BalanceWithLeaveType | null): balance is BalanceWithLeaveType => balance !== null
    );

    return filteredBalances.map((balance: BalanceWithLeaveType) => ({
      leaveTypeId: balance.leaveTypeId,
      leaveTypeName: balance.leaveType.name,
      accrued: toNumber(balance.accrued),
      used: toNumber(balance.used),
      carriedForward: toNumber(balance.carriedForward),
      available: computeAvailabilityWithCap(balance, balance.leaveType),
      requiresAnniversary: balance.leaveType.requiresAnniversary,
    }));
  });
};

export const applyForLeave = async (userId: number, leaveRequestData: ApplyForLeaveData, companyId: number) => {
  const { leaveTypeId, start_date, end_date } = leaveRequestData;
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new BadRequestError('Invalid leave dates');
  }

  // Validate start date is not in the past
  const today = normalizeDate(new Date());
  const normalizedStartDate = normalizeDate(startDate);
  if (normalizedStartDate < today) {
    throw new BadRequestError('Start date cannot be in the past. Please choose a valid date.');
  }

  const requestedDays = calculateLeaveDays(startDate, endDate);

  return await prisma.$transaction(async (tx: TxClient) => {
    const employee = await tx.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const leaveTypeRaw = await tx.leaveType.findFirst({
      where: { id: leaveTypeId, companyId },
    });
    if (!leaveTypeRaw) {
      throw new NotFoundError('Leave type not found');
    }

    const leaveType = await enforceStatutoryLeaveType(leaveTypeRaw, tx);

    // ── Sri Lankan Leave Policy Validations ──────────────────────────────

    // Casual Leave: max 2 consecutive days per request (Shop & Office Act)
    if (leaveType.name === 'Casual Leave' && requestedDays > 2) {
      throw new BadRequestError(
        'Casual Leave is limited to a maximum of 2 consecutive days per request. ' +
        'For longer absences, please use Annual Leave or Medical Leave.'
      );
    }

    // Medical Leave: requests longer than 2 days require a reason/justification
    // (medical certificate should be submitted to HR separately)
    if (leaveType.name === 'Medical Leave' && requestedDays > 2) {
      if (!leaveRequestData.reason || leaveRequestData.reason.trim().length < 5) {
        throw new BadRequestError(
          'Medical Leave requests exceeding 2 days require a reason. ' +
          'Please also submit a medical certificate to HR.'
        );
      }
    }

    // Annual Leave: blocked during probation period (first 365 days)
    if (leaveType.name === 'Annual Leave') {
      const probationEnd = new Date(employee.employmentStartDate);
      probationEnd.setDate(probationEnd.getDate() + 365);
      if (normalizedStartDate < normalizeDate(probationEnd)) {
        throw new BadRequestError(
          'Annual Leave is not available during the probation period (first 12 months of employment). ' +
          `Your probation ends on ${probationEnd.toISOString().split('T')[0]}. Please use Casual Leave instead.`
        );
      }
    }

    // ── End Leave Policy Validations ─────────────────────────────────────

    await initializeLeaveBalancesForEmployee(employee.id, tx);
    const syncedBalance = await syncLeaveBalance(employee.id, leaveTypeId, tx, startDate);
    const available = computeAvailabilityWithCap(
      {
        accrued: syncedBalance.accrued,
        used: syncedBalance.used,
        carriedForward: syncedBalance.carriedForward,
      },
      leaveType
    );

    const overlappingLeaveRequest = await tx.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: {
          in: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        },
        start_date: {
          lte: endDate,
        },
        end_date: {
          gte: startDate,
        },
      },
      select: { id: true },
    });

    if (overlappingLeaveRequest) {
      throw new ConflictError('Overlapping leave request exists for the selected dates. Please choose different dates.');
    }

    if (requestedDays - available > 1e-6) {
      const statutoryCap = STATUTORY_LEAVE_RULES[leaveType.name]?.cap ?? toNumber(leaveType.defaultBalance);
      const displayCap = statutoryCap ?? available;
      throw new BadRequestError(
        `Insufficient leave balance. ${leaveType.name} allows ${displayCap.toFixed(
          1
        )} days per year. You have ${available.toFixed(1)} days available but requested ${requestedDays} days.`
      );
    }

    const leaveRequest = await tx.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        status: LeaveStatus.PENDING,
        totalDays: requestedDays,
      },
      include: {
        leave_type: {
          select: {
            name: true,
          },
        },
      },
    });

    // Queue email notification to be sent after transaction completes
    // Use setImmediate to ensure it runs after the transaction is committed
    setImmediate(async () => {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: 'Leave Request Submitted',
            html: leaveRequestSubmittedTemplate(
              `${employee.first_name} ${employee.last_name}`,
              leaveRequest.leave_type.name,
              startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              requestedDays
            ),
          });
        }
      } catch (err) {
        console.error('Failed to send leave request email:', err);
      }
    });

    return leaveRequest;
  });
};

export const updateLeaveRequestStatus = async (id: number, status: LeaveStatus, companyId: number) => {
  return await prisma.$transaction(async (tx: TxClient) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                companyId: true,
              },
            },
          },
        },
        leave_type: true,
      },
    });

    if (!leaveRequest || leaveRequest.employee.user.companyId !== companyId) {
      // Avoid leaking existence across companies
      throw new HttpError('Leave request not found', 404);
    }

    const currentStatus = leaveRequest.status;
    const daysRequested = leaveRequest.totalDays
      ? toNumber(leaveRequest.totalDays)
      : calculateLeaveDays(leaveRequest.start_date, leaveRequest.end_date);

    if (!leaveRequest.totalDays) {
      await tx.leaveRequest.update({
        where: { id },
        data: { totalDays: daysRequested },
      });
    }

    await initializeLeaveBalancesForEmployee(leaveRequest.employeeId, tx);
    const syncedBalance = await syncLeaveBalance(
      leaveRequest.employeeId,
      leaveRequest.leaveTypeId,
      tx,
      leaveRequest.start_date
    );
    const available = computeAvailabilityWithCap(
      {
        accrued: syncedBalance.accrued,
        used: syncedBalance.used,
        carriedForward: syncedBalance.carriedForward,
      },
      leaveRequest.leave_type
    );

    if (status === LeaveStatus.APPROVED) {
      if (currentStatus === LeaveStatus.APPROVED) {
        return leaveRequest;
      }

      if (daysRequested - available > 1e-6) {
        throw new BadRequestError('Insufficient leave balance');
      }

      const currentUsed = toNumber(syncedBalance.used);
      const updatedBalance = await tx.employeeLeaveBalance.update({
        where: {
          employeeId_leaveTypeId: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
          },
        },
        data: {
          used: currentUsed + daysRequested,
        },
      });

      await tx.leaveBalanceTransaction.create({
        data: {
          leaveBalanceId: updatedBalance.id,
          leaveRequestId: leaveRequest.id,
          change: -daysRequested,
          balanceAfter: computeAvailability({
            accrued: updatedBalance.accrued,
            carriedForward: updatedBalance.carriedForward,
            used: updatedBalance.used,
          }),
          reason: LeaveBalanceReason.USAGE,
          note: `Approved leave request #${leaveRequest.id}`,
        },
      });
    }

    if (status === LeaveStatus.REJECTED && currentStatus === LeaveStatus.APPROVED) {
      const currentUsed = toNumber(syncedBalance.used);
      const updatedBalance = await tx.employeeLeaveBalance.update({
        where: {
          employeeId_leaveTypeId: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
          },
        },
        data: {
          used: Math.max(0, currentUsed - daysRequested),
        },
      });

      await tx.leaveBalanceTransaction.create({
        data: {
          leaveBalanceId: updatedBalance.id,
          leaveRequestId: leaveRequest.id,
          change: daysRequested,
          balanceAfter: computeAvailability({
            accrued: updatedBalance.accrued,
            carriedForward: updatedBalance.carriedForward,
            used: updatedBalance.used,
          }),
          reason: LeaveBalanceReason.REVERSAL,
          note: `Reverted leave request #${leaveRequest.id}`,
        },
      });
    }

    const updated = await tx.leaveRequest.update({
      where: { id },
      data: { status },
      include: {
        employee: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        leave_type: {
          select: {
            name: true,
          },
        },
      },
    });

    // Send email notification for approval/rejection
    // Don't await to avoid blocking
    if (status === LeaveStatus.APPROVED || status === LeaveStatus.REJECTED) {
      const employeeName = `${updated.employee.first_name} ${updated.employee.last_name}`;
      const leaveTypeName = updated.leave_type.name;
      const startDateStr = updated.start_date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const endDateStr = updated.end_date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const employeeEmail = updated.employee.user.email;

      setImmediate(() => {
        if (status === LeaveStatus.APPROVED) {
          sendEmail({
            to: employeeEmail,
            subject: 'Leave Request Approved',
            html: leaveApprovedTemplate(employeeName, leaveTypeName, startDateStr, endDateStr),
          }).catch(err => console.error('Failed to send leave approved email:', err));
        } else if (status === LeaveStatus.REJECTED) {
          sendEmail({
            to: employeeEmail,
            subject: 'Leave Request Not Approved',
            html: leaveRejectedTemplate(employeeName, leaveTypeName, startDateStr, endDateStr),
          }).catch(err => console.error('Failed to send leave rejected email:', err));
        }
      });
    }

    return updated;
  });
};

export const getEmployeeByUserId = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });
  return user?.employee || null;
};

export const getLeaveRequests = async (where: Prisma.LeaveRequestWhereInput, companyId: number) => {
  return await prisma.leaveRequest.findMany({
    where: {
      AND: [
        where,
        {
          employee: {
            user: {
              companyId,
            },
          },
        },
      ],
    },
    include: {
      employee: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
      leave_type: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { id: 'desc' },
  });
};

export const getLeaveRequestById = async (
  id: number,
  companyId: number,
  employeeId?: number
) => {
  return await prisma.leaveRequest.findFirst({
    where: {
      id,
      ...(employeeId ? { employeeId } : {}),
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
      leave_type: {
        select: {
          name: true,
        },
      },
    },
  });
};
