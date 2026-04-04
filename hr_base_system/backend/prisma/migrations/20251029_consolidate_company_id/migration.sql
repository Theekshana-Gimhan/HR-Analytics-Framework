-- Prisma migration: consolidate company id columns into canonical company_id
-- This migration mirrors ops/db-migrations/20251029_consolidate_company_id.sql

-- Add canonical column if missing
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE public."BankFileExport" ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE public."LeaveType" ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Copy values into company_id from existing "companyId" column
UPDATE public."User"
SET company_id = "companyId"
WHERE company_id IS NULL AND "companyId" IS NOT NULL;

UPDATE public."BankFileExport"
SET company_id = "companyId"
WHERE company_id IS NULL AND "companyId" IS NOT NULL;

UPDATE public."LeaveType"
SET company_id = "companyId"
WHERE company_id IS NULL AND "companyId" IS NOT NULL;

-- Create / ensure foreign key constraints on canonical column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND t.relname = 'User'
      AND pg_get_constraintdef(c.oid) ILIKE '%(company_id)%'
  ) THEN
    ALTER TABLE public."User" DROP CONSTRAINT IF EXISTS User_companyId_fkey;
    ALTER TABLE public."User" ADD CONSTRAINT User_company_id_fkey FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND t.relname = 'BankFileExport'
      AND pg_get_constraintdef(c.oid) ILIKE '%(company_id)%'
  ) THEN
    ALTER TABLE public."BankFileExport" DROP CONSTRAINT IF EXISTS BankFileExport_companyId_fkey;
    ALTER TABLE public."BankFileExport" ADD CONSTRAINT BankFileExport_company_id_fkey FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND t.relname = 'LeaveType'
      AND pg_get_constraintdef(c.oid) ILIKE '%(company_id)%'
  ) THEN
    ALTER TABLE public."LeaveType" DROP CONSTRAINT IF EXISTS LeaveType_companyId_fkey;
    ALTER TABLE public."LeaveType" ADD CONSTRAINT LeaveType_company_id_fkey FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

-- Set NOT NULL where business logic requires it
ALTER TABLE public."User" ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public."BankFileExport" ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public."LeaveType" ALTER COLUMN company_id SET NOT NULL;
