import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '../prismaClient';
import { HttpError } from '../middleware/error.middleware';
import logger from '../utils/logger';

type BankFileType = 'CIPS' | 'SLIPS';

type PayslipWithEmployee = {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  gross_pay: Prisma.Decimal;
  epf_employee: Prisma.Decimal;
  epf_employer: Prisma.Decimal;
  etf: Prisma.Decimal;
  paye: Prisma.Decimal;
  net_pay: Prisma.Decimal;
  employee: {
    first_name: string;
    last_name: string;
    nic: string | null;
    bank_name: string | null;
    bank_code: string | null;
    branch_code: string | null;
    account_number: string | null;
  };
};

type GenerateBankFileParams = {
  userId: number;
  month: number;
  year: number;
  fileType: BankFileType;
  bankCodes?: string[];
  narration?: string;
};

type CompanyContext = {
  id: number;
  name: string;
};

type CsvRowBuilder = (params: {
  index: number;
  payslip: PayslipWithEmployee;
  company: CompanyContext;
  narration: string;
}) => string[];

type CsvFormatter = {
  header: string[];
  buildRow: CsvRowBuilder;
};

const formatAmount = (amount: Prisma.Decimal): string => {
  // Decimal.js has toFixed method
  return (amount as Prisma.Decimal & { toFixed(digits: number): string }).toFixed(2);
};

const csvFormatters: Record<BankFileType, CsvFormatter> = {
  CIPS: {
    header: [
      'Sequence',
      'BankCode',
      'BranchCode',
      'AccountNumber',
      'AccountName',
      'Amount',
      'Currency',
      'Narrative',
      'Reference',
    ],
    buildRow: ({ index, payslip, company, narration }) => {
      const accountName = `${payslip.employee.first_name} ${payslip.employee.last_name}`.trim();
      const accountNumber = (payslip.employee.account_number ?? '').replace(/\s+/g, '');
      return [
        String(index + 1),
        payslip.employee.bank_code ?? '',
        payslip.employee.branch_code ?? '',
        accountNumber,
        accountName,
        formatAmount(payslip.net_pay),
        'LKR',
        narration,
        `${company.name}-${String(index + 1).padStart(4, '0')}`,
      ];
    },
  },
  SLIPS: {
    header: [
      'Sequence',
      'BankCode',
      'BranchCode',
      'AccountNumber',
      'AccountName',
      'Amount',
      'Narrative',
      'NIC',
    ],
    buildRow: ({ index, payslip, narration }) => {
      const accountName = `${payslip.employee.first_name} ${payslip.employee.last_name}`.trim();
      const accountNumber = (payslip.employee.account_number ?? '').replace(/\s+/g, '');
      return [
        String(index + 1),
        payslip.employee.bank_code ?? '',
        payslip.employee.branch_code ?? '',
        accountNumber,
        accountName,
        formatAmount(payslip.net_pay),
        narration,
        payslip.employee.nic ?? '',
      ];
    },
  },
};

const sanitizeFilename = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(?:^-+)|(?:-+$)/g, '')
    .slice(0, 60);

const wrapCsvField = (value: string): string => {
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
  if (!needsQuotes) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
};

const buildCsv = (
  formatter: CsvFormatter,
  records: PayslipWithEmployee[],
  company: CompanyContext,
  narration: string
): string => {
  const header = formatter.header.join(',');
  const rows = records.map((payslip, index) =>
    formatter
      .buildRow({ index, payslip, company, narration })
      .map((field) => wrapCsvField(field))
      .join(',')
  );

  // Use CRLF (\r\n) for Windows/Bank compatibility per CSV RFC 4180
  return [header, ...rows].join('\r\n');
};

const ensureCompanyContext = async (userId: number): Promise<CompanyContext> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user || !user.company) {
    throw new HttpError('User is not associated with a company', 403);
  }

  return { id: user.company.id, name: user.company.name };
};

const fetchPayslips = async (
  companyId: number,
  month: number,
  year: number
): Promise<PayslipWithEmployee[]> => {
  const payslips = await prisma.payslip.findMany({
    where: {
      month,
      year,
      employee: {
        user: {
          companyId,
        },
        isActive: true,
      },
    },
    include: {
      employee: {
        select: {
          first_name: true,
          last_name: true,
          nic: true,
          bank_name: true,
          bank_code: true,
          branch_code: true,
          account_number: true,
        },
      },
    },
    orderBy: {
      employeeId: 'asc',
    },
  });

  return payslips as PayslipWithEmployee[];
};

