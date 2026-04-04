import { PrismaClient, EmployeeDocument, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Separate real and mock clients
const prisma = new PrismaClient();
const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

// Mock implementation helper - we mock the import in test files
// but this export is handy if we want to default it somewhere
// However, jest.mock('../test-helpers', ...) in the test file is tricky if we export both.
// Standard pattern: tests mock '.../prisma-client'
// But here we're mocking `prisma` usage.

// Store the test company ID for cleanup - uses unique prefix to identify test data
const TEST_COMPANY_PREFIX = '__TEST_COMPANY__';
let testCompanyIds: number[] = [];

/**
 * Check if running against cloud database (shared dev environment)
 * Cloud databases should not have all data wiped - only test-specific data
 */
const isCloudDatabase = (): boolean => {
  const dbUrl = process.env.DATABASE_URL || '';
  // Cloud databases typically have remote hosts, not localhost
  return !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');
};

export const setupTestDatabase = async () => {
  if (isCloudDatabase()) {
    // For cloud database: Only clean up previous test data (by test company prefix)
    // Find and delete any orphaned test companies from previous runs
    const testCompanies = await prisma.company.findMany({
      where: { name: { startsWith: TEST_COMPANY_PREFIX } },
      select: { id: true },
    });

    for (const company of testCompanies) {
      await cleanupCompanyData(company.id);
    }
    console.error(`[TEST] Cloud mode: Cleaned up ${testCompanies.length} orphaned test companies`);
  } else {
    // For local database: Full cleanup (original behavior)
    await prisma.refreshToken.deleteMany({});
    await prisma.payslip.deleteMany({});
    await prisma.employeeDocument.deleteMany({});
    await prisma.leaveBalanceTransaction.deleteMany({});
    await prisma.employeeLeaveBalance.deleteMany({});
    await prisma.leaveRequest.deleteMany({});
    await prisma.attendanceRecord.deleteMany({});
    await prisma.leaveType.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
    console.error('[TEST] Local mode: Full database cleanup completed');
  }
};

/**
 * Clean up all data for a specific company (used for test isolation)
 */
const cleanupCompanyData = async (companyId: number) => {
  // Get all users for this company
  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  // Get all employees for these users
  const employees = await prisma.employee.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);

  // Get all leave types for this company
  const leaveTypes = await prisma.leaveType.findMany({
    where: { companyId },
    select: { id: true },
  });
  const leaveTypeIds = leaveTypes.map((lt: { id: number }) => lt.id);

  // Delete in proper dependency order
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.payslip.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.employeeDocument.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.leaveBalanceTransaction.deleteMany({
    where: { leaveBalance: { employeeId: { in: employeeIds } } },
  });
  await prisma.employeeLeaveBalance.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.attendanceRecord.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.leaveType.deleteMany({ where: { id: { in: leaveTypeIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.company.delete({ where: { id: companyId } }).catch(() => {
    // Company may already be deleted
  });
};

export const teardownTestDatabase = async () => {
  // Clean up all test companies created by this run
  if (testCompanyIds.length > 0) {
    const idsToCleanup = [...new Set(testCompanyIds)];
    for (const companyId of idsToCleanup) {
      await cleanupCompanyData(companyId);
      console.error(`[TEST] Cleaned up test company ID: ${companyId}`);
    }
    testCompanyIds = [];
  }

  await prisma.$disconnect();
};

export const createTestCompany = async () => {
  // Use a unique test company name with timestamp to avoid conflicts
  const company = await prisma.company.create({
    data: {
      name: `${TEST_COMPANY_PREFIX}${Date.now()}`,
      address: '123 Test Street',
    },
  });
  testCompanyIds.push(company.id);
  return company;
};

export const createTestUser = async (
  companyId: number,
  role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' = 'ADMIN'
) => {
  const password_hash = await bcrypt.hash('password123', 10);

  return await prisma.user.create({
    data: {
      email: `test${Date.now()}@example.com`,
      password_hash,
      role,
      companyId,
    },
  });
};

export const createTestEmployee = async (
  userId: number,
  overrides: Partial<Prisma.EmployeeUncheckedCreateInput> = {}
) => {
  const employmentStartDate = new Date();
  employmentStartDate.setFullYear(employmentStartDate.getFullYear() - 1);

  const defaultAccountNumber = `10${Math.floor(Math.random() * 90000000 + 10000000)}`;

  const data: Prisma.EmployeeUncheckedCreateInput = {
    userId,
    first_name: 'Test',
    last_name: 'Employee',
    nic: `NIC${Date.now()}`,
    job_title: 'Developer',
    salary: 50000,
    bank_details: 'Test Bank Account',
    bank_name: 'Commercial Bank of Ceylon PLC',
    bank_code: '7056',
    branch_code: '001',
    account_number: defaultAccountNumber,
    employmentStartDate,
    ...overrides,
  };

  return await prisma.employee.create({
    data,
  });
};

export { prisma, prismaMock };

/**
 * Get the current test company ID (for scoped cleanup in tests)
 */
export const getTestCompanyId = (): number | null => (testCompanyIds[0] ?? null);

export const clearEmployeeDocuments = async () => {
  // In cloud mode, only clear documents for test employees
  if (isCloudDatabase() && testCompanyIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { companyId: { in: testCompanyIds } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const employees = await prisma.employee.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const employeeIds = employees.map((e) => e.id);
    await prisma.employeeDocument.deleteMany({ where: { employeeId: { in: employeeIds } } });
  } else {
    await prisma.employeeDocument.deleteMany({});
  }
};

export const findEmployeeDocumentById = async (id: number): Promise<EmployeeDocument | null> => {
  return prisma.employeeDocument.findUnique({ where: { id } });
};
