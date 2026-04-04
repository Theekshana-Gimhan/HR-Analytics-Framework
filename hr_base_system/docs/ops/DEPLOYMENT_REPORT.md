# Deployment report — SimpalaHR backend (Cloud Run)

Date: 2025-10-24

## Summary

This document records the end-to-end Cloud Run deployment and private Cloud SQL migration work performed for the SimpalaHR backend in project `long-operator-466309-g6`. It documents changes made to the repository, secret management activity, verification steps, and recommended next actions.

## High-level outcome

- Backend deployed to Cloud Run (managed) at:

  - https://simpala-backend-85939737092.us-central1.run.app

- Cloud SQL instance `simpala-postgres` is reachable over private IP `10.33.0.6` from Cloud Run via Serverless VPC Access connector `simpala-vpc-connector`.

- Secret Manager: `prod-database-url` now has a canonical working version (version 13) used by Cloud Run.

- Smoke test `/api/smoke-db` executed successfully (Prisma SELECT 1 returned 1).

## Files added or modified

- `package.json`: removed an incorrect runtime dependency to ensure builds succeed in Cloud Build.

- `scripts/fix_secret_from_version.py`: Python helper that reads a DB URL from stdin, URL-encodes the password, forces the host to `10.33.0.6` and writes a canonical `postgresql://` URL to a temp file (prints the temp file path only).

- `scripts/update_prod_database_secret.ps1`: PowerShell helper to safely write a canonical DB URL to Secret Manager (writes to a temp file, calls `gcloud secrets versions add`, optionally redeploys Cloud Run using `deploy_cloud_run.ps1`).

- `scripts/cleanup_secret_versions.ps1`: PowerShell helper to list and disable/destroy older secret versions while keeping the newest N versions. Interactive by default; supports `-AutoApprove`.

- `SECRET_UPDATE.md`: Documentation on the safe secret-update procedure and recommendations.

- `.github/workflows/update-secret.yml`: GitHub Actions template demonstrating a secure, manual `workflow_dispatch` approach for updating `prod-database-url` from CI.

- `DEPLOYMENT_REPORT.md` (this file): the comprehensive report.

## Secret Manager activity

Secret: `prod-database-url` (project: `long-operator-466309-g6`)

Versions observed (newest first): 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1

- Version 13: canonical working secret created during this session and is now `latest`.

- Version 12: earlier canonicalization attempt.

- Version 11..2: iterative attempts during debugging (some earlier versions were malformed due to PowerShell interpolation in ad-hoc commands). Do NOT rely on older versions except for diagnostics; they are available in Secret Manager history.

Important: no secret plaintext is contained in this repository or this report. Secrets were only used locally and via `gcloud secrets` commands.

## Deployment steps performed (high level)

1. Fixed `package.json` to remove a runtime dependency that caused Cloud Build failures.

2. Built the container via Cloud Build and pushed to Container Registry.

3. Created robust scripts to canonicalize and update `prod-database-url`:

   - used `scripts/fix_secret_from_version.py` to parse latest existing secret and write a canonical `postgresql://...` URL to a temp file, then added as a new secret version.

   - when the first canonical version used invalid credentials, parsed version 1 (original credentials) and produced the working canonical version (v13).

4. Deployed the Cloud Run service with `--set-secrets "DATABASE_URL=prod-database-url:latest,JWT_SECRET=prod-jwt-secret:latest"` and `--vpc-connector=simpala-vpc-connector`.

5. Verified by calling `/api/debug-db` and `/api/smoke-db` on the service URL. The smoke endpoint returned { ok: true, dbResult: 1 }.

## Key commands executed (examples — do NOT paste secrets here)

- List secret versions:

  - `gcloud secrets versions list prod-database-url --project=long-operator-466309-g6`

- Inspect a version safely (no plaintext printed, only metadata):

  - `gcloud secrets versions access 11 --secret=prod-database-url --project=... | python -c "...diagnostics..."`

- Create canonical temp file and add as new version (used helper script):

  - `gcloud secrets versions access 11 --secret=prod-database-url | python scripts/fix_secret_from_version.py` (prints temp file path)

  - `gcloud secrets versions add prod-database-url --data-file=<tempfile> --project=...`

- Update using helper (safe, PowerShell):

  - `.\scripts\update_prod_database_secret.ps1 -Project long-operator-466309-g6 -Username <user> -Password '<pwd>' -DbName simpala_db -Deploy`

