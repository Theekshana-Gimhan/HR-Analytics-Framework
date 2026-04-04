# DB Migration Status â€” 2025-10-29

Summary
-------
- Root cause: duplicate PostgreSQL columns differing only by identifier quoting/case led to a NOT NULL constraint on `companyid` (lowercase) while the application inserted into the quoted `"companyId"` column. This caused a null-constraint error despite Prisma showing a numeric `companyId` parameter.
- Impacted tables: `public."User"`, `public."BankFileExport"`, `public."LeaveType"`.

What was done
----------------
- Instrumented backend to emit seed payloads and Prisma queries (`SEED_DEBUG_PAYLOADS` and `PRISMA_QUERY`) and captured Cloud Run logs.
- Ran an in-VPC DB inspection job and downloaded the output (`diagnostics-output--.txt`) showing both `companyid` and `"companyId"` present on `public."User"`.
- Implemented a conservative, idempotent migration to canonicalize the company FK to `company_id` (snake_case) and mapped Prisma fields to that column via `@map("company_id")`.
- Added the following repository artifacts:
  - `prisma/schema.prisma` â€” mapping `companyId` -> `company_id` for `User`, `LeaveType`, `BankFileExport`.
  - `ops/db-migrations/20251029_consolidate_company_id.sql` â€” idempotent SQL migration to create `company_id`, copy values from `"companyId"` or `companyid`, create FK constraints, and set NOT NULL.
  - `prisma/migrations/20251029_consolidate_company_id/migration.sql` â€” same migration for Prisma migrate deploy.
  - `backend/src/tests/consolidate-company-id.test.ts` â€” integration test to verify canonical column population (requires DB connection).
  - `ops/run-migrations/consolidate-company-id-job.yaml` â€” Cloud Run Job manifest to run the migration inside the VPC (cleaned version: `consolidate-company-id-job.cleaned.yaml`).

Current status
--------------
- Code changes and migration SQL are present in the repository on branch `dev`.
- Prisma client regenerated locally (`npx prisma generate`) successfully.
- Local `npm test` runs fail for integration tests because there is no accessible DB at `localhost:5432` (PrismaClientInitializationError). Unit tests pass.
- Cloud Run Job manifest was malformed initially; I created a cleaned manifest `ops/run-migrations/consolidate-company-id-job.cleaned.yaml` to fix CLI YAML parse errors.
- The migration has NOT been executed against staging/production yet. Execution is pending.

Blockers & recommended next actions
----------------------------------
1. Execute the idempotent migration inside the same VPC as the Cloud Run service (recommended). Two safe options:
   - Run the prepared Cloud Run Job using the cleaned manifest and attach the DB `DATABASE_URL` secret from Secret Manager.
   - Run the SQL directly from a machine/container that has VPC access to the Cloud SQL instance (Cloud Shell with appropriate VPC access or a bastion host).
2. Snapshot the database (backup) before applying the migration in production.
3. After applying the migration in staging, run the integration test suite against staging DB and verify the seed endpoint (POST /api/ensure-seed) no longer errors.
4. Once verified, create a follow-up migration to drop legacy columns (`companyid` and `"companyId"`) and then remove any debug instrumentation.

Quick verification queries (run after migration)
----------------------------------------------
SELECT id, email, companyid, "companyId", company_id FROM "User" ORDER BY id DESC LIMIT 50;
SELECT id, companyid, "companyId", company_id FROM "BankFileExport" ORDER BY id DESC LIMIT 50;
SELECT id, companyid, "companyId", company_id FROM "LeaveType" ORDER BY id DESC LIMIT 50;

Files to review
---------------
- `ops/db-migrations/20251029_consolidate_company_id.sql`
- `prisma/migrations/20251029_consolidate_company_id/migration.sql`
- `prisma/schema.prisma` (look for `@map("company_id")` changes)
- `ops/run-migrations/consolidate-company-id-job.cleaned.yaml`
- `backend/src/tests/consolidate-company-id.test.ts`

Contact / Ownership
--------------------
- For migration execution in GCP, use the `simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com` service account and `simpala-vpc-connector` VPC connector.
- Diagnostics output is stored in `gs://diag-output-long-operator-466309-g6/` (check permissions if you need access).

If you want, I can produce exact Cloud Shell copy/paste commands to deploy and run the Cloud Run Job and to tail logs for verification.

Generated: 2025-10-29

