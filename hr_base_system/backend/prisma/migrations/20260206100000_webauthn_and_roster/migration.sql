-- CreateEnum (if not exists by checking pg_type)
DO $$ BEGIN
    CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'ABSENT', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ExpiryDocumentType" AS ENUM ('LICENSE', 'CERTIFICATION', 'VISA', 'WORK_PERMIT', 'MEDICAL_CERTIFICATE', 'BACKGROUND_CHECK', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ExpiryDocumentStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_templates" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "break_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "employee_shifts" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "shift_template_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "expiry_documents" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "document_id" INTEGER,
    "documentType" "ExpiryDocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE NOT NULL,
    "alert_days_before" INTEGER NOT NULL DEFAULT 30,
    "status" "ExpiryDocumentStatus" NOT NULL DEFAULT 'VALID',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expiry_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "authenticators" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "credential_id" BYTEA NOT NULL,
    "credential_public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "credential_device_type" TEXT NOT NULL,
    "credential_backed_up" BOOLEAN NOT NULL,
    "transports" TEXT[],
    "aaguid" TEXT,
    "friendly_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "authenticators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
    "id" SERIAL NOT NULL,
    "challenge" TEXT NOT NULL,
    "user_id" INTEGER,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "shift_templates_company_id_is_active_idx" ON "shift_templates"("company_id", "is_active");

CREATE INDEX IF NOT EXISTS "employee_shifts_date_idx" ON "employee_shifts"("date");

CREATE INDEX IF NOT EXISTS "employee_shifts_shift_template_id_idx" ON "employee_shifts"("shift_template_id");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_shifts_employee_id_date_key" ON "employee_shifts"("employee_id", "date");

CREATE INDEX IF NOT EXISTS "expiry_documents_employee_id_idx" ON "expiry_documents"("employee_id");

CREATE INDEX IF NOT EXISTS "expiry_documents_expiry_date_idx" ON "expiry_documents"("expiry_date");

CREATE INDEX IF NOT EXISTS "expiry_documents_status_idx" ON "expiry_documents"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "authenticators_credential_id_key" ON "authenticators"("credential_id");

CREATE INDEX IF NOT EXISTS "authenticators_user_id_idx" ON "authenticators"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "webauthn_challenges_challenge_key" ON "webauthn_challenges"("challenge");

CREATE INDEX IF NOT EXISTS "webauthn_challenges_user_id_idx" ON "webauthn_challenges"("user_id");

CREATE INDEX IF NOT EXISTS "webauthn_challenges_expires_at_idx" ON "webauthn_challenges"("expires_at");

-- AddForeignKey (with check to avoid duplicates)
DO $$ BEGIN
    ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "expiry_documents" ADD CONSTRAINT "expiry_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "expiry_documents" ADD CONSTRAINT "expiry_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "EmployeeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
