/**
 * Development Seed Data
 * 
 * This file creates realistic Sri Lankan HR data for development and testing.
 * It includes:
 * - 1 company (Simpala Tech Pvt Ltd)
 * - 3 admin/owner users
 * - 20+ employees with varied roles and salaries
 * - 3 leave types (Annual, Casual, Medical per Sri Lankan law)
 * - Historical attendance records (past 3 months)
 * - Sample leave requests
 * - Sample payslips (past 2 months)
 * 
 * Run with: npm run seed
 */

/* eslint-disable no-console */

import dotenv from 'dotenv';
import { PrismaClient, Role, AttendanceStatus, LeaveStatus, Employee } from '@prisma/client';
import bcrypt from 'bcrypt';

// Load environment variables from .env file
dotenv.config();

const prisma = new PrismaClient();

// Helper function to generate dates
const getDateMonthsAgo = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

const getDateDaysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const getDateYearsAgo = (years: number): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
};

// Sri Lankan employee data
const sriLankanFirstNames = [
  'Kasun', 'Nimal', 'Chaminda', 'Ruwan', 'Pradeep',
  'Sanduni', 'Dilini', 'Nethmi', 'Anusha', 'Madhavi',
  'Tharindu', 'Lahiru', 'Dinesh', 'Sachini', 'Kavinda',
  'Ishara', 'Hiruni', 'Thilini', 'Nuwan', 'Supun'
];

const sriLankanLastNames = [
  'Fernando', 'Perera', 'Silva', 'Jayawardena', 'Rajapaksa',
  'Wickramasinghe', 'Bandara', 'Kumara', 'Dissanayake', 'Gunasekara',
  'Amarasinghe', 'Weerasinghe', 'Mendis', 'Rathnayake', 'De Silva'
];

const jobTitles = [
  'Software Engineer',
  'Senior Software Engineer',
  'QA Engineer',
  'DevOps Engineer',
  'UI/UX Designer',
  'Product Manager',
  'Project Manager',
  'Business Analyst',
  'HR Manager',
  'Accountant',
  'Marketing Manager',
  'Sales Executive',
  'Customer Support',
  'Administrative Assistant'
];

type BankMeta = {
  label: string;
  code: string;
  defaultBranch: string;
};

const bankDirectory: Record<string, BankMeta> = {
  'Commercial Bank': {
    label: 'Commercial Bank of Ceylon PLC',
    code: '7056',
    defaultBranch: '001',
  },
  BOC: {
    label: 'Bank of Ceylon',
    code: '7010',
    defaultBranch: '001',
  },
  'Sampath Bank': {
    label: 'Sampath Bank PLC',
    code: '7278',
    defaultBranch: '001',
  },
  HNB: {
    label: 'Hatton National Bank PLC',
    code: '7083',
    defaultBranch: '001',
  },
};

