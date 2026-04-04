-- 20251014150000_add_leave_balance_tracking
DO $$
BEGIN
  BEGIN
    CREATE TYPE public."LeaveBalanceReason" AS ENUM ('ACCRUAL','USAGE','ADJUSTMENT','REVERSAL');
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Add employment_start_date if missing (do not force NOT NULL if existing rows may lack a value)
ALTER TABLE public."Employee" ADD COLUMN IF NOT EXISTS "employment_start_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Alter deleted_at type only if the column exists; wrap in a DO block to avoid syntax incompatibilities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Employee' AND column_name = 'deleted_at'
  ) THEN
    BEGIN
      ALTER TABLE public."Employee" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skipping alter column deleted_at: %', SQLERRM;
    END;
  END IF;
END $$;
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
  -- ensure FK columns exist before adding constraints (safe, non-destructive)
  ALTER TABLE public."EmployeeLeaveBalance" ADD COLUMN IF NOT EXISTS "employeeId" INTEGER;
  ALTER TABLE public."EmployeeLeaveBalance" ADD COLUMN IF NOT EXISTS "leaveTypeId" INTEGER;
  ALTER TABLE public."LeaveBalanceTransaction" ADD COLUMN IF NOT EXISTS "leaveBalanceId" INTEGER;
  ALTER TABLE public."LeaveBalanceTransaction" ADD COLUMN IF NOT EXISTS "leaveRequestId" INTEGER;

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
