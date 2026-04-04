-- CreateEnum
CREATE TYPE "public"."LeaveBalanceReason" AS ENUM ('ACCRUAL', 'USAGE', 'ADJUSTMENT', 'REVERSAL');

-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "employment_start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."LeaveRequest" ADD COLUMN     "total_days" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."LeaveType" ADD COLUMN     "requires_anniversary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."EmployeeLeaveBalance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "accrued" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "used" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "carriedForward" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastAccruedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaveBalanceTransaction" (
    "id" SERIAL NOT NULL,
    "leaveBalanceId" INTEGER NOT NULL,
    "leaveRequestId" INTEGER,
    "change" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "reason" "public"."LeaveBalanceReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLeaveBalance_employeeId_leaveTypeId_key" ON "public"."EmployeeLeaveBalance"("employeeId", "leaveTypeId");

-- AddForeignKey
ALTER TABLE "public"."EmployeeLeaveBalance" ADD CONSTRAINT "EmployeeLeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeLeaveBalance" ADD CONSTRAINT "EmployeeLeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "public"."LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_leaveBalanceId_fkey" FOREIGN KEY ("leaveBalanceId") REFERENCES "public"."EmployeeLeaveBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveBalanceTransaction" ADD CONSTRAINT "LeaveBalanceTransaction_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "public"."LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;


