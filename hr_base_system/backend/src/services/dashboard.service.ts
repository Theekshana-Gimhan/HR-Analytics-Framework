import { prisma } from '../prismaClient';


export const dashboardService = {
  async getDashboardStats(companyId: number) {
    // Get total and active employees
    const [totalEmployees, activeEmployees] = await Promise.all([
      prisma.employee.count({
        where: { user: { companyId } },
      }),
      prisma.employee.count({
        where: { isActive: true, user: { companyId } },
      }),
    ]);

    // Get pending leave requests count
    const pendingLeaves = await prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
        leave_type: { companyId },
      },
    });

    // Get upcoming approved leaves (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        leave_type: { companyId },
        start_date: { gte: today, lte: thirtyDaysFromNow },
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            job_title: true,
            user: { select: { email: true } },
          },
        },
        leave_type: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { start_date: 'asc' },
      take: 10,
    });

    return {
      totalEmployees,
      activeEmployees,
      pendingLeaves,
      upcomingLeaves: (upcomingLeaves as any[]).map((leave) => ({
        employee: {
          id: leave.employee.id,
          firstName: leave.employee.first_name,
          lastName: leave.employee.last_name,
          jobTitle: leave.employee.job_title,
          email: leave.employee.user.email,
        },
        leaveType: leave.leave_type,
        startDate: leave.start_date.toISOString(),
        endDate: leave.end_date.toISOString(),
      })),
    };
  },

  async getLiquidityMetrics(companyId: number) {
    // 1. Get all active employees with salary > 0
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        salary: { gt: 0 },
        user: { companyId },
      },
      select: { salary: true },
    });

    if (employees.length === 0) {
      return {
        totalCost: 0,
        breakdown: {
          accruedBasic: 0,
          epfEtf: 0,
        },
      };
    }

    // 2. Calculate Accrued Basic Salary
    // Formula: (Basic Salary / 30) * Days Passed in Month
    const today = new Date();
    const currentDay = today.getDate(); // 1-31
    // const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); // Not used in simple formula: Basic/30 * Days

    let totalAccruedBasic = 0;

    for (const emp of employees) {
      const basic = emp.salary.toNumber();
      // Industry standard practice in SL: prorated using 30 days
      const accrued = (basic / 30) * currentDay;
      totalAccruedBasic += accrued;
    }

    // 3. Calculate Statutory Requirements (EPF 12% + ETF 3% = 15%)
    // Note: EPF/ETF is usually calculated on earnings, but for liquidity projection
    // we use the accrued basic as the base.
    const epfEtf = totalAccruedBasic * 0.15;

    // 4. Total Real-time Cost
    return {
      totalCost: totalAccruedBasic + epfEtf,
      breakdown: {
        accruedBasic: totalAccruedBasic,
        epfEtf: epfEtf,
      },
    };
  },
};
