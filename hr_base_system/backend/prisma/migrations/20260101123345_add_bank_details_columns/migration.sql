-- Add missing bank details and employee columns
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bank_branch" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "account_holder_name" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "allowances" DECIMAL(10, 2);