- Deploy to Cloud Run (example used):

  - `gcloud run deploy simpala-backend --image gcr.io/<project>/simpala-backend:<tag> --set-secrets "DATABASE_URL=prod-database-url:latest,JWT_SECRET=prod-jwt-secret:latest" --vpc-connector simpala-vpc-connector --region us-central1 --platform managed`

## Verification

- `/api/debug-db` returned: hasDatabaseUrl: true, startsWithPostgres: true

- `/api/smoke-db` returned: ok: true, dbResult: 1

## Notes / recommendations

1. Keep version 13 as the canonical secret. Consider disabling older versions you no longer need. Use `scripts/cleanup_secret_versions.ps1` to disable older versions interactively and keep the newest N.

2. Prefer `gcloud secrets versions add --data-file=<file>` over passing secret values directly on the command line in PowerShell to avoid interpolation issues.

3. Add CI that uses `workflow_dispatch` and a short, audited service-account key (see `.github/workflows/update-secret.yml`) to update secrets in an auditable manner. Keep the password in the CI secret store (e.g., GitHub Secrets) and do not echo it.

4. Consider role-restricted service accounts and Secret Manager IAM (Secret Manager Admin vs Secret Manager Secret Accessor) to enforce least privilege.

5. Audit logs: enable/verify audit logs for Secret Manager and Cloud Run deploy operations.

## Next steps I can do for you

- Run `scripts/cleanup_secret_versions.ps1 -Project long-operator-466309-g6 -SecretName prod-database-url -Keep 3` interactively and disable older versions (recommended).

- Add a small CI job to automatically redeploy Cloud Run after secret rotation (if desired).

- Create a short `ops/README.md` or add to docs explaining how to rotate the DB password and test deploy in staging.

## Frontend deployment

- Deployed frontend to Cloud Run as service `simpala-frontend`.
- Image: `gcr.io/long-operator-466309-g6/simpala-frontend:20251024132720`
- Service URL: https://simpala-frontend-85939737092.us-central1.run.app

Notes:
- The frontend was built with Vite and served from nginx in a small container. It uses SPA fallback (index.html) for client-side routing.
- If the frontend needs a runtime-configured API URL, consider baking an environment variable during build or implementing a small runtime config fetch (e.g., /config.json) served from the container and written at deploy time.

## Contact

If you want me to proceed with cleanup (disable or destroy old versions) or to push these changes to your GitHub origin, say the word and I'll commit and push now.
Deployment report — SimpalaHR backend (Cloud Run)

Date: 2025-10-24

Summary
-------
This document records the end-to-end Cloud Run deployment and private Cloud SQL migration work performed for the SimpalaHR backend in project `long-operator-466309-g6`. It documents changes made to the repository, secret management activity, verification steps, and recommended next actions.

High-level outcome
- Backend deployed to Cloud Run (managed) at:
  - https://simpala-backend-85939737092.us-central1.run.app
- Cloud SQL instance `simpala-postgres` is reachable over private IP `10.33.0.6` from Cloud Run via Serverless VPC Access connector `simpala-vpc-connector`.
- Secret Manager: `prod-database-url` now has a canonical working version (version 13) used by Cloud Run.
- Smoke test `/api/smoke-db` executed successfully (Prisma SELECT 1 returned 1).

Files added or modified
- package.json: removed an incorrect runtime dependency to ensure builds succeed in Cloud Build.
- scripts/fix_secret_from_version.py: Python helper that reads a DB URL from stdin, URL-encodes the password, forces the host to `10.33.0.6` and writes a canonical `postgresql://` URL to a temp file (prints the temp file path only).
- scripts/update_prod_database_secret.ps1: PowerShell helper to safely write a canonical DB URL to Secret Manager (writes to a temp file, calls `gcloud secrets versions add`, optionally redeploys Cloud Run using `deploy_cloud_run.ps1`).
- scripts/cleanup_secret_versions.ps1: PowerShell helper to list and disable/destroy older secret versions while keeping the newest N versions. Interactive by default; supports `-AutoApprove`.
- SECRET_UPDATE.md: Documentation on the safe secret-update procedure and recommendations.
- .github/workflows/update-secret.yml: GitHub Actions template demonstrating a secure, manual `workflow_dispatch` approach for updating `prod-database-url` from CI.
- DEPLOYMENT_REPORT.md (this file): the comprehensive report.

