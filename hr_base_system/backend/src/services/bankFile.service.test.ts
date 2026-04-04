import { Prisma } from '@prisma/client';
import { generateBankFile } from './bankFile.service';
import { prisma } from '../prismaClient';
import { HttpError } from '../middleware/error.middleware';

// Mock prismaClient
jest.mock('../prismaClient', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    payslip: { findMany: jest.fn() },
    bankFileExport: { create: jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePayslip = (
  overrides: Partial<{
    id: number;
    employeeId: number;
    firstName: string;
    lastName: string;
    bankCode: string;
    branchCode: string;
    accountNumber: string;
    netPay: number;
    nic: string;
  }> = {}
) => ({
  id: overrides.id ?? 1,
  employeeId: overrides.employeeId ?? 101,
  month: 6,
  year: 2025,
  gross_pay: new Prisma.Decimal(100000),
  epf_employee: new Prisma.Decimal(8000),
  epf_employer: new Prisma.Decimal(12000),
  etf: new Prisma.Decimal(3000),
  paye: new Prisma.Decimal(0),
  net_pay: new Prisma.Decimal(overrides.netPay ?? 92000),
  employee: {
    first_name: overrides.firstName ?? 'Kamal',
    last_name: overrides.lastName ?? 'Perera',
    nic: overrides.nic ?? '199912345678',
    bank_name: 'BOC',
    bank_code: overrides.bankCode ?? '7278',
    branch_code: overrides.branchCode ?? '100',
    account_number: overrides.accountNumber ?? '1234567890',
  },
});

const setupCompanyUser = () => {
  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
    companyId: 1,
    company: { id: 1, name: 'Test Company' },
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('bankFile.service — generateBankFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupCompanyUser();
  });

  // ---------- Happy-path ----------

  it('generates a CIPS CSV for one payslip', async () => {
    const payslip = makePayslip();
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    expect(result.fileName).toMatch(/^CIPS_test-company_2025_06_.*\.csv$/);
    const csv = result.csvBuffer.toString('utf-8');
    expect(csv).toContain('Sequence,BankCode,BranchCode,AccountNumber,AccountName,Amount,Currency,Narrative,Reference');
    expect(csv).toContain('92000.00');
    expect(csv).toContain('LKR');
    expect(csv).toContain('Kamal Perera');
  });

  it('generates a SLIPS CSV with NIC column', async () => {
    const payslip = makePayslip({ nic: '200012345V' });
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'SLIPS',
    });

    const csv = result.csvBuffer.toString('utf-8');
    expect(csv).toContain('Sequence,BankCode,BranchCode,AccountNumber,AccountName,Amount,Narrative,NIC');
    expect(csv).toContain('200012345V');
  });

  it('filters payslips by bankCodes', async () => {
    const p1 = makePayslip({ id: 1, employeeId: 101, bankCode: '7278' });
    const p2 = makePayslip({ id: 2, employeeId: 102, bankCode: '7010' });
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([p1, p2]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
      bankCodes: ['7278'],
    });

    const csv = result.csvBuffer.toString('utf-8');
    const dataRows = csv.split('\n').filter((line) => !line.startsWith('Sequence'));
    expect(dataRows).toHaveLength(1);
  });

  it('uses custom narration when provided', async () => {
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([makePayslip()]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
      narration: 'June Salary',
    });

    const csv = result.csvBuffer.toString('utf-8');
    expect(csv).toContain('June Salary');
  });

  it('creates a bankFileExport record with sha256 checksum', async () => {
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([makePayslip()]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 42 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    const createCall = (mockPrisma.bankFileExport.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.checksum).toHaveLength(64); // sha256 hex
    expect(createCall.data.totalRecords).toBe(1);
    expect(createCall.data.fileType).toBe('CIPS');
    expect(result.exportRecord.id).toBe(42);
  });

  // ---------- Edge cases ----------

  it('handles multiple employees in CSV ordering', async () => {
    const p1 = makePayslip({ id: 1, employeeId: 101, firstName: 'Arun' });
    const p2 = makePayslip({ id: 2, employeeId: 102, firstName: 'Bimal' });
    const p3 = makePayslip({ id: 3, employeeId: 103, firstName: 'Chaminda' });
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([p1, p2, p3]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    const createCall = (mockPrisma.bankFileExport.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.totalRecords).toBe(3);
    expect(createCall.data.bankCode).toBe('7278'); // all same code
  });

  it('stores MULTI when employees have different bank codes', async () => {
    const p1 = makePayslip({ id: 1, employeeId: 101, bankCode: '7278' });
    const p2 = makePayslip({ id: 2, employeeId: 102, bankCode: '7719' });
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([p1, p2]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    const createCall = (mockPrisma.bankFileExport.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.bankCode).toBe('MULTI');
  });

  // ---------- Error cases ----------

  it('throws 403 when user has no company', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      generateBankFile({ userId: 1, month: 6, year: 2025, fileType: 'CIPS' })
    ).rejects.toThrow(HttpError);
  });

  it('throws 404 when no payslips exist for the period', async () => {
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([]);

    await expect(
      generateBankFile({ userId: 1, month: 6, year: 2025, fileType: 'CIPS' })
    ).rejects.toThrow(/No payslips found/);
  });

  it('throws 404 when bankCode filter produces no results', async () => {
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([makePayslip()]);

    await expect(
      generateBankFile({
        userId: 1,
        month: 6,
        year: 2025,
        fileType: 'CIPS',
        bankCodes: ['9999'],
      })
    ).rejects.toThrow(/No payslips match/);
  });

  it('throws 422 when employee has missing bank metadata', async () => {
    const payslip = makePayslip();
    payslip.employee.bank_code = null;
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);

    await expect(
      generateBankFile({ userId: 1, month: 6, year: 2025, fileType: 'CIPS' })
    ).rejects.toThrow(/Missing bank metadata/);
  });

  it('throws 422 when bank_code format is invalid', async () => {
    const payslip = makePayslip({ bankCode: '12' }); // Not 4 digits
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);

    await expect(
      generateBankFile({ userId: 1, month: 6, year: 2025, fileType: 'CIPS' })
    ).rejects.toThrow(/Invalid bank metadata/);
  });

  it('throws 422 when account_number is too short', async () => {
    const payslip = makePayslip({ accountNumber: '123' }); // < 6 digits
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);

    await expect(
      generateBankFile({ userId: 1, month: 6, year: 2025, fileType: 'CIPS' })
    ).rejects.toThrow(/Invalid bank metadata/);
  });

  it('throws 422 when branch_code format is invalid (not 3 digits)', async () => {
    const payslip = makePayslip({ branchCode: '12' }); // Not 3 digits
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);

    await expect(
      generateBankFile({ userId: 1, month: 6, year: 2025, fileType: 'CIPS' })
    ).rejects.toThrow(/Invalid bank metadata/);
  });

  it('throws 422 when missing bank_name', async () => {
    const payslip = makePayslip();
    payslip.employee.bank_name = null;
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);

    await expect(
      generateBankFile({ userId: 1, month: 6, year: 2025, fileType: 'CIPS' })
    ).rejects.toThrow(/Missing bank metadata/);
  });

  it('uses default narration when none provided', async () => {
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([makePayslip()]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    const csv = result.csvBuffer.toString('utf-8');
    expect(csv).toContain('Salary Payment 06/2025');
  });

  it('handles CSV fields containing commas by quoting them', async () => {
    // Name with comma should be quoted in CSV
    const payslip = makePayslip({ firstName: 'Perera, Jr.' });
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    const csv = result.csvBuffer.toString('utf-8');
    expect(csv).toContain('"Perera, Jr. Perera"');
  });

  it('strips whitespace from account numbers', async () => {
    const payslip = makePayslip({ accountNumber: '1234 5678 90' });
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([payslip]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    const result = await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    const csv = result.csvBuffer.toString('utf-8');
    expect(csv).toContain('1234567890');
  });

  it('calculates correct totalAmount from filtered payslips', async () => {
    const p1 = makePayslip({ id: 1, employeeId: 101, netPay: 50000 });
    const p2 = makePayslip({ id: 2, employeeId: 102, netPay: 75000 });
    (mockPrisma.payslip.findMany as jest.Mock).mockResolvedValue([p1, p2]);
    (mockPrisma.bankFileExport.create as jest.Mock).mockResolvedValue({ id: 1 });

    await generateBankFile({
      userId: 1,
      month: 6,
      year: 2025,
      fileType: 'CIPS',
    });

    const createCall = (mockPrisma.bankFileExport.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.totalAmount.toNumber()).toBe(125000);
  });
});
