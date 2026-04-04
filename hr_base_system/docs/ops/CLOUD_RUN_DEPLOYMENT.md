# Deploying SimpalaHR backend to Cloud Run

This document explains how to build and deploy the `SimpalaHR/backend` service to
Google Cloud Run in project `long-operator-466309-g6`.

Prerequisites

- gcloud SDK installed and authenticated

- Permissions to enable APIs and deploy Cloud Run services in the target project

Required environment variables (must be provided to the service at runtime)

- DATABASE_URL - Postgres connection string (e.g. postgres://user:pass@host:5432/db)

- JWT_SECRET - Secret used for signing JWTs

- CORS_ORIGIN - Comma-separated allowed origins (default: *)

- STORAGE_DRIVER - 'local' or 's3' (default: local)

- LOCAL_STORAGE_ROOT - path used when STORAGE_DRIVER=local (ignored on Cloud Run unless using persistent storage)

Quick deploy (local, PowerShell)

1. Authenticate and set project:

   gcloud auth login; gcloud config set project long-operator-466309-g6

2. From repository root run the included script:

   powershell -ExecutionPolicy Bypass -File SimpalaHR/backend/deploy_cloud_run.ps1 -Project long-operator-466309-g6 -Region us-central1 -Service simpala-backend

Notes and recommendations

- Cloud Run is stateless: do not rely on local filesystem for persistent storage. Use Cloud Storage or S3 for document storage and set `STORAGE_DRIVER=s3`.

- Provide `DATABASE_URL` pointing to a Cloud SQL Postgres instance (use the Cloud SQL Auth proxy or private IP and configure VPC connector for Cloud Run).

- Secrets: use Secret Manager and mount secrets as environment variables via `gcloud run deploy --set-secrets` or via Cloud Console.

- Health check endpoint: the Dockerfile exposes port 3001 and a health endpoint at `/api/health`.

- If you want Cloud Build to run automatically on pushes, create a Cloud Build trigger that references `cloudbuild.yaml`.

Troubleshooting

- If the service fails during startup, examine logs:

   gcloud logs read --project long-operator-466309-g6 --limit 50 --severity ERROR

   gcloud run logs read simpala-backend --project long-operator-466309-g6 --region us-central1

   Creating secrets and Cloud SQL example

   1. Create Secret Manager secrets (locally or CI) for DATABASE_URL and JWT_SECRET:

   ```powershell
   gcloud secrets create prod-database-url --replication-policy="automatic" --project long-operator-466309-g6
   echo -n "postgres://user:pass@host:5432/db" | gcloud secrets versions add prod-database-url --data-file=- --project long-operator-466309-g6

   gcloud secrets create prod-jwt-secret --replication-policy="automatic" --project long-operator-466309-g6
   echo -n "your-jwt-secret" | gcloud secrets versions add prod-jwt-secret --data-file=- --project long-operator-466309-g6
   ```

   2. Deploy to Cloud Run using the deploy script and attach the secrets. If you use Cloud SQL, pass your instance connection name (PROJECT:REGION:INSTANCE) and optionally a VPC connector:

   ```powershell
   powershell -ExecutionPolicy Bypass -File SimpalaHR/backend/deploy_cloud_run.ps1 -Project long-operator-466309-g6 -Region us-central1 -Service simpala-backend -DatabaseSecret prod-database-url -JwtSecret prod-jwt-secret -CloudSqlInstance "long-operator-466309-g6:us-central1:my-db" -VpcConnector "projects/long-operator-466309-g6/locations/us-central1/connectors/svc-vpc-connector"
   ```

   Notes:

   - When using `--add-cloudsql-instances`, also make sure the Cloud Run service's runtime service account has the `roles/cloudsql.client` role.

   - If using private IP for Cloud SQL, create and configure a Serverless VPC connector and give Cloud Run the `--vpc-connector` option.

   Private Cloud SQL helper script

   A small helper script was added at `SimpalaHR/backend/setup_private_cloudsql.ps1`. It prints and runs the recommended `gcloud` commands to:

   - create/repair a Serverless VPC Access connector and wait until it's READY
   - attempt an in-place conversion of an existing public Cloud SQL instance to private IP (may fail)
   - create a new private-IP Cloud SQL instance as a safe fallback, create DB and user, and show commands to update Secret Manager and redeploy Cloud Run

   Run the helper from PowerShell (gcloud must be authenticated and configured for `long-operator-466309-g6`):

   ```powershell
   .\SimpalaHR\backend\setup_private_cloudsql.ps1 -ProjectId "long-operator-466309-g6" -Region "us-central1"
   ```

   Notes:

   - In-place conversion of an existing public Cloud SQL instance may be unsupported depending on instance state; the script will fall back to creating a new private instance.
   - The script prints the exact `gcloud` commands to update `prod-database-url` in Secret Manager and how to redeploy Cloud Run with the `--vpc-connector` flag.

