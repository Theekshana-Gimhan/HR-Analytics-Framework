-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "companies" RENAME CONSTRAINT "Company_pkey" TO "companies_pkey";
