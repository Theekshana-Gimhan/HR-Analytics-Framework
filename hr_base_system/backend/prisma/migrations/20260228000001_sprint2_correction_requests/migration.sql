-- Sprint 2: Add AttendanceCorrectionRequest table and CorrectionStatus enum

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AttendanceCorrectionRequest" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "attendanceId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "requestedStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "admin_notes" TEXT,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "AttendanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
