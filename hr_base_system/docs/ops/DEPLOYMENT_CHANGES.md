# Deployment changes and actions (Cloud Run)

This file documents the changes made to enable deploying the SimpalaHR backend
to Google Cloud Run (project: `long-operator-466309-g6`) and the commands we
ran during the process. Commit includes code and infra changes performed on
the date 2025-10-23.

Summary of repository changes

- `cloudbuild.yaml` — Cloud Build config to build and push Docker image to GCR.

- `deploy_cloud_run.ps1` — PowerShell script to build via Cloud Build and deploy
  to Cloud Run. Supports attaching Secret Manager secrets and Cloud SQL.

- `CLOUD_RUN_DEPLOYMENT.md` — longer documentation and example commands.

- `Dockerfile` — small fix: update CMD to `node dist/src/index.js` (compiled JS
  lives under `dist/src` with current tsconfig).

Infra actions taken (executed via gcloud from local dev machine)

1. Enabled required APIs:

   - run.googleapis.com, containerregistry.googleapis.com, secretmanager.googleapis.com,
     sqladmin.googleapis.com, vpcaccess.googleapis.com

2. Created a runtime service account for Cloud Run:
   - `simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com`
   - Granted roles: `roles/secretmanager.secretAccessor`, `roles/cloudsql.client`,
     `roles/logging.logWriter`, `roles/monitoring.metricWriter`.

3. Created Secret Manager secrets (initially empty, then populated):
   - `prod-database-url` (populated with the generated DATABASE_URL)
   - `prod-jwt-secret` (populated with a generated JWT secret)

4. Cloud SQL (Postgres) — created a public IP instance for quick deployment:
   - Instance: `simpala-postgres` (Postgres 15)
   - DB: `simpala_db`
   - User: `simpala_user` (password generated and set)
   - Primary public IP: captured during creation and stored in `prod-database-url`.

5. Built and pushed the image via Cloud Build and deployed to Cloud Run:

  - Deployed service: `simpala-backend` (region `us-central1`)

  - Cloud Run service URL: `https://simpala-backend-85939737092.us-central1.run.app`

VPC connector attempts

- We attempted to create a Serverless VPC connector `simpala-vpc-connector` for
  private Cloud SQL access but ran into backend errors (connector entered an
  ERROR state and create calls returned ALREADY_EXISTS or internal errors). We
  deleted the failed connector and retried; it continued to fail.

- Because of that, the Cloud SQL instance was created with a public IP to
  allow the service to start quickly. Recommend reattempting connector creation
  later or creating it via Cloud Console if you require private IP access.

Commands run (representative, executed from local PowerShell)
--- create SA and grant roles
gcloud iam service-accounts create simpala-backend-run-sa --display-name "Simpala Backend Run SA" --project long-operator-466309-g6
gcloud projects add-iam-policy-binding long-operator-466309-g6 --member="serviceAccount:simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding long-operator-466309-g6 --member="serviceAccount:simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding long-operator-466309-g6 --member="serviceAccount:simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com" --role="roles/logging.logWriter"
gcloud projects add-iam-policy-binding long-operator-466309-g6 --member="serviceAccount:simpala-backend-run-sa@long-operator-466309-g6.iam.gserviceaccount.com" --role="roles/monitoring.metricWriter"

--- create empty secrets
gcloud secrets create prod-database-url --replication-policy="automatic" --project long-operator-466309-g6
gcloud secrets create prod-jwt-secret --replication-policy="automatic" --project long-operator-466309-g6

--- create Cloud SQL (public IP quick-start)
gcloud sql instances create simpala-postgres --database-version=POSTGRES_15 --tier=db-f1-micro --region=us-central1 --project long-operator-466309-g6
```powershell
gcloud sql users create simpala_user --instance=simpala-postgres --password="<generated-password>" --host="%" --project long-operator-466309-g6
```
gcloud sql databases create simpala_db --instance=simpala-postgres --project long-operator-466309-g6

--- populate secrets (example)

```powershell
echo -n "postgres://simpala_user:\<pw\>@\<PUBLIC_IP\>:5432/simpala_db" | gcloud secrets versions add prod-database-url --data-file=- --project long-operator-466309-g6
echo -n "\<jwt-secret\>" | gcloud secrets versions add prod-jwt-secret --data-file=- --project long-operator-466309-g6
```

--- build & deploy (the repo contains `deploy_cloud_run.ps1` which wraps these steps)
powershell -ExecutionPolicy Bypass -File SimpalaHR/backend/deploy_cloud_run.ps1 -Project long-operator-466309-g6 -Region us-central1 -Service simpala-backend -DatabaseSecret prod-database-url -JwtSecret prod-jwt-secret -CloudSqlInstance "long-operator-466309-g6:us-central1:simpala-postgres"

Notes & follow-ups

- Migrate Cloud SQL to private IP + VPC connector when the connector is healthy.

- Add a Cloud Build trigger to run `cloudbuild.yaml` automatically on push.

- Harden runtime SA permissions further if needed and configure monitoring/alerts.

If you want, I can now create the Cloud Build trigger and/or add a `docker-compose.test.yml` to run integration tests locally against a test Postgres.
