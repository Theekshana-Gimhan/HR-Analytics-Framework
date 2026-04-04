-- Sprint 3: Add emergency contact fields to Employee table
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "emergency_contact_name" TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_contact_phone" TEXT;
