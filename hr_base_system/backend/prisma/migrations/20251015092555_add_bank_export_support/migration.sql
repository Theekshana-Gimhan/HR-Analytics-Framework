-- CreateEnum
CREATE TYPE "public"."BankFileType" AS ENUM ('CIPS', 'SLIPS');

-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "account_number" TEXT,
ADD COLUMN     "bank_code" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "branch_code" TEXT;


-- AlterTable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'EmployeeDocument'
    ) THEN
        ALTER TABLE "public"."EmployeeDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END $$;

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BankFileExport" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "bankCode" TEXT NOT NULL,
    "fileType" "public"."BankFileType" NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" INTEGER,
    "checksum" TEXT,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT,

    CONSTRAINT "BankFileExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "public"."RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "public"."RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "public"."RefreshToken"("token");

-- CreateIndex
CREATE INDEX "BankFileExport_companyId_year_month_idx" ON "public"."BankFileExport"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "BankFileExport_bankCode_idx" ON "public"."BankFileExport"("bankCode");

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BankFileExport" ADD CONSTRAINT "BankFileExport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BankFileExport" ADD CONSTRAINT "BankFileExport_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
