-- 20251015093000_add_employee_documents
CREATE TABLE IF NOT EXISTS public."EmployeeDocument" (
  id SERIAL PRIMARY KEY,
  employeeId INTEGER NOT NULL,
  originalName TEXT NOT NULL,
  storedName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  size INTEGER NOT NULL,
  storageProvider TEXT NOT NULL,
  storagePath TEXT NOT NULL,
  uploadedBy INTEGER NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ensure columns exist before adding FKs when the table already exists
ALTER TABLE public."EmployeeDocument" ADD COLUMN IF NOT EXISTS "employeeId" INTEGER;
ALTER TABLE public."EmployeeDocument" ADD COLUMN IF NOT EXISTS "uploadedBy" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeDocument_employeeId_fkey') THEN
    ALTER TABLE public."EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeDocument_uploadedBy_fkey') THEN
    ALTER TABLE public."EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeId_idx" ON public."EmployeeDocument"(employeeId);
CREATE INDEX IF NOT EXISTS "EmployeeDocument_uploadedBy_idx" ON public."EmployeeDocument"(uploadedBy);

CREATE OR REPLACE FUNCTION update_employee_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_employee_document_updated_at') THEN
    CREATE TRIGGER update_employee_document_updated_at
    BEFORE UPDATE ON public."EmployeeDocument"
    FOR EACH ROW EXECUTE FUNCTION update_employee_document_updated_at();
  END IF;
END $$;
