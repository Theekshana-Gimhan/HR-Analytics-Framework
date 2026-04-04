-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" SERIAL PRIMARY KEY,
    "employeeId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AddForeignKey
ALTER TABLE "EmployeeDocument"
ADD CONSTRAINT "EmployeeDocument_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeDocument"
ADD CONSTRAINT "EmployeeDocument_uploadedBy_fkey"
FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument" ("employeeId");
CREATE INDEX "EmployeeDocument_uploadedBy_idx" ON "EmployeeDocument" ("uploadedBy");

-- Trigger to update updatedAt on modification
CREATE OR REPLACE FUNCTION update_employee_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_document_updated_at
BEFORE UPDATE ON "EmployeeDocument"
FOR EACH ROW
EXECUTE FUNCTION update_employee_document_updated_at();
