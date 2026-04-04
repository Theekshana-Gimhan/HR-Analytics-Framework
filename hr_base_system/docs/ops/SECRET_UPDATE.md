# Safe Secret Update & Redeploy (backend)

This document explains the recommended safe workflow for updating the `prod-database-url` secret and redeploying the backend to Cloud Run.

Why this matters
- Avoid PowerShell or shell interpolation that can corrupt the connection string.
- Ensure passwords are URL-encoded.
- Keep secret updates auditable (Secret Manager versions) and avoid accidentally exposing secrets in logs.

Quick safe update (local)
1. Run the helper script to add a new secret version and redeploy:

```powershell
# from d:/HR/SimpalaHR/backend
.\scripts\update_prod_database_secret.ps1 -Project long-operator-466309-g6 -Username simpala_user -Password 'Your$tr0ngP@ss' -DbName simpala_db -Deploy
```

This will:
- URL-encode the password.
- Write a temporary file containing the canonical `postgresql://...` URL.
- Add it as a new version to `prod-database-url` in Secret Manager.
- Optionally call the repository `deploy_cloud_run.ps1` helper to build and deploy the service so it picks up the latest secret.

CI / GitHub Actions (template)
- A template workflow is provided at `.github/workflows/update-secret.yml` that demonstrates how to securely run the same operation from CI using a service account key stored in GitHub Secrets. Use this with care and require manual `workflow_dispatch` approval.

Cleaning up old versions
- Use `scripts/cleanup_secret_versions.ps1` to list and optionally disable or destroy older secret versions while keeping the latest N versions.

Example:

```powershell
.\scripts\cleanup_secret_versions.ps1 -Project long-operator-466309-g6 -SecretName prod-database-url -Keep 3
```

Notes
- Disabling is safer than destroying because disabled versions can be re-enabled in limited cases; destroying is irreversible.
- Always test a new secret version in a staging environment before updating prod.
