# Quick Deployment Guide for Development

## TL;DR - Fastest Way to Deploy

```powershell
# From D:\HR directory
.\deploy-dev.ps1 -Service backend    # Deploy backend (5-8 minutes)


.\deploy-dev.ps1 -Service frontend   # Deploy frontend (5-8 minutes  
.\deploy-dev.ps1                     # Deploy both (10-15 minutes)
```

## Why This is Faster

| Method | Time | Pros | Cons |
|--------|------|------|------|
| **deploy-dev.ps1** | 5-8 min | âœ… Fast<br>âœ… Works now<br>âœ… No upload delay | âŒ Needs Docker Desktop running |
| GitHub Actions | 20-30 min | âœ… Full CI/CD<br>âœ… Automated tests<br>âœ… Deployment history | âŒ Slow for development |

## Prerequisites

1. **Docker Desktop** must be running
2. **Google Cloud SDK** installed and authenticated  
3. **Project** set to `long-operator-466309-g6`

```powershell
# Verify setup
docker ps                           # Should not error
gcloud auth list                    # Should show your account
gcloud config get-value project     # Should show long-operator-466309-g6
```

## How It Works

The `deploy-dev.ps1` script:

1. **Builds** Docker image locally from monorepo root
2. **Pushes** image to Google Container Registry (GCR)
3. **Deploys** to Cloud Run

```
D:\HR (monorepo root)
â”œâ”€â”€ packages/              â† Shared code
â””â”€â”€ SimpalaHR/
    â”œâ”€â”€ backend/
    â”‚   â””â”€â”€ Dockerfile     â† Uses ../.. (monorepo root) as build context
    â””â”€â”€ frontend/
        â””â”€â”€ Dockerfile     â† Uses ../.. (monorepo root) as build context
```

## Current Deployment Status

**Your companyId fix** is ready to deploy:

```powershell
# 1. Deploy backend with the fix
.\deploy-dev.ps1 -Service backend

# 2. Wait 5-8 minutes

# 3. Test the fix
# - Log out and log in again (to get companyId in localStorage)
# - Go to Settings â†’ Leave Type Management
# - Try creating a leave type
# - Should work without 404 error!
```

## Common Issues & Fixes

### Issue: "Docker daemon not running"

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start (whale icon in system tray)
3. Run deployment again

### Issue: "Permission denied"

**Solution:**
```powershell
gcloud auth login
gcloud auth configure-docker
```

### Issue: "Build context too large"

This is normal - the monorepo is ~4 MB. The scripts use `.dockerignore` to exclude unnecessary files.

### Issue: PowerShell shows weird characters

This is just emoji rendering in Windows Terminal. It doesn't affect functionality.

##Usage Examples

### Example 1: Fix a Backend Bug

```powershell
# 1. Make your code changes
code SimpalaHR/backend/src/controllers/auth.controller.ts

# 2. Deploy just backend (5 minutes)
.\deploy-dev.ps1 -Service backend

# 3. Test immediately
$BACKEND = "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1"
Invoke-RestMethod "$BACKEND/health"

# 4. If working, commit
git add -A
git commit -m "fix: description"
git push origin dev   # GitHub Actions runs for final deployment
```

### Example 2: Update Frontend UI

```powershell
# 1. Make UI changes
code SimpalaHR/frontend/src/components/admin/LeaveTypeManagement.tsx

# 2. Deploy just frontend (5 minutes)
.\deploy-dev.ps1 -Service frontend

# 3. Test in browser
start https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app

# 4. If working, commit
git add -A
git commit -m "feat: description"
git push origin dev
```

### Example 3: Full Stack Changes

```powershell
# 1. Make changes to both backend and frontend

# 2. Deploy both (10-15 minutes)
.\deploy-dev.ps1

# 3. Test end-to-end

# 4. Commit
git add -A
git commit -m "feat: description"
git push origin dev
```

## Deployment Workflow Recommendation

**During Active Development:**
1. Use `.\deploy-dev.ps1` for rapid iteration (5-8 min per deploy)
2. Test immediately after deployment
3. Iterate quickly (fix â†’ deploy â†’ test â†’ repeat)

**When Feature is Complete:**
1. Commit all changes
2. Push to GitHub
3. Let GitHub Actions run full CI/CD pipeline (20-30 min)
4. This runs tests, builds, and creates deployment history

**Benefits:**
- âš¡ Fast development cycle (5-8 min vs 20-30 min)
- ðŸ§ª Still get full CI/CD validation before production
- ðŸ“Š GitHub Actions provides deployment history and logs
- ðŸ”’ Production deployments remain safe and tested

## Services URLs

After deployment:

- **Backend**: https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app
- **Frontend**: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app

## Viewing Logs

```powershell
# Backend logs
gcloud run services logs read simpalahr-backend-dev --region=us-central1 --limit=50

# Frontend logs
gcloud run services logs read simpalahr-frontend-dev --region=us-central1 --limit=50

# Follow logs in real-time
gcloud run services logs tail simpalahr-backend-dev --region=us-central1
```

## Troubleshooting Deployments

### Check Cloud Run Service Status

```powershell
gcloud run services list --region=us-central1 --filter="name:simpala*"
```

### Check Recent Deployments

```powershell
gcloud run revisions list --service=simpalahr-backend-dev --region=us-central1 --limit=5
```

### Roll Back to Previous Version

```powershell
# List revisions
gcloud run revisions list --service=simpalahr-backend-dev --region=us-central1

# Roll back
gcloud run services update-traffic simpalahr-backend-dev --region=us-central1 --to-revisions=<REVISION_NAME>=100
```

## Summary

- **Use `deploy-dev.ps1`** during active development for 5-8 minute deploys
- **Use GitHub Actions** for final validation and production
- **Test immediately** after deployment - don't wait for full CI/CD
- **Commit working code** and let GitHub Actions provide the audit trail

This gives you the **speed of direct deployment** with the **safety of CI/CD** for production! ðŸš€

