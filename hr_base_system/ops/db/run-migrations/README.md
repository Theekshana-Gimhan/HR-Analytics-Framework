Run the consolidate-company-id migration as a Cloud Run Job

This job will run inside your VPC using the same connector and service account
pattern as the diagnostic jobs. It requires the database connection string to be
provided from Secret Manager (the same secret used by the backend, e.g. `dev-database-url`).

Files
- consolidate-company-id-job.yaml - Cloud Run Job manifest

How to deploy and execute (PowerShell)

1) (Optional) Inspect the job manifest

    notepad ops/run-migrations/consolidate-company-id-job.yaml

2) Create or replace the job with gcloud

    # Replace the job (works whether it exists or not)
    gcloud run jobs replace ops/run-migrations/consolidate-company-id-job.yaml --region=us-central1

   If you prefer, use 'create' instead of 'replace' on first run:

    gcloud run jobs create consolidate-company-id-migration --image=postgres:15 --region=us-central1

3) Execute the job and attach the database secret

    # Execute the job and attach the secret (PowerShell):
    gcloud run jobs execute consolidate-company-id-migration --region=us-central1 --set-secrets="DATABASE_URL=dev-database-url:latest"

   Notes:
   - Replace `dev-database-url` with the name of the Secret Manager secret for your target environment (e.g. prod-database-url).
   - The `--set-secrets` flag maps the secret value into the container env var `DATABASE_URL` at runtime.

4) Watch logs for success/failure

    # Show the job execution logs (find the execution id in the previous output or use the Cloud Console):
    gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=consolidate-company-id-migration" --limit=200 --format="json"

5) Verification (psql or run a small query from Cloud Run/Cloud Shell)

    -- Check the User table
    psql "$DATABASE_URL" -c "SELECT id, email, companyid, \"companyId\", company_id FROM \"User\" ORDER BY id DESC LIMIT 50;"

    -- Count null canonical column
    psql "$DATABASE_URL" -c "SELECT COUNT(*) FILTER (WHERE company_id IS NULL) AS null_company_id FROM \"User\";"

Rollback and cleanup
- This job copies data and creates FK constraints but leaves legacy columns in place.
- If you need to rollback, restore the database from a snapshot.
- After verification, create a follow-up job/migration to DROP old columns if desired.

Security
- The job uses `simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com`. Ensure this SA has access to the Secret Manager secret and Cloud SQL network access.
- The job writes no persistent artifacts except logs; it runs only once per execute command.
