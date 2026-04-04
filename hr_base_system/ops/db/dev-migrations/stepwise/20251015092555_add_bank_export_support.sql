-- 20251015092555_add_bank_export_support
DO $$
BEGIN
  BEGIN
    CREATE TYPE public."BankFileType" AS ENUM ('CIPS','SLIPS');
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Add employee bank columns if missing (do not force NOT NULL)
ALTER TABLE public."Employee"
  ADD COLUMN IF NOT EXISTS "account_number" TEXT;
ALTER TABLE public."Employee" ADD COLUMN IF NOT EXISTS "bank_code" TEXT;
ALTER TABLE public."Employee" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE public."Employee" ADD COLUMN IF NOT EXISTS "branch_code" TEXT;

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

-- Ensure columns exist before adding foreign keys
ALTER TABLE public."RefreshToken" ADD COLUMN IF NOT EXISTS "userId" INTEGER;
ALTER TABLE public."BankFileExport" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
ALTER TABLE public."BankFileExport" ADD COLUMN IF NOT EXISTS "generatedBy" INTEGER;

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
