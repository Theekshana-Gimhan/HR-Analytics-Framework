-- Combined idempotent migrations for dev

-- 1) 20251008040051_add_employee_details
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE public."Role" AS ENUM ('OWNER','ADMIN','EMPLOYEE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leavestatus') THEN
    CREATE TYPE public."LeaveStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendancestatus') THEN
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

-- 2) 20251014114000_add_employee_soft_delete
ALTER TABLE IF EXISTS public."Employee" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public."Employee" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;

CREATE INDEX IF NOT EXISTS "Employee_is_active_idx" ON public."Employee"("is_active");
CREATE INDEX IF NOT EXISTS "Employee_deleted_at_idx" ON public."Employee"("deleted_at");

-- 3) 20251014150000_add_leave_balance_tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leavebalancereason') THEN
    CREATE TYPE public."LeaveBalanceReason" AS ENUM ('ACCRUAL','USAGE','ADJUSTMENT','REVERSAL');
  END IF;
END $$;

ALTER TABLE IF EXISTS public."Employee" ADD COLUMN IF NOT EXISTS "employment_start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS public."Employee" ALTER COLUMN IF EXISTS "deleted_at" TYPE TIMESTAMP(3);
ALTER TABLE IF EXISTS public."LeaveRequest" ADD COLUMN IF NOT EXISTS "total_days" DECIMAL(65,30);
ALTER TABLE IF EXISTS public."LeaveType" ADD COLUMN IF NOT EXISTS "requires_anniversary" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public."EmployeeLeaveBalance" (
  id SERIAL PRIMARY KEY,
  employeeId INTEGER NOT NULL,
  leaveTypeId INTEGER NOT NULL,
  accrued DECIMAL(65,30) NOT NULL DEFAULT 0,
  used DECIMAL(65,30) NOT NULL DEFAULT 0,
  carriedForward DECIMAL(65,30) NOT NULL DEFAULT 0,
  lastAccruedAt TIMESTAMP(3),
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS public."LeaveBalanceTransaction" (
  id SERIAL PRIMARY KEY,
  leaveBalanceId INTEGER NOT NULL,
  leaveRequestId INTEGER,
  change DECIMAL(65,30) NOT NULL,
  balanceAfter DECIMAL(65,30) NOT NULL,
  reason public."LeaveBalanceReason" NOT NULL,
  note TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeLeaveBalance_employeeId_leaveTypeId_key" ON public."EmployeeLeaveBalance"(employeeId, leaveTypeId);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeLeaveBalance_employeeId_fkey') THEN
    ALTER TABLE public."EmployeeLeaveBalance" ADD CONSTRAINT "EmployeeLeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeLeaveBalance_leaveTypeId_fkey') THEN
    ALTER TABLE public."EmployeeLeaveBalance" ADD CONSTRAINT "EmployeeLeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES public."LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveBalanceTransaction_leaveBalanceId_fkey') THEN
    ALTER TABLE public."LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_leaveBalanceId_fkey" FOREIGN KEY ("leaveBalanceId") REFERENCES public."EmployeeLeaveBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveBalanceTransaction_leaveRequestId_fkey') THEN
    ALTER TABLE public."LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES public."LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) 20251015092555_add_bank_export_support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bankfiletype') THEN
    CREATE TYPE public."BankFileType" AS ENUM ('CIPS','SLIPS');
  END IF;
END $$;

ALTER TABLE IF EXISTS public."Employee"
  ADD COLUMN IF NOT EXISTS "account_number" TEXT,
  ADD COLUMN IF NOT EXISTS "bank_code" TEXT,
  ADD COLUMN IF NOT EXISTS "bank_name" TEXT,
  ADD COLUMN IF NOT EXISTS "branch_code" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='EmployeeDocument' AND column_name='updatedAt'
  ) THEN
    BEGIN
      ALTER TABLE public."EmployeeDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not alter EmployeeDocument.updatedAt default (ignored).';
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."RefreshToken" (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL,
  userId INTEGER NOT NULL,
  expiresAt TIMESTAMP(3) NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."BankFileExport" (
  id SERIAL PRIMARY KEY,
  companyId INTEGER NOT NULL,
  bankCode TEXT NOT NULL,
  fileType public."BankFileType" NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  totalRecords INTEGER NOT NULL,
  totalAmount DECIMAL(65,30) NOT NULL DEFAULT 0,
  generatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generatedBy INTEGER,
  checksum TEXT,
  fileName TEXT NOT NULL,
  storagePath TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON public."RefreshToken"(token);
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON public."RefreshToken"(userId);
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON public."RefreshToken"(token);
CREATE INDEX IF NOT EXISTS "BankFileExport_companyId_year_month_idx" ON public."BankFileExport"(companyId, year, month);
CREATE INDEX IF NOT EXISTS "BankFileExport_bankCode_idx" ON public."BankFileExport"(bankCode);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_userId_fkey') THEN
    ALTER TABLE public."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankFileExport_companyId_fkey') THEN
    ALTER TABLE public."BankFileExport" ADD CONSTRAINT "BankFileExport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankFileExport_generatedBy_fkey') THEN
    ALTER TABLE public."BankFileExport" ADD CONSTRAINT "BankFileExport_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES public."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) 20251015093000_add_employee_documents
CREATE TABLE IF NOT EXISTS public."EmployeeDocument" (
  id SERIAL PRIMARY KEY,
  employeeId INTEGER NOT NULL,
  originalName TEXT NOT NULL,
  storedName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  size INTEGER NOT NULL,
  storageProvider TEXT NOT NULL,
  storagePath TEXT NOT NULL,
  uploadedBy INTEGER NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeDocument_employeeId_fkey') THEN
    ALTER TABLE public."EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeDocument_uploadedBy_fkey') THEN
    ALTER TABLE public."EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeId_idx" ON public."EmployeeDocument"(employeeId);
CREATE INDEX IF NOT EXISTS "EmployeeDocument_uploadedBy_idx" ON public."EmployeeDocument"(uploadedBy);

CREATE OR REPLACE FUNCTION update_employee_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_employee_document_updated_at') THEN
    CREATE TRIGGER update_employee_document_updated_at
    BEFORE UPDATE ON public."EmployeeDocument"
    FOR EACH ROW EXECUTE FUNCTION update_employee_document_updated_at();
  END IF;
END $$;

-- End of combined migrations
