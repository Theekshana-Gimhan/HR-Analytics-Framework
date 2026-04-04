-- Sprint 1: Add CANCELLED to LeaveStatus, expand AttendanceStatus,
--            add DocumentCategory enum and category column to employee_documents

-- Add CANCELLED to LeaveStatus enum
ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add new values to AttendanceStatus enum
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'LATE';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'HALF_DAY';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'WFH';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'ON_LEAVE';

-- Create DocumentCategory enum
DO $$ BEGIN
    CREATE TYPE "DocumentCategory" AS ENUM (
        'MEDICAL_REPORT',
        'EPF_FORM',
        'POLICE_REPORT',
        'CONTRACT',
        'IDENTIFICATION',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add category column to employee_documents (nullable, defaults to OTHER)
ALTER TABLE "EmployeeDocument"
    ADD COLUMN IF NOT EXISTS "category" "DocumentCategory" DEFAULT 'OTHER';
