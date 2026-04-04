-- 20251008040051_add_employee_details
DO $$
BEGIN
  -- use to_regtype to deterministically check for existing types (handles quoted names)
  IF to_regtype('public."Role"') IS NULL THEN
    CREATE TYPE public."Role" AS ENUM ('OWNER','ADMIN','EMPLOYEE');
  END IF;

  IF to_regtype('public."LeaveStatus"') IS NULL THEN
    CREATE TYPE public."LeaveStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
  END IF;

  IF to_regtype('public."AttendanceStatus"') IS NULL THEN
    CREATE TYPE public."AttendanceStatus" AS ENUM ('PRESENT','ABSENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."Company" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS public."User" (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role public."Role" NOT NULL DEFAULT 'EMPLOYEE',
  companyId INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Employee" (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nic TEXT NOT NULL,
  job_title TEXT NOT NULL,
  salary DOUBLE PRECISION NOT NULL,
  bank_details TEXT NOT NULL,
  date_of_birth TIMESTAMP(3),
  phone_number TEXT,
  address TEXT
);

CREATE TABLE IF NOT EXISTS public."LeaveType" (
  id SERIAL PRIMARY KEY,
  companyId INTEGER NOT NULL,
  name TEXT NOT NULL,
  default_balance DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS public."LeaveRequest" (
  id SERIAL PRIMARY KEY,
  employeeId INTEGER NOT NULL,
  leaveTypeId INTEGER NOT NULL,
  start_date TIMESTAMP(3) NOT NULL,
  end_date TIMESTAMP(3) NOT NULL,
  status public."LeaveStatus" NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS public."AttendanceRecord" (
  id SERIAL PRIMARY KEY,
  employeeId INTEGER NOT NULL,
  date TIMESTAMP(3) NOT NULL,
  status public."AttendanceStatus" NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Payslip" (
  id SERIAL PRIMARY KEY,
  employeeId INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  gross_pay DOUBLE PRECISION NOT NULL,
  epf_employee DOUBLE PRECISION NOT NULL,
  epf_employer DOUBLE PRECISION NOT NULL,
  etf DOUBLE PRECISION NOT NULL,
  paye DOUBLE PRECISION NOT NULL,
  net_pay DOUBLE PRECISION NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON public."User"(email);
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON public."Employee"(userId);
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_nic_key" ON public."Employee"(nic);

-- ensure foreign-key columns exist (ADD COLUMN IF NOT EXISTS is safe on Postgres)
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
ALTER TABLE public."Employee" ADD COLUMN IF NOT EXISTS "userId" INTEGER;
ALTER TABLE public."LeaveType" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
ALTER TABLE public."LeaveRequest" ADD COLUMN IF NOT EXISTS "employeeId" INTEGER;
ALTER TABLE public."LeaveRequest" ADD COLUMN IF NOT EXISTS "leaveTypeId" INTEGER;
ALTER TABLE public."AttendanceRecord" ADD COLUMN IF NOT EXISTS "employeeId" INTEGER;
ALTER TABLE public."Payslip" ADD COLUMN IF NOT EXISTS "employeeId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_companyId_fkey') THEN
    ALTER TABLE public."User"
      ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_userId_fkey') THEN
    ALTER TABLE public."Employee"
      ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveRequest_employeeId_fkey') THEN
    ALTER TABLE public."LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveRequest_leaveTypeId_fkey') THEN
    ALTER TABLE public."LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES public."LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceRecord_employeeId_fkey') THEN
    ALTER TABLE public."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payslip_employeeId_fkey') THEN
    ALTER TABLE public."Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
