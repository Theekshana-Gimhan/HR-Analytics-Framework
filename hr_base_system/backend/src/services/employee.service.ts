import { Prisma, EmploymentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { initializeLeaveBalancesForEmployee } from './leave.service';
import { prisma } from '../prismaClient';
import { NotFoundError } from '../middleware/error.middleware';

export const getAllEmployees = async (companyId: number) => {
  return await prisma.employee.findMany({
    where: { isActive: true, user: { companyId } },
    orderBy: { id: 'asc' },
  });
};

type CreateEmployeeData = {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  nic: string;
  job_title: string;
  salary?: number;
  basic_salary?: number;
  bank_details?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  account_holder_name?: string;
  date_of_birth?: string;
  phone_number?: string;
  phone?: string;
  address?: string;
  employment_start_date?: string;
  join_date?: string;
  gender?: string;
  department?: string;
  allowances?: number;
  employment_status?: EmploymentStatus;
};

export const createEmployee = async (employeeData: CreateEmployeeData, companyId: number) => {
  const {
    email,
    password,
    date_of_birth,
    phone_number,
    phone,
    address,
    employment_start_date,
    join_date,
    salary,
    basic_salary,
    bank_details,
    bank_name,
    bank_branch,
    account_number,
    account_holder_name,
    gender,
    department,
    allowances,
    ...employeeInfo
  } = employeeData;

  // Auto-generate password if not provided
  const actualPassword = password || `Simpala${Math.random().toString(36).slice(-8)}!`;
  const hashedPassword = await bcrypt.hash(actualPassword, 10);

  // Use basic_salary if salary not provided
  const finalSalary = salary || basic_salary || 0;

  // Construct bank_details from individual fields if not provided
  const finalBankDetails = bank_details ||
    [bank_name, bank_branch, account_number, account_holder_name]
      .filter(Boolean)
      .join(' | ') ||
    'Not provided';

  // Use phone if phone_number not provided
  const finalPhoneNumber = phone_number || phone;

  // Use join_date if employment_start_date not provided
  const finalStartDate = employment_start_date || join_date;

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: hashedPassword,
      role: 'EMPLOYEE',
      company: {
        connect: { id: companyId },
      },
    },
  });

  const employee = await prisma.employee.create({
    data: {
      ...employeeInfo,
      salary: finalSalary,
      bank_details: finalBankDetails,
      gender,
      department,
      allowances: allowances !== undefined ? new Prisma.Decimal(allowances) : null,
      isActive: true,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
      phone_number: finalPhoneNumber,
      address,
      employmentStartDate: finalStartDate ? new Date(finalStartDate) : new Date(),
      user: {
        connect: { id: user.id },
      },
    },
  });

  await initializeLeaveBalancesForEmployee(employee.id);

  return employee;
};

export const getEmployeeById = async (id: number, companyId: number) => {
  return await prisma.employee.findFirst({
    where: { id, isActive: true, user: { companyId } },
    include: { user: true },
  });
};

export const getEmployeeByUserId = async (userId: number) => {
  return await prisma.employee.findFirst({
    where: { userId, isActive: true },
  });
};

export const updateEmployee = async (id: number, updates: Record<string, unknown>, companyId?: number) => {
  const bankFields = ['bank_name', 'bank_branch', 'account_number', 'account_holder_name'];
  const hasBankFields = bankFields.some(f => updates[f] !== undefined);

  let currentBankInfo = null;
  if (hasBankFields) {
    currentBankInfo = await prisma.employee.findUnique({
      where: { id },
      select: {
        bank_name: true,
        bank_branch: true,
        account_number: true,
        account_holder_name: true
      }
    });
  }

  const data: Prisma.EmployeeUpdateInput = {};

  if (updates.first_name !== undefined) data.first_name = updates.first_name as string;
  if (updates.last_name !== undefined) data.last_name = updates.last_name as string;
  if (updates.job_title !== undefined) data.job_title = updates.job_title as string;
  if (updates.department !== undefined) data.department = updates.department as string | null;
  if (updates.gender !== undefined) data.gender = updates.gender as string | null;
  if (updates.address !== undefined) data.address = updates.address as string | null;

  // Handle salary and basic_salary mapping
  if (updates.salary !== undefined) {
    data.salary = new Prisma.Decimal(updates.salary as number);
  } else if (updates.basic_salary !== undefined) {
    data.salary = new Prisma.Decimal(updates.basic_salary as number);
  }

  if (updates.allowances !== undefined) {
    data.allowances = updates.allowances !== null ? new Prisma.Decimal(updates.allowances as number) : null;
  }

  // Handle phone_number and phone mapping
  if (updates.phone_number !== undefined) {
    data.phone_number = updates.phone_number as string | null;
  } else if (updates.phone !== undefined) {
    data.phone_number = updates.phone as string | null;
  }

  if (updates.date_of_birth !== undefined) {
    data.date_of_birth = updates.date_of_birth ? new Date(updates.date_of_birth as string) : null;
  }

  // Handle employment_start_date and join_date mapping
  if (updates.employment_start_date !== undefined) {
    data.employmentStartDate = new Date(updates.employment_start_date as string);
  } else if (updates.join_date !== undefined) {
    data.employmentStartDate = new Date(updates.join_date as string);
  }

  if (updates.employment_status !== undefined) {
    data.employmentStatus = updates.employment_status as EmploymentStatus;
  }

  if (hasBankFields) {
    const bankName = (updates.bank_name as string) ?? currentBankInfo?.bank_name ?? '';
    const bankBranch = (updates.bank_branch as string) ?? currentBankInfo?.bank_branch ?? '';
    const accountNumber = (updates.account_number as string) ?? currentBankInfo?.account_number ?? '';
    const accountHolderName = (updates.account_holder_name as string) ?? currentBankInfo?.account_holder_name ?? '';

    data.bank_name = bankName || null;
    data.bank_branch = bankBranch || null;
    data.account_number = accountNumber || null;
    data.account_holder_name = accountHolderName || null;

    data.bank_details = [bankName, bankBranch, accountNumber, accountHolderName]
      .filter(Boolean)
      .join(' | ') || 'Not provided';
  }

  // Defense-in-depth: verify employee belongs to company if companyId provided
  if (companyId) {
    const employee = await prisma.employee.findFirst({ where: { id, user: { companyId } } });
    if (!employee) throw new NotFoundError('Employee not found in company');
  }

  return await prisma.employee.update({
    where: { id },
    data,
  });
};

export const deleteEmployee = async (id: number, companyId?: number) => {
  // Defense-in-depth: verify employee belongs to company if companyId provided
  if (companyId) {
    const employee = await prisma.employee.findFirst({ where: { id, user: { companyId } } });
    if (!employee) throw new NotFoundError('Employee not found in company');
  }

  return await prisma.employee.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
};

export const searchEmployees = async (
  query: string | undefined,
  page = 1,
  limit = 20,
  companyId: number
) => {
  const baseWhere: Prisma.EmployeeWhereInput = { isActive: true, user: { companyId } };
  const where: Prisma.EmployeeWhereInput = query
    ? {
      AND: [
        baseWhere,
        {
          OR: [
            { first_name: { contains: query, mode: 'insensitive' } },
            { last_name: { contains: query, mode: 'insensitive' } },
            { nic: { contains: query, mode: 'insensitive' } },
            { job_title: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    }
    : baseWhere;

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'asc' },
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};
