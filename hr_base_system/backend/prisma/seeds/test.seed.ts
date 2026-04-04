/**
 * Test Seed Data
 * 
 * This file creates minimal data for quick testing.
 * It includes:
 * - 1 company
 * - 1 admin user
 * - 3 employees
 * - 3 leave types
 * 
 * Run with: npm run seed:test
 */

/* eslint-disable no-console */

import dotenv from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

// Load environment variables from .env file
dotenv.config();

const prisma = new PrismaClient();

const getDateYearsAgo = (years: number): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
};

async function main() {
  console.log('🌱 Starting test database seeding...');

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
  const company = await prisma.company.create({
    data: {
      name: 'Test Company',
      address: 'Test Address, Colombo',
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password_hash: hashedPassword,
      role: Role.ADMIN,
      companyId: company.id,
    },
  });

  // Create admin employee profile
  await prisma.employee.create({
    data: {
      userId: adminUser.id,
      first_name: 'Test',
      last_name: 'Admin',
      nic: '199012345678',
      job_title: 'Administrator',
      salary: 100000,
      bank_details: 'Test Bank PLC - 1234567890',
      bank_name: 'Test Bank PLC',
      bank_code: '8999',
      branch_code: '001',
      account_number: '1234567890',
      date_of_birth: new Date('1990-01-01'),
      phone_number: '+94771234567',
      address: 'Test Address',
      employmentStartDate: getDateYearsAgo(2),
    },
  });

  // Create test employees
  const employees = [
    { firstName: 'Alice', lastName: 'Silva', jobTitle: 'Software Engineer', salary: 120000 },
    { firstName: 'Bob', lastName: 'Perera', jobTitle: 'QA Engineer', salary: 100000 },
    { firstName: 'Charlie', lastName: 'Fernando', jobTitle: 'DevOps Engineer', salary: 110000 },
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const user = await prisma.user.create({
      data: {
        email: `${emp.firstName.toLowerCase()}@test.com`,
        password_hash: hashedPassword,
        role: Role.EMPLOYEE,
        companyId: company.id,
      },
    });

    await prisma.employee.create({
      data: {
        userId: user.id,
        first_name: emp.firstName,
        last_name: emp.lastName,
        nic: `199${i}123456${i}${i}`,
        job_title: emp.jobTitle,
        salary: emp.salary,
        bank_details: `Test Bank PLC - ${1000000 + i}`,
        bank_name: 'Test Bank PLC',
        bank_code: '8999',
        branch_code: `00${i + 2}`.slice(-3),
        account_number: `${1000000 + i}`,
        date_of_birth: new Date(1990 + i, i, 15),
        phone_number: `+9477100000${i}`,
        address: `${i + 1} Test Street, Colombo`,
        employmentStartDate: getDateYearsAgo(1 + i),
      },
    });
  }

  // Create leave types
  await prisma.leaveType.createMany({
    data: [
      { companyId: company.id, name: 'Annual Leave', default_balance: 14 },
      { companyId: company.id, name: 'Casual Leave', default_balance: 7 },
      { companyId: company.id, name: 'Medical Leave', default_balance: 7 },
    ],
  });

  const createdLeaveTypes = await prisma.leaveType.findMany({ where: { companyId: company.id } });
  const employeeRecords = await prisma.employee.findMany({ select: { id: true } });

  for (const employee of employeeRecords) {
    await Promise.all(
      createdLeaveTypes.map((leaveType) =>
        prisma.employeeLeaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
          },
        }),
      ),
    );
  }

  console.log('\n✨ Test database seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`   - 1 company: ${company.name}`);
  console.log(`   - 1 admin user`);
  console.log(`   - 3 employees`);
  console.log(`   - 3 leave types`);
  console.log('\n🔐 Login credentials:');
  console.log('   Admin:     admin@test.com / password123');
  console.log('   Employee:  alice@test.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
