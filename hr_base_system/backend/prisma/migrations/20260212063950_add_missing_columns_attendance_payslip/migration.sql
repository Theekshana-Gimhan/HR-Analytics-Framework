/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `BankFileExport` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[employeeId,month,year]` on the table `Payslip` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "BankFileExport" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "EmployeeDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN IF NOT EXISTS "allowances" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "basic_salary" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankFileExport_company_id_year_month_idx" ON "BankFileExport"("company_id", "year", "month");

-- Deduplicate Payslip table
DELETE FROM "Payslip" a USING "Payslip" b
WHERE a.id < b.id
  AND a."employeeId" = b."employeeId"
  AND a.month = b.month
  AND a.year = b.year;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payslip_employeeId_month_year_key" ON "Payslip"("employeeId", "month", "year");

-- RenameForeignKey
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'bankfileexport_company_id_fkey') THEN
        ALTER TABLE "BankFileExport" RENAME CONSTRAINT "bankfileexport_company_id_fkey" TO "BankFileExport_company_id_fkey";
    END IF;
END $$;

-- RenameForeignKey
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'LeaveType_companyId_fkey') THEN
        ALTER TABLE "LeaveType" RENAME CONSTRAINT "LeaveType_companyId_fkey" TO "LeaveType_company_id_fkey";
    END IF;
END $$;

-- RenameForeignKey
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'user_company_id_fkey') THEN
        ALTER TABLE "User" RENAME CONSTRAINT "user_company_id_fkey" TO "User_company_id_fkey";
    END IF;
END $$;
