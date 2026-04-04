Migration: consolidate company id columns

Goal
- Consolidate multiple company id columns ("companyId", companyid) into a canonical column `company_id`.
- Update foreign keys to reference `company_id`.

Files
- 20251029_consolidate_company_id.sql  - idempotent SQL migration to create company_id, copy data, create FK, and set NOT NULL.

How to run (recommended)
1. Run on staging first. Ensure you have a DB backup/snapshot.
2. From a machine with psql and network access to the DB (or via a Cloud Run Job with VPC access):

   psql "$DATABASE_URL" -f ops/db-migrations/20251029_consolidate_company_id.sql

3. Verify data:

   -- Check user rows
   SELECT id, email, companyid, "companyId", company_id FROM "User" ORDER BY id DESC LIMIT 50;

   -- Check counts
   SELECT COUNT(*) FILTER (WHERE company_id IS NULL) AS null_company_id FROM "User";

4. If everything looks correct and apps were updated to use `company_id` (Prisma schema already updated in this repo), you may drop legacy columns in a follow-up migration.

Notes
- This migration intentionally leaves legacy columns in place so we can roll back quickly if necessary.
- We updated `SimpalaHR/backend/prisma/schema.prisma` to map Prisma's `companyId` field to the DB column `company_id`.
- After running this migration in each environment and verifying, recreate any necessary indexes and remove legacy columns in a separate, reviewed change.

Rollback
- If you must rollback, restore DB from backup/snapshot. The migration has no automated rollback.
