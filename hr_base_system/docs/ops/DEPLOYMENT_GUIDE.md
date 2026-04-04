# Deployment Guide - SimpalaHR

This guide provides comprehensive instructions for deploying the SimpalaHR application to Google Cloud Platform using the automated CI/CD pipeline.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Required Secrets](#required-secrets)
- [Deployment Workflows](#deployment-workflows)
- [Manual Deployment](#manual-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Overview

The application uses a multi-stage deployment pipeline:

1. **CI Pipeline** - Automated testing and validation
2. **Build** - Docker image creation
3. **Deploy** - Cloud Run deployment with health checks
4. **Verification** - Automated health and smoke tests

### Architecture

- **Backend**: Node.js/Express API deployed to Cloud Run
- **Frontend**: React SPA with Nginx deployed to Cloud Run
- **Database**: PostgreSQL (managed by Cloud SQL or external provider)
- **Container Registry**: Google Artifact Registry

---

## Prerequisites

### 1. GCP Project Setup

#### Development Environment
- **Project ID**: `long-operator-466309-g6`
- **Region**: `us-central1`
- **Service Account**: `github-actions-dev@long-operator-466309-g6.iam.gserviceaccount.com`

#### Production Environment
- **Project ID**: `start-project-466908`
- **Region**: `us-central1`
- **Service Account**: `github-actions-prod@start-project-466908.iam.gserviceaccount.com`

### 2. Required GCP Services

Enable the following APIs in your GCP project:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com
```

### 3. Artifact Registry

Create the artifact registry repository:

```bash
# For Dev
gcloud artifacts repositories create simpalahr \
  --repository-format=docker \
  --location=us-central1 \
  --project=long-operator-466309-g6

# For Prod
gcloud artifacts repositories create simpalahr \
  --repository-format=docker \
  --location=us-central1 \
  --project=start-project-466908
```

### 4. Workload Identity Federation

Configure Workload Identity for GitHub Actions authentication:

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository_owner=='Mad-marketing-git'"
```

---

## Required Secrets

Configure these secrets in your GitHub repository:

**Settings â†’ Secrets and variables â†’ Actions â†’ New repository secret**

### Development Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DEV_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `DEV_JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secure-random-string-here` |
| `DEV_BACKEND_URL` | Backend API URL (optional) | `https://simpalahr-backend-dev-xxx.run.app/api/v1` |

### Production Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `PROD_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `PROD_JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secure-random-string-here` |
| `PROD_BACKEND_URL` | Backend API URL (required) | `https://simpalahr-backend-prod-xxx.run.app/api/v1` |

### Generating Secure Secrets

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Deployment Workflows

### Automatic Deployment

#### Development Environment

Automatically deploys when code is pushed to the `dev` branch:

```bash
git checkout dev
git add .
git commit -m "feat: your changes"
git push origin dev
```

#### Production Environment

Automatically deploys when code is pushed to the `main` branch:

```bash
git checkout main
git merge dev
git push origin main
```

### Manual Deployment

You can trigger deployments manually from the GitHub Actions UI:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Development** or **Deploy to Production**
3. Click **Run workflow**
4. Choose the branch
5. Optionally skip CI checks (not recommended)

### Workflow Steps

Each deployment follows these steps:

1.  **CI Checks**
   - Lint backend and frontend
   - Run unit tests
   - Build TypeScript
   - Validate Docker builds

2.  **Build Images**
   - Build backend Docker image
   - Build frontend Docker image
   - Push to Artifact Registry
   - Tag with: `latest`, `sha`, `short-sha`

3.  **Database Migrations**
   - Create temporary Cloud Run job
   - Run `prisma migrate deploy`
   - Clean up job

4.  **Deploy Services**
   - Deploy backend to Cloud Run
   - Deploy frontend to Cloud Run
   - Configure environment variables
   - Set resource limits

5.  **Health Checks**
   - Wait for services to stabilize
   - Check backend `/health` endpoint
   - Check frontend homepage
   - Run smoke tests (production only)

6.  **Deployment Summary**
   - Display service URLs
   - Show image tags
   - Provide rollback commands

---

## Manual Deployment

If you need to deploy manually without GitHub Actions:

### 1. Authenticate with GCP

```bash
gcloud auth login
gcloud config set project long-operator-466309-g6  # or start-project-466908
```

### 2. Build and Push Images

```bash
# Set variables
export PROJECT_ID="long-operator-466309-g6"
export REGION="us-central1"
export IMAGE_TAG="manual-$(date +%Y%m%d-%H%M%S)"

# Build backend
docker build \
  --build-arg NODE_ENV=production \
  -t us-central1-docker.pkg.dev/$PROJECT_ID/simpalahr/simpalahr-backend-dev:$IMAGE_TAG \
  -f SimpalaHR/backend/Dockerfile \
  .

# Build frontend
docker build \
  --build-arg VITE_API_BASE_URL="https://your-backend-url.run.app/api/v1" \
  -t us-central1-docker.pkg.dev/$PROJECT_ID/simpalahr/simpalahr-frontend-dev:$IMAGE_TAG \
  -f SimpalaHR/frontend/Dockerfile \
  .

# Push images
gcloud auth configure-docker us-central1-docker.pkg.dev
docker push us-central1-docker.pkg.dev/$PROJECT_ID/simpalahr/simpalahr-backend-dev:$IMAGE_TAG
docker push us-central1-docker.pkg.dev/$PROJECT_ID/simpalahr/simpalahr-frontend-dev:$IMAGE_TAG
```

### 3. Deploy to Cloud Run

```bash
# Deploy backend
gcloud run deploy simpalahr-backend-dev \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/simpalahr/simpalahr-backend-dev:$IMAGE_TAG \
  --platform managed \
  --region $REGION \
  --port 8080 \
  --timeout 300s \
  --memory 512Mi \
  --cpu 1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="your-database-url",JWT_SECRET="your-jwt-secret"

# Deploy frontend
gcloud run deploy simpalahr-frontend-dev \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/simpalahr/simpalahr-frontend-dev:$IMAGE_TAG \
  --platform managed \
  --region $REGION \
  --port 8080 \
  --timeout 60s \
  --memory 256Mi \
  --cpu 1 \
  --allow-unauthenticated
```

---

## Rollback Procedures

### Quick Rollback to Previous Revision

```bash
# Set environment
export PROJECT_ID="long-operator-466309-g6"  # or start-project-466908
export REGION="us-central1"
export SERVICE_NAME="simpalahr-backend-dev"  # or simpalahr-frontend-dev

# List revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION

# Rollback to previous revision
gcloud run services update-traffic $SERVICE_NAME \
  --to-revisions=PREVIOUS-REVISION-NAME=100 \
  --region=$REGION
```

### Rollback to Specific SHA

```bash
# Find the image tag/SHA you want to rollback to
export TARGET_SHA="abc1234"

# Deploy the specific version
gcloud run deploy simpalahr-backend-dev \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/simpalahr/simpalahr-backend-dev:$TARGET_SHA \
  --region=$REGION
```

### Emergency Rollback

If you need to rollback immediately:

1. **Go to GCP Console**: https://console.cloud.google.com/run
2. Select your service
3. Click on **REVISIONS & TRAFFIC** tab
4. Find the previous working revision
5. Click **MANAGE TRAFFIC**
6. Set previous revision to 100%
7. Click **SAVE**

---

## Monitoring and Logs

### View Logs

```bash
# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=simpalahr-backend-dev" \
  --limit 50 \
  --format json

# Frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=simpalahr-frontend-dev" \
  --limit 50 \
  --format json
```

### Cloud Run Metrics

Access metrics in the GCP Console:
- https://console.cloud.google.com/run/detail/{region}/{service}/metrics

Key metrics to monitor:
- Request count
- Request latency
- Error rate
- Container CPU utilization
- Container memory utilization
- Billable container time

---

## Troubleshooting

### Issue: Deployment Fails During CI

**Solution:**
1. Check the GitHub Actions logs
2. Ensure all tests are passing locally
3. Run `npm test` in both backend and frontend
4. Fix any linting errors: `npm run lint:fix`

### Issue: Database Migration Fails

**Solution:**
1. Check the migration job logs in GCP
2. Ensure `DATABASE_URL` secret is correctly set
3. Verify database connectivity
4. Run migrations manually:

```bash
# SSH into a Cloud Run instance or run locally
DATABASE_URL="your-db-url" npx prisma migrate deploy
```

### Issue: Health Check Fails

**Solution:**
1. Check if the service is running:
   ```bash
   gcloud run services describe simpalahr-backend-dev --region=us-central1
   ```
2. Check logs for errors
3. Verify environment variables are set correctly
4. Test the health endpoint manually:
   ```bash
   curl https://your-service-url.run.app/health
   ```

### Issue: Frontend Can't Connect to Backend

**Solution:**
1. Verify `PROD_BACKEND_URL` or `DEV_BACKEND_URL` secret is set correctly
2. Check CORS configuration in backend
3. Verify the frontend is using the correct API URL:
   ```bash
   # Check built frontend config
   docker run --rm your-frontend-image cat /usr/share/nginx/html/index.html | grep -o 'VITE_API_BASE_URL.*'
   ```
4. Update the secret and re-deploy

### Issue: Out of Memory Errors

**Solution:**
Increase memory allocation:

```bash
gcloud run services update simpalahr-backend-dev \
  --memory 1Gi \
  --region us-central1
```

### Issue: Slow Cold Starts

**Solution:**
Set minimum instances:

```bash
gcloud run services update simpalahr-backend-dev \
  --min-instances 1 \
  --region us-central1
```

---

## Cost Optimization

### Development Environment
- Min instances: 0 (scales to zero when idle)
- Max instances: 10
- Expected cost: ~$5-20/month

### Production Environment
- Min instances: 1 (always warm)
- Max instances: 100
- Expected cost: ~$50-200/month (depends on traffic)

### Cost Reduction Tips

1. **Use minimum instances wisely**: Set to 0 for dev, 1 for prod
2. **Optimize Docker images**: Multi-stage builds reduce size
3. **Set appropriate resource limits**: Don't over-provision
4. **Use Artifact Registry lifecycle policies**: Delete old images
5. **Monitor usage**: Set up billing alerts

```bash
# Set up billing alert
gcloud billing budgets create \
  --billing-account YOUR_BILLING_ACCOUNT_ID \
  --display-name "Monthly Cloud Run Budget" \
  --budget-amount 100 \
  --threshold-rule percent=50 \
  --threshold-rule percent=90
```

---

## Security Best Practices

1.  **Use Workload Identity** - Avoid storing GCP credentials
2.  **Rotate JWT secrets regularly** - Every 90 days
3.  **Use Cloud SQL Proxy** - For secure database connections
4.  **Enable VPC** - For production workloads
5.  **Use Secret Manager** - Instead of environment variables for sensitive data
6.  **Enable Cloud Armor** - For DDoS protection
7.  **Implement rate limiting** - Already configured in backend
8.  **Regular security audits** - Use `npm audit`

---

## Continuous Improvement

### Planned Enhancements

- [ ] Blue-green deployments
- [ ] Automated rollback on health check failure
- [ ] Performance testing in CI
- [ ] Infrastructure as Code (Terraform)
- [ ] Multi-region deployment
- [ ] CDN integration for frontend
- [ ] Database backup automation
- [ ] Disaster recovery plan

---

## Support

For deployment issues:

1. Check this documentation
2. Review GitHub Actions logs
3. Check GCP Cloud Run logs
4. Contact the DevOps team

**Emergency Contacts:**
- DevOps Lead: [Contact Info]
- On-Call Engineer: [Contact Info]

---

## Changelog

### 2025-11-03
-  Created comprehensive deployment guide
-  Implemented CI/CD pipeline with health checks
-  Added database migration automation
-  Configured multi-environment deployment
-  Added rollback procedures
-  Improved Docker builds with health checks

---

**Last Updated**: November 3, 2025
**Maintained By**: DevOps Team