const resolveBankMeta = (key: string): BankMeta => {
  return bankDirectory[key] ?? {
    label: key,
    code: '0000',
    defaultBranch: '000',
  };
};

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.payslip.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Create company
  console.log('🏢 Creating company...');
  const company = await prisma.company.create({
    data: {
      name: 'Simpala Tech Pvt Ltd',
      address: '123 Galle Road, Colombo 03, Sri Lanka',
    },
  });
  console.log(`✅ Created company: ${company.name}`);

  // Create admin users
  console.log('👤 Creating admin users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@simpala.lk',
      password_hash: hashedPassword,
      role: Role.OWNER,
      companyId: company.id,
    },
  });
  console.log(`✅ Created owner: ${ownerUser.email}`);

  const ownerAccountNumber = '1234567890';
  const ownerBank = resolveBankMeta('Commercial Bank');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@simpala.lk',
      password_hash: hashedPassword,
      role: Role.ADMIN,
      companyId: company.id,
    },
  });
  console.log(`✅ Created admin: ${adminUser.email}`);

  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@simpala.lk',
      password_hash: hashedPassword,
      role: Role.ADMIN,
      companyId: company.id,
    },
  });
  console.log(`✅ Created HR admin: ${hrUser.email}`);

  // Create employee profiles for admin users
  const adminAccountNumber = '2345678901';
  const adminBank = resolveBankMeta('BOC');
  const hrAccountNumber = '3456789012';
  const hrBank = resolveBankMeta('Sampath Bank');

  await prisma.employee.create({
    data: {
      userId: ownerUser.id,
      first_name: 'Ranil',
      last_name: 'Wickremesinghe',
      nic: '197012345678',
      job_title: 'Chief Executive Officer',
      salary: 500000,
      bank_details: `${ownerBank.label} - ${ownerAccountNumber}`,
      bank_name: ownerBank.label,
      bank_code: ownerBank.code,
      branch_code: ownerBank.defaultBranch,
      account_number: ownerAccountNumber,
      date_of_birth: new Date('1970-03-15'),
      phone_number: '+94771234567',
      address: '45 Ward Place, Colombo 07',
      employmentStartDate: getDateYearsAgo(5),
    },
  });

  await prisma.employee.create({
    data: {
      userId: adminUser.id,
      first_name: 'Sunil',
      last_name: 'Perera',
      nic: '198523456789',
      job_title: 'Operations Manager',
      salary: 350000,
      bank_details: `${adminBank.label} - ${adminAccountNumber}`,
      bank_name: adminBank.label,
      bank_code: adminBank.code,
      branch_code: adminBank.defaultBranch,
      account_number: adminAccountNumber,
      date_of_birth: new Date('1985-07-20'),
      phone_number: '+94772345678',
      address: '78 Duplication Road, Colombo 04',
      employmentStartDate: getDateYearsAgo(4),
    },
  });

  await prisma.employee.create({
    data: {
      userId: hrUser.id,
      first_name: 'Nilmini',
      last_name: 'Fernando',
      nic: '199034567890',
      job_title: 'HR Manager',
      salary: 280000,
      bank_details: `${hrBank.label} - ${hrAccountNumber}`,
      bank_name: hrBank.label,
      bank_code: hrBank.code,
      branch_code: hrBank.defaultBranch,
      account_number: hrAccountNumber,
      date_of_birth: new Date('1990-11-10'),
      phone_number: '+94773456789',
      address: '12 Bauddhaloka Mawatha, Colombo 05',
      employmentStartDate: getDateYearsAgo(3),
    },
  });

  console.log('✅ Created employee profiles for admin users');

  // Create deterministic E2E test employee (john.doe) with distinct password
  console.log('👤 Creating E2E test employee john.doe@simpala.lk ...');
  const e2eEmployeePassword = await bcrypt.hash('Employee123!', 10);
  const e2eUser = await prisma.user.create({
    data: {
      email: 'john.doe@simpala.lk',
      password_hash: e2eEmployeePassword,
      // Use literal to avoid enum dependency if Role not exported in current client
      role: 'EMPLOYEE' as any,
      companyId: company.id,
    },
  });

  const e2eEmployee = await prisma.employee.create({
    data: {
      userId: e2eUser.id,
      first_name: 'John',
      last_name: 'Doe',
      nic: '199012345678',
      job_title: 'Software Engineer',
      salary: 150000,
      bank_details: 'Bank of Ceylon - 0123456789',
      bank_name: 'Bank of Ceylon',
      bank_code: '7010',
      branch_code: '001',
      account_number: '0123456789',
      date_of_birth: new Date('1990-01-01'),
      phone_number: '+94771234567',
      address: '123 Main Street, Colombo 03',
      employmentStartDate: new Date('2024-01-01'),
    },
  });
  console.log(`✅ Created E2E employee user: ${e2eUser.email} (employeeId=${e2eEmployee.id})`);

  // Create regular employees
  console.log('👥 Creating regular employees...');
  const employees: Employee[] = [];
  const bankKeys = ['Commercial Bank', 'BOC', 'Sampath Bank', 'HNB'];

  for (let i = 0; i < 20; i++) {
    const firstName = sriLankanFirstNames[i % sriLankanFirstNames.length];
    const lastName = sriLankanLastNames[i % sriLankanLastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@simpala.lk`;

    // Generate realistic NIC (format: YYYYMMDDXXXXX or XXXXXXXXXV)
    const birthYear = 1985 + (i % 10);
    const nic = birthYear < 2000
      ? `${birthYear.toString().slice(-2)}${String(100 + i).padStart(3, '0')}${String(1234567 + i).padStart(7, '0')}`
      : `${birthYear}${String(100 + i).padStart(3, '0')}${String(123456 + i).padStart(6, '0')}`;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        role: Role.EMPLOYEE,
        companyId: company.id,
      },
    });

    // Create employee
    const jobTitle = jobTitles[i % jobTitles.length];
    const baseSalary = jobTitle.includes('Senior') ? 150000 :
      jobTitle.includes('Manager') ? 200000 :
        jobTitle.includes('Engineer') ? 120000 : 80000;

    const salary = baseSalary + (Math.random() * 50000);

    const bankKey = bankKeys[i % bankKeys.length];
    const bankMeta = resolveBankMeta(bankKey);
    const accountNumber = (1000000000 + i).toString();
    const branchBase = parseInt(bankMeta.defaultBranch, 10);
    const branchCode = Number.isNaN(branchBase)
      ? bankMeta.defaultBranch
      : (branchBase + (i % 20)).toString().padStart(3, '0');
    const bankDetails = `${bankMeta.label} - ${accountNumber}`;

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        first_name: firstName,
        last_name: lastName,
        nic,
        job_title: jobTitle,
        salary: Math.round(salary),
        bank_details: bankDetails,
        bank_name: bankMeta.label,
        bank_code: bankMeta.code,
        branch_code: branchCode,
        account_number: accountNumber,
        date_of_birth: new Date(birthYear, (i % 12), (i % 28) + 1),
        phone_number: `+9477${String(1000000 + i).slice(0, 7)}`,
        address: `${i + 1} ${['Galle Road', 'Duplication Road', 'Baseline Road', 'High Level Road'][i % 4]}, Colombo`,
        employmentStartDate: getDateMonthsAgo(6 + i),
      },
    });

    employees.push(employee);
  }
  console.log(`✅ Created ${employees.length} regular employees`);

  // Create leave types (Sri Lankan labor law)
  console.log('🏖️ Creating leave types...');
  const annualLeave = await prisma.leaveType.create({
    data: {
      companyId: company.id,
      name: 'Annual Leave',
      defaultBalance: 14, // Sri Lankan law: 14 days after 1 year
    },
  });

  const casualLeave = await prisma.leaveType.create({
    data: {
      companyId: company.id,
      name: 'Casual Leave',
      defaultBalance: 7,
    },
  });

  const medicalLeave = await prisma.leaveType.create({
    data: {
      companyId: company.id,
      name: 'Medical Leave',
      defaultBalance: 7,
    },
  });
  console.log('✅ Created 3 leave types');

  // Initialize leave balances for all employees
  console.log('📊 Initializing leave balances...');
  const allEmployeesForBalances = await prisma.employee.findMany({ select: { id: true } });
  const leaveTypes = [annualLeave, casualLeave, medicalLeave];

  for (const employee of allEmployeesForBalances) {
    await Promise.all(
      leaveTypes.map((leaveType) =>
        prisma.employeeLeaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
          },
        }),
      ),
    );
  }
  console.log(`✅ Initialized leave balances for ${allEmployeesForBalances.length} employees`);

  // Create attendance records for past 3 months
  console.log('📅 Creating attendance records...');
  let attendanceCount = 0;
  const today = new Date();
  const threeMonthsAgo = getDateMonthsAgo(3);

  for (const employee of employees) {
    const currentDate = new Date(threeMonthsAgo);

    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();

      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // 95% present, 5% absent
        const status = Math.random() > 0.05 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;

        await prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            date: new Date(currentDate),
            status,
          },
        });
        attendanceCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  console.log(`✅ Created ${attendanceCount} attendance records`);

  // Create leave requests
  console.log('📝 Creating leave requests...');
  const leaveStatuses = [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED];

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];

    // Each employee has 1-3 leave requests
    const numRequests = 1 + (i % 3);

    for (let j = 0; j < numRequests; j++) {
      const daysAgo = 10 + (i * 5) + (j * 10);
      const startDate = getDateDaysAgo(daysAgo);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (2 + (j % 3))); // 2-4 days leave

      const leaveType = [annualLeave, casualLeave, medicalLeave][j % 3];
      const status = leaveStatuses[j % 3];

      await prisma.leaveRequest.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          start_date: startDate,
          end_date: endDate,
          status,
        },
      });
    }
  }
  console.log(`✅ Created leave requests`);

  // Create payslips for past 2 months + November 2025 (for testing bank files)
  console.log('💰 Creating payslips...');
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // We'll create payslips for past 2 months PLUS November 2025
  const payslipMonths = [
    { month: currentMonth - 2 < 1 ? currentMonth - 2 + 12 : currentMonth - 2, year: currentMonth - 2 < 1 ? currentYear - 1 : currentYear },
    { month: currentMonth - 1 < 1 ? currentMonth - 1 + 12 : currentMonth - 1, year: currentMonth - 1 < 1 ? currentYear - 1 : currentYear },
    { month: 11, year: 2025 }, // November 2025 for bank file testing
  ];

  for (const employee of employees) {
    for (const { month, year } of payslipMonths) {
      const grossPay = Number(employee.salary);
      const epfEmployee = grossPay * 0.08; // 8% employee contribution
      const epfEmployer = grossPay * 0.12; // 12% employer contribution
      const etf = grossPay * 0.03; // 3% ETF

      // Simple PAYE calculation (Sri Lankan tax slabs - simplified)
      let paye = 0;
      const annualSalary = grossPay * 12;
      if (annualSalary > 3000000) {
        paye = (grossPay * 0.24); // 24% for high earners (simplified)
      } else if (annualSalary > 1500000) {
        paye = (grossPay * 0.18); // 18% for mid earners
      } else if (annualSalary > 600000) {
        paye = (grossPay * 0.06); // 6% for low-mid earners
      }

      const netPay = grossPay - epfEmployee - paye;

      await prisma.payslip.create({
        data: {
          employeeId: employee.id,
          month,
          year,
          gross_pay: grossPay,
          epf_employee: epfEmployee,
          epf_employer: epfEmployer,
          etf,
          paye,
          net_pay: netPay,
        },
      });
    }
  }
  console.log(`✅ Created payslips for ${employees.length} employees (${payslipMonths.length} months including Nov 2025)`);

  console.log('\n✨ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - 1 company: ${company.name}`);
  console.log(`   - 3 admin users (owner, admin, hr)`);
  console.log(`   - 1 E2E test employee (john.doe@simpala.lk)`);
  console.log(`   - ${employees.length} regular employees`);
  console.log(`   - 3 leave types`);
  console.log(`   - ${attendanceCount} attendance records (3 months)`);
  console.log(`   - Multiple leave requests`);
  console.log(`   - ${employees.length * 2} payslips (2 months)`);
  console.log('\n🔐 Login credentials:');
  console.log('   Owner:    owner@simpala.lk / password123');
  console.log('   Admin:    admin@simpala.lk / password123');
  console.log('   HR:       hr@simpala.lk / password123');
  console.log('   Employee: kasun.fernando0@simpala.lk / password123');
  console.log('   E2E Employee: john.doe@simpala.lk / Employee123!');
  console.log('   (All users have password: password123)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
