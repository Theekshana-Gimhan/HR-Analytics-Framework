-- Consolidate company id columns across tables to canonical column: company_id
-- Safe, idempotent migration to:
-- 1. create company_id columns (if not exists)
-- 2. copy values from existing columns "companyId" (camelCase) and companyid (lowercase) into company_id
-- 3. create foreign keys to public."Company"(id) using company_id
-- 4. set NOT NULL where appropriate
-- This script intentionally does NOT DROP old columns; drop after verification if desired.

BEGIN;

-- Add canonical column if missing
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE public."BankFileExport" ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE public."LeaveType" ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Copy values into company_id preferring existing camelCase "companyId", then lowercase companyid, then existing company_id
UPDATE public."User"
SET company_id = COALESCE("companyId"::integer, companyid::integer, company_id)
WHERE company_id IS NULL AND ("companyId" IS NOT NULL OR companyid IS NOT NULL);

UPDATE public."BankFileExport"
SET company_id = COALESCE("companyId"::integer, companyid::integer, company_id)
WHERE company_id IS NULL AND ("companyId" IS NOT NULL OR companyid IS NOT NULL);

UPDATE public."LeaveType"
SET company_id = COALESCE("companyId"::integer, companyid::integer, company_id)
WHERE company_id IS NULL AND ("companyId" IS NOT NULL OR companyid IS NOT NULL);

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

-- Set NOT NULL where business logic requires it (do this only after verifying data copied correctly)
-- Here we set NOT NULL for tables that historically required companyId
ALTER TABLE public."User" ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public."BankFileExport" ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public."LeaveType" ALTER COLUMN company_id SET NOT NULL;

COMMIT;

-- Notes:
-- 1) After running and verifying, you may drop the old columns "companyId" and/or companyid once you're confident.
-- 2) Backup the DB before applying on production.
-- 3) If you use Prisma Migrate, prefer to run this script as a SQL migration and then update Prisma schema (we already updated schema to map to company_id).
