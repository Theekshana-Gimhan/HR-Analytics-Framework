-- Add missing Company settings columns and rename table to match @@map("companies")

-- Rename table from "Company" to "companies" (if not already renamed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Company') THEN
        ALTER TABLE "Company" RENAME TO "companies";
    END IF;
END $$;

-- Add missing columns to the companies table
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "registration_number" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Sri Lanka';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'LKR';

-- Update foreign key constraints to reference the renamed table
-- User table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_company_id_fkey') THEN
        ALTER TABLE "User" DROP CONSTRAINT "User_company_id_fkey";
    END IF;
    ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Constraint may already reference the new table
END $$;

-- BankFileExport table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'BankFileExport_company_id_fkey') THEN
        ALTER TABLE "BankFileExport" DROP CONSTRAINT "BankFileExport_company_id_fkey";
    END IF;
    ALTER TABLE "BankFileExport" ADD CONSTRAINT "BankFileExport_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- LeaveType table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeaveType_company_id_fkey') THEN
        ALTER TABLE "LeaveType" DROP CONSTRAINT "LeaveType_company_id_fkey";
    END IF;
    ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