Secret Manager activity
-----------------------
Secret: `prod-database-url` (project: `long-operator-466309-g6`)

Versions observed (newest first): 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1

- Version 13: canonical working secret created during this session and is now `latest`.
- Version 12: earlier canonicalization attempt.
- Version 11..2: iterative attempts during debugging (some earlier versions were malformed due to PowerShell interpolation in ad-hoc commands). Do NOT rely on older versions except for diagnostics; they are available in Secret Manager history.

Important: no secret plaintext is contained in this repository or this report. Secrets were only used locally and via `gcloud secrets` commands.

Deployment steps performed (high level)
-------------------------------------
1. Fixed `package.json` to remove a runtime dependency that caused Cloud Build failures.
2. Built the container via Cloud Build and pushed to Container Registry.
3. Created robust scripts to canonicalize and update `prod-database-url`:
   - used `scripts/fix_secret_from_version.py` to parse latest existing secret and write a canonical `postgresql://...` URL to a temp file, then added as a new secret version.
   - when the first canonical version used invalid credentials, parsed version 1 (original credentials) and produced the working canonical version (v13).
4. Deployed the Cloud Run service with `--set-secrets "DATABASE_URL=prod-database-url:latest,JWT_SECRET=prod-jwt-secret:latest"` and `--vpc-connector=simpala-vpc-connector`.
5. Verified by calling `/api/debug-db` and `/api/smoke-db` on the service URL. The smoke endpoint returned { ok: true, dbResult: 1 }.

Key commands executed (examples — do NOT paste secrets here)
- List secret versions:
  - `gcloud secrets versions list prod-database-url --project=long-operator-466309-g6`
- Inspect a version safely (no plaintext printed, only metadata):
  - `gcloud secrets versions access 11 --secret=prod-database-url --project=... | python -c "...diagnostics..."`
- Create canonical temp file and add as new version (used helper script):
  - `gcloud secrets versions access 11 --secret=prod-database-url | python scripts/fix_secret_from_version.py` (prints temp file path)
  - `gcloud secrets versions add prod-database-url --data-file=<tempfile> --project=...`
- Update using helper (safe, PowerShell):
  - `.\scripts\update_prod_database_secret.ps1 -Project long-operator-466309-g6 -Username <user> -Password '<pwd>' -DbName simpala_db -Deploy`
- Deploy to Cloud Run (example used):
  - `gcloud run deploy simpala-backend --image gcr.io/<project>/simpala-backend:<tag> --set-secrets "DATABASE_URL=prod-database-url:latest,JWT_SECRET=prod-jwt-secret:latest" --vpc-connector simpala-vpc-connector --region us-central1 --platform managed`

Verification
- `/api/debug-db` returned: hasDatabaseUrl: true, startsWithPostgres: true
- `/api/smoke-db` returned: ok: true, dbResult: 1

Notes / recommendations
-----------------------
1. Keep version 13 as the canonical secret. Consider disabling older versions you no longer need. Use `scripts/cleanup_secret_versions.ps1` to disable older versions interactively and keep the newest N.
2. Prefer `gcloud secrets versions add --data-file=<file>` over passing secret values directly on the command line in PowerShell to avoid interpolation issues.
3. Add CI that uses `workflow_dispatch` and a short, audited service-account key (see `.github/workflows/update-secret.yml`) to update secrets in an auditable manner. Keep the password in the CI secret store (e.g., GitHub Secrets) and do not echo it.
4. Consider role-restricted service accounts and Secret Manager IAM (Secret Manager Admin vs Secret Manager Secret Accessor) to enforce least privilege.
5. Audit logs: enable/verify audit logs for Secret Manager and Cloud Run deploy operations.

Next steps I can do for you
- Run `scripts/cleanup_secret_versions.ps1 -Project long-operator-466309-g6 -SecretName prod-database-url -Keep 3` interactively and disable older versions (recommended).
- Add a small CI job to automatically redeploy Cloud Run after secret rotation (if desired).
- Create a short `ops/README.md` or add to docs explaining how to rotate the DB password and test deploy in staging.

Contact
If you want me to proceed with cleanup (disable or destroy old versions) or to push these changes to your GitHub origin, say the word and I'll commit and push now.
