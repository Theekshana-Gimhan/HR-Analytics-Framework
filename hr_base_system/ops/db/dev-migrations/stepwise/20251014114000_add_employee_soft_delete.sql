-- 20251014114000_add_employee_soft_delete
ALTER TABLE IF EXISTS public."Employee" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS public."Employee" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;

CREATE INDEX IF NOT EXISTS "Employee_is_active_idx" ON public."Employee"("is_active");
CREATE INDEX IF NOT EXISTS "Employee_deleted_at_idx" ON public."Employee"("deleted_at");
