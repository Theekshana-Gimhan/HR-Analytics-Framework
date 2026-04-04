-- Add is_active and deleted_at to Employee
ALTER TABLE "public"."Employee" ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE "public"."Employee" ADD COLUMN "deleted_at" timestamptz;

-- Add index to speed up queries filtering active employees
CREATE INDEX "Employee_is_active_idx" ON "public"."Employee"("is_active");
CREATE INDEX "Employee_deleted_at_idx" ON "public"."Employee"("deleted_at");
