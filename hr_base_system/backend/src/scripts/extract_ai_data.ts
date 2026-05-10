import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Data Extraction for AI Training...');

  const employees = await prisma.employee.findMany({
    include: {
      attendance: true,
      leave_requests: {
        where: { status: 'APPROVED' },
      },
      payslips: true,
    },
  });

  if (employees.length === 0) {
    console.log('⚠️ No employee records found in the database.');
    return;
  }

  const csvRows: string[] = [];
  
  // Define Header (Aligning with IBM and NexusHR Research Goals)
  const header = [
    'EmployeeId', // For tracking but anonymized in final CSV
    'Age',
    'Gender',
    'JobTitle',
    'Department',
    'MonthlyIncome',
    'TotalAllowances',
    'TenureMonths',
    'Attendance_LateCount',
    'Attendance_AbsentCount',
    'Attendance_HalfDayCount',
    'Leave_TotalDaysApproved',
    'Leave_RequestCount',
    'EmploymentStatus',
    'Attrition' // Target Variable (Based on employmentStatus)
  ];
  
  csvRows.push(header.join(','));

  const currentDate = new Date();

  for (const emp of employees) {
    // 1. Calculate Age
    let age = 0;
    if (emp.date_of_birth) {
      age = currentDate.getFullYear() - new Date(emp.date_of_birth).getFullYear();
    }

    // 2. Calculate Tenure in Months
    const startDate = new Date(emp.employmentStartDate);
    const tenureMonths = 
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
      (currentDate.getMonth() - startDate.getMonth());

    // 3. Aggregate Attendance
    const lateCount = emp.attendance.filter(a => a.status === 'LATE').length;
    const absentCount = emp.attendance.filter(a => a.status === 'ABSENT').length;
    const halfDayCount = emp.attendance.filter(a => a.status === 'HALF_DAY').length;

    // 4. Aggregate Leaves
    const totalLeaveDays = emp.leave_requests.reduce((sum, req) => sum + Number(req.totalDays || 0), 0);
    const leaveRequestCount = emp.leave_requests.length;

    // 5. Financials
    const monthlyIncome = Number(emp.salary || 0);
    const totalAllowances = Number(emp.allowances || 0);

    // 6. Attrition (Target)
    // In our research, 'RESIGNED' or 'TERMINATED' counts as Attrition = Yes
    const attrition = (emp.employmentStatus === 'RESIGNED' || emp.employmentStatus === 'TERMINATED') ? 'Yes' : 'No';

    const row = [
      emp.id,
      age,
      emp.gender || 'Unknown',
      `"${emp.job_title}"`,
      `"${emp.department || 'General'}"`,
      monthlyIncome,
      totalAllowances,
      tenureMonths,
      lateCount,
      absentCount,
      halfDayCount,
      totalLeaveDays,
      leaveRequestCount,
      emp.employmentStatus,
      attrition
    ];

    csvRows.push(row.join(','));
  }

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '../../../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, 'local_hr_data.csv');
  fs.writeFileSync(outputPath, csvRows.join('\n'));

  console.log(`✅ Successfully extracted ${employees.length} records to ${outputPath}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during extraction:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
