-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED', 'RESIGNED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE';