const validateBankMetadata = (records: PayslipWithEmployee[]) => {
  const missing = records.filter(
    (record) =>
      !record.employee.bank_code ||
      !record.employee.branch_code ||
      !record.employee.account_number ||
      !record.employee.bank_name
  );

  if (missing.length > 0) {
    const details = missing.map((record) => record.employeeId).join(', ');
    throw new HttpError(
      `Missing bank metadata for employees: ${details}. Please update bank_code, branch_code, bank_name, and account_number.`,
      422
    );
  }

  const invalid: Array<{ employeeId: number; issues: string[] }> = [];

  for (const record of records) {
    const issues: string[] = [];
    const bankCode = record.employee.bank_code?.trim() ?? '';
    const branchCode = record.employee.branch_code?.trim() ?? '';
    const accountNumber = (record.employee.account_number ?? '').replace(/\s+/g, '');

    if (!/^\d{4}$/.test(bankCode)) {
      issues.push('bank_code');
    }

    if (!/^\d{3}$/.test(branchCode)) {
      issues.push('branch_code');
    }

    if (!/^\d{6,20}$/.test(accountNumber)) {
      issues.push('account_number');
    }

    if (issues.length > 0) {
      invalid.push({ employeeId: record.employeeId, issues });
    }
  }

  if (invalid.length > 0) {
    const details = invalid
      .map((item) => `${item.employeeId}(${item.issues.join('|')})`)
      .join(', ');
    throw new HttpError(
      `Invalid bank metadata for employees: ${details}. Expected bank_code=4 digits, branch_code=3 digits, account_number=6-20 digits.`,
      422
    );
  }
};

const filterByBankCodes = (records: PayslipWithEmployee[], bankCodes?: string[]) => {
  if (!bankCodes || bankCodes.length === 0) {
    return records;
  }

  const normalized = bankCodes.map((code) => code.trim());
  const filtered = records.filter((record) =>
    record.employee.bank_code ? normalized.includes(record.employee.bank_code) : false
  );

  if (filtered.length === 0) {
    throw new HttpError('No payslips match the provided bank codes', 404);
  }

  return filtered;
};

const determineStoredBankCode = (records: PayslipWithEmployee[]): string => {
  const uniqueCodes = Array.from(
    new Set(records.map((record) => record.employee.bank_code ?? '').filter(Boolean))
  );

  if (uniqueCodes.length === 1) {
    return uniqueCodes[0];
  }

  return 'MULTI';
};

export const generateBankFile = async ({
  userId,
  month,
  year,
  fileType,
  bankCodes,
  narration,
}: GenerateBankFileParams) => {
  try {
    logger.info('Starting bank file generation', { userId, month, year, fileType });

    const company = await ensureCompanyContext(userId);
    logger.info('Company context retrieved', { companyId: company.id });

    const payslips = await fetchPayslips(company.id, month, year);
    logger.info('Payslips fetched', { count: payslips.length });

    if (payslips.length === 0) {
      throw new HttpError(`No payslips found for ${month}/${year}`, 404);
    }

    const filtered = filterByBankCodes(payslips, bankCodes);
    logger.info('Payslips filtered', { count: filtered.length });

    validateBankMetadata(filtered);
    logger.info('Bank metadata validated');

    const formatter = csvFormatters[fileType];
    const effectiveNarration =
      narration?.trim() || `Salary Payment ${String(month).padStart(2, '0')}/${year}`;
    const csvContent = buildCsv(formatter, filtered, company, effectiveNarration);
    logger.info('CSV content built');

    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    const companySlug = sanitizeFilename(company.name) || 'company';
    const fileName = `${fileType}_${companySlug}_${year}_${String(month).padStart(2, '0')}_${timestamp}.csv`;

    // Calculate total amount and determine bank code
    const totalAmount = filtered.reduce(
      (sum, p) => sum.add(p.net_pay),
      new Prisma.Decimal(0)
    );
    const storedBankCode = determineStoredBankCode(filtered);

    // Create checksum for file integrity
    const csvBuffer = Buffer.from(csvContent, 'utf-8');
    const checksum = createHash('sha256').update(csvBuffer).digest('hex');

    // Create the export record in the database
    const exportRecord = await prisma.bankFileExport.create({
      data: {
        companyId: company.id,
        bankCode: storedBankCode,
        fileType,
        month,
        year,
        totalRecords: filtered.length,
        totalAmount,
        generatedBy: userId,
        checksum,
        fileName,
      },
    });

    logger.info('Bank file export record created', { exportId: exportRecord.id, fileName });

    return {
      fileName,
      csvBuffer,
      exportRecord,
    };
  } catch (error) {
    logger.error('Error in generateBankFile:', { error: error instanceof Error ? error.message : error });
    if (error instanceof Error) {
      logger.error('Stack trace:', { stack: error.stack });
    }
    throw error;
  }
};
