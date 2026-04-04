# Migration Runbook â€” consolidate_company_id (2025-10-29)

Purpose
-------
This runbook contains copy/paste-ready steps to safely run the idempotent migration that consolidates company foreign key columns to `company_id` and verifies results.

Pre-requisites
-------------
- You must have a backup/snapshot of the target database.
- Use Cloud Shell (recommended) or a machine that has VPC access to the Cloud SQL instance (same VPC as Cloud Run). Using PowerShell on Windows has caused YAML/quoting issues; prefer Cloud Shell or bash.
- The migration SQL is in `ops/db-migrations/20251029_consolidate_company_id.sql`.
- The Cloud Run Job manifest (cleaned) is `ops/run-migrations/consolidate-company-id-job.cleaned.yaml`.
- Secret Manager must contain the DB URL under a secret (example: `dev-database-url`) and the service account `simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com` must have access.

Option A â€” Run the Cloud Run Job (recommended)
----------------------------------------------
1. Open Cloud Shell in the GCP project `long-operator-466309-g6`.
2. Upload or confirm the manifest is present in the working directory. If you checked out the repo in Cloud Shell:

```bash
# from Cloud Shell
cd ~/repo/HR/ops/run-migrations
gcloud run jobs replace consolidate-company-id-job.cleaned.yaml --region=us-central1
```

3. Create/replace the job. Then run it attaching the DATABASE_URL secret from Secret Manager (replace SECRET_NAME):

```bash
# replace SECRET_NAME with the Secret Manager secret name, e.g. dev-database-url
gcloud run jobs execute consolidate-company-id-migration \
  --region=us-central1 \
  --set-secrets=DATABASE_URL=SECRET_NAME:latest
```

4. Tail the logs to watch output (use Cloud Logging or `gcloud`):

```bash
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=consolidate-company-id-migration" --limit=50 --project=long-operator-466309-g6 --format="json" | jq .
```

Option B â€” Run SQL directly via psql (Cloud Shell or bastion)
----------------------------------------------------------
1. From Cloud Shell or a machine with VPC access and `psql` installed:

```bash
# fetch secret into env (example using Secret Manager API):
DB_URL=$(gcloud secrets versions access latest --secret="dev-database-url")
psql "$DB_URL" -f ops/db-migrations/20251029_consolidate_company_id.sql
```

2. Watch for errors. The migration is idempotent and will not fail if run multiple times, but always verify results below.

Verification
------------
Run these queries to confirm `company_id` is populated and NOT NULL constraint satisfied:

```sql
SELECT id, email, companyid, "companyId", company_id FROM "User" ORDER BY id DESC LIMIT 50;
SELECT id, companyid, "companyId", company_id FROM "BankFileExport" ORDER BY id DESC LIMIT 50;
SELECT id, companyid, "companyId", company_id FROM "LeaveType" ORDER BY id DESC LIMIT 50;
```

If `company_id` column is populated for existing rows and inserts via the application no longer produce null-constraint violations, the migration succeeded.

Post-migration cleanup (optional, follow after verification)
---------------------------------------------------------
1. Run additional queries to confirm there are no code paths writing to the legacy columns.
2. Create a reviewed PR to drop legacy columns (`companyid` and `"companyId"`) in a separate migration and deploy after a maintenance window.

Troubleshooting
---------------
- YAML parse errors when running `gcloud run jobs replace` from PowerShell: use Cloud Shell or switch to bash.
- If `psql` reports authentication or network errors, verify VPC connector and service account permissions and that the DB is reachable.

If you'd like, I can produce the exact `gcloud` commands you should run from Cloud Shell if you give me the secret name and region. Otherwise hand this runbook to your cloud engineer.

