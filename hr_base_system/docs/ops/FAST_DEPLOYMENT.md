# Fast Development Deployment Guide

## Overview

Instead of waiting 20-30 minutes for GitHub Actions CI/CD, you can deploy directly to Cloud Run in **5-10 minutes** during active development.

## Prerequisites

1. **Docker Desktop** running (for `deploy-dev.ps1`)
2. **Google Cloud SDK** installed and authenticated
3. **Project access** to `simpala-hr`

```powershell
# Verify authentication
gcloud auth list

# Set project
gcloud config set project simpala-hr
```

## Option 1: Ultra-Fast Deploy (RECOMMENDED for Dev) âš¡

**Time: ~5-7 minutes**

Uses Cloud Build to build and deploy in one command. No local Docker needed!

```powershell
# Deploy both services
.\quick-deploy.ps1

# Deploy only backend
.\quick-deploy.ps1 -Service backend

# Deploy only frontend
.\quick-deploy.ps1 -Service frontend
```

**How it works:**
- Uploads source code to Cloud Build
- Cloud Build builds Docker images
- Deploys to Cloud Run
- No local Docker build needed
- Faster than local builds

## Option 2: Local Docker Build & Deploy

**Time: ~8-12 minutes**

Builds Docker images locally, then pushes to GCR and deploys.

```powershell
# Deploy both services
.\deploy-dev.ps1

# Deploy only backend
.\deploy-dev.ps1 -Service backend

# Deploy only frontend
.\deploy-dev.ps1 -Service frontend
```

**Use this when:**
- Testing Dockerfile changes
- Debugging build issues
- Need more control over build process

## Quick Fix Workflow

For rapid iteration during bug fixes:

```powershell
# 1. Make your code changes
code SimpalaHR/backend/src/controllers/auth.controller.ts

# 2. Quick deploy backend only
.\quick-deploy.ps1 -Service backend

# 3. Test immediately (5 minutes later)
curl https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1/health

# 4. If working, commit
git add -A
git commit -m "fix: your fix description"
git push origin dev
```

## Deployment URLs

After deployment completes:

- **Backend**: https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app
- **Frontend**: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app

## When to Use Each Method

### Use Quick Deploy (`quick-deploy.ps1`) when:
- âœ… Actively developing and testing
- âœ… Need fast iteration cycles
- âœ… Fixing bugs
- âœ… Testing API changes
- âœ… Don't need full CI/CD pipeline

### Use GitHub Actions when:
- âœ… Ready for QA testing
- âœ… Deploying to production
- âœ… Need automated tests
- âœ… Want deployment history
- âœ… Team collaboration

### Use Local Docker Deploy (`deploy-dev.ps1`) when:
- âœ… Debugging Docker build issues
- âœ… Testing Dockerfile changes
- âœ… Need to inspect built images locally
- âœ… Offline development with later push

## Troubleshooting

### Error: "Permission denied"

```powershell
# Re-authenticate
gcloud auth login
gcloud auth configure-docker
```

### Error: "Docker daemon not running"

For `deploy-dev.ps1` only:
1. Start Docker Desktop
2. Wait for it to fully start
3. Run deployment again

Or use `quick-deploy.ps1` instead (no Docker needed)

### Error: "Build failed"

Check logs:
```powershell
# View Cloud Build logs
gcloud builds list --limit=5 --project=simpala-hr

# View specific build
gcloud builds log <BUILD_ID>
```

### Error: "Cloud Run deployment failed"

Check service logs:
```powershell
# Backend logs
gcloud run services logs read simpalahr-backend-dev --region=us-central1 --limit=50

# Frontend logs
gcloud run services logs read simpalahr-frontend-dev --region=us-central1 --limit=50
```

## Environment Variables

Deployments use these environment variables:

**Backend:**
- `NODE_ENV=production`
- `DATABASE_URL` (from Secret Manager)
- `JWT_SECRET` (from Secret Manager)

**Frontend:**
- `VITE_API_BASE_URL=https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1`

## Deployment Time Comparison

| Method | Time | Use Case |
|--------|------|----------|
| **Quick Deploy** | 5-7 min | âš¡ Active development |
| **Local Docker** | 8-12 min | ðŸ› Docker debugging |
| **GitHub Actions** | 20-30 min | ðŸš€ QA/Production |

## Best Practice for Development

1. **Use Quick Deploy for iteration** (multiple times per day)
   ```powershell
   # Fix code â†’ quick deploy â†’ test â†’ repeat
   .\quick-deploy.ps1 -Service backend
   ```

2. **Commit working changes**
   ```powershell
   git add -A
   git commit -m "fix: description"
   git push origin dev
   ```

3. **Let GitHub Actions run for final validation**
   - Runs tests
   - Updates deployment history
   - Team visibility

## Current Fix Deployment

For the **companyId fix** you just made:

```powershell
# 1. Commit your changes
git add -A
git commit -m "fix: add companyId to login response and use localStorage"

# 2. Quick deploy backend (companyId fix is there)
.\quick-deploy.ps1 -Service backend

# 3. Wait 5-7 minutes

# 4. Test the fix
# Log out and log in again to get companyId in localStorage
# Try creating a leave type

# 5. If working, push to trigger GitHub Actions for final deployment
git push origin dev
```

## Tips for Speed

1. **Deploy only what changed**
   - Backend changes? `.\quick-deploy.ps1 -Service backend`
   - Frontend changes? `.\quick-deploy.ps1 -Service frontend`

2. **Skip commit during iteration**
   - Make change â†’ quick deploy â†’ test
   - Only commit when it works

3. **Use Cloud Build logs for debugging**
   ```powershell
   # Watch build in real-time
   gcloud builds log --stream $(gcloud builds list --limit=1 --format="value(id)")
   ```

4. **Keep Docker Desktop closed** if using `quick-deploy.ps1`
   - Saves RAM
   - Faster startup

## Summary

- ðŸš€ **Development**: Use `quick-deploy.ps1` (5-7 minutes)
- ðŸ”§ **Docker Issues**: Use `deploy-dev.ps1` (8-12 minutes)
- âœ… **Production**: Use GitHub Actions (20-30 minutes)

This way you get **instant feedback** during development without sacrificing the **robust CI/CD pipeline** for production deployments!

