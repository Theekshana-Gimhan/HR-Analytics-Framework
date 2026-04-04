-- Drop the old camelCase companyId columns after consolidation
-- These were kept during 20251029_consolidate_company_id migration but are no longer needed

-- Drop old camelCase columns
ALTER TABLE public."User" DROP COLUMN IF EXISTS "companyId";
ALTER TABLE public."BankFileExport" DROP COLUMN IF EXISTS "companyId";
ALTER TABLE public."LeaveType" DROP COLUMN IF EXISTS "companyId";
