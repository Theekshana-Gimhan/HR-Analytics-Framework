# CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing, building, and deployment of SimpalaHR.

## Workflows Overview

### 1. CI Pipeline (`ci.yml`)

**Purpose**: Automated testing and validation for all code changes

**Triggers**:
- Pull requests to `dev` or `main`
- Pushes to `dev` or `main`
- Called by deployment workflows

**Jobs**:
- ✅ Lint backend (ESLint, Prettier)
- ✅ Test backend (Jest with PostgreSQL)
- ✅ Lint frontend (ESLint, TypeScript)
- ✅ Test frontend (Vitest)
- ✅ Build backend (TypeScript compilation)
- ✅ Build frontend (Vite production build)
- ✅ Validate Docker builds

**Duration**: ~8-10 minutes

### 2. Deploy to Development (`deploy-dev.yml`)

**Purpose**: Automated deployment to development environment

**Triggers**:
- Push to `dev` branch
- Manual trigger via GitHub Actions UI

**Environment**:
- GCP Project: `long-operator-466309-g6`
- Region: `us-central1`
- Services: `simpalahr-backend-dev`, `simpalahr-frontend-dev`

**Jobs**:
1. Run CI pipeline
2. Build and push Docker images
3. Run database migrations
4. Deploy to Cloud Run
5. Health checks and validation

**Duration**: ~12-15 minutes

### 3. Deploy to Production (`deploy-prod.yml`)

**Purpose**: Automated deployment to production environment

**Triggers**:
- Push to `main` branch
- Manual trigger via GitHub Actions UI

**Environment**:
- GCP Project: `start-project-466908`
- Region: `us-central1`
- Services: `simpalahr-backend-prod`, `simpalahr-frontend-prod`
- Protection: Requires environment approval (recommended)

**Jobs**:
1. Run CI pipeline
2. Build and push Docker images
3. Backup notification
4. Run database migrations
5. Deploy to Cloud Run
6. Comprehensive health checks
7. Smoke tests

**Duration**: ~15-18 minutes

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Git Push                              │
│                 (dev branch / main branch)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     CI Pipeline                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Lint Backend │  │ Lint Frontend│  │ Validate     │      │
│  │ Test Backend │  │ Test Frontend│  │ Docker Builds│      │
│  │ Build Backend│  │ Build Frontend│  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ ✅ All checks passed
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Build & Push Images                         │
│  ┌────────────────────────────────────────────┐             │
│  │ Backend Image → Artifact Registry          │             │
│  │ Frontend Image → Artifact Registry         │             │
│  │ Tags: latest, sha, short-sha               │             │
│  └────────────────────────────────────────────┘             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Database Migrations                           │
│  ┌────────────────────────────────────────────┐             │
│  │ Create temporary Cloud Run job            │             │
│  │ Run: npx prisma migrate deploy             │             │
│  │ Clean up job                               │             │
│  └────────────────────────────────────────────┘             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Deploy to Cloud Run                         │
│  ┌────────────────────────────────────────────┐             │
│  │ Backend Service  → Cloud Run               │             │
│  │ Frontend Service → Cloud Run               │             │
│  │ Configure env vars, resources              │             │
│  └────────────────────────────────────────────┘             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Health Checks & Validation                     │
│  ┌────────────────────────────────────────────┐             │
│  │ Backend /health endpoint                   │             │
│  │ Frontend homepage                          │             │
│  │ Smoke tests (production only)              │             │
│  └────────────────────────────────────────────┘             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                   ✅ Deployment Complete!
```

## Required Configuration

### GitHub Secrets

See [SECRETS_SETUP.md](../docs/SECRETS_SETUP.md) for detailed instructions.

**Development**:
- `DEV_DATABASE_URL` - PostgreSQL connection string
- `DEV_JWT_SECRET` - JWT signing secret
- `DEV_BACKEND_URL` - Backend API URL (optional)

**Production**:
- `PROD_DATABASE_URL` - PostgreSQL connection string
- `PROD_JWT_SECRET` - JWT signing secret
- `PROD_BACKEND_URL` - Backend API URL (required)

### GCP Workload Identity

Configured for:
- **Dev**: `github-actions-dev@long-operator-466309-g6.iam.gserviceaccount.com`
- **Prod**: `github-actions-prod@start-project-466908.iam.gserviceaccount.com`

## Manual Deployment

### Via GitHub Actions UI

1. Go to **Actions** tab
2. Select workflow (Deploy to Development / Production)
3. Click **Run workflow**
4. Choose branch
5. Optionally skip CI (not recommended)

### Via Git

```bash
# Deploy to Development
git checkout dev
git add .
git commit -m "feat: your changes"
git push origin dev

# Deploy to Production
git checkout main
git merge dev
git push origin main
```

## Monitoring Deployments

### GitHub Actions

View workflow runs:
- https://github.com/Mad-marketing-git/HR/actions

### GCP Console

View deployed services:
- Dev: https://console.cloud.google.com/run?project=long-operator-466309-g6
- Prod: https://console.cloud.google.com/run?project=start-project-466908

### Logs

```bash
# View deployment logs
gh run list --workflow=deploy-dev.yml --limit 5
gh run view <run-id> --log

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

## Troubleshooting

### CI Failures

**Symptoms**: Pipeline fails during testing or linting

**Solutions**:
1. Run tests locally: `npm test`
2. Fix linting: `npm run lint:fix`
3. Check test output in GitHub Actions logs
4. Ensure all dependencies are installed

### Build Failures

**Symptoms**: Docker build fails or images can't be pushed

**Solutions**:
1. Verify Dockerfile syntax
2. Check build context paths
3. Ensure Artifact Registry exists
4. Verify Workload Identity permissions

### Deployment Failures

**Symptoms**: Cloud Run deployment fails

**Solutions**:
1. Check secret configuration
2. Verify environment variables
3. Check resource limits (memory, CPU)
4. Review Cloud Run logs
5. Verify service account permissions

### Health Check Failures

**Symptoms**: Deployment succeeds but health checks fail

**Solutions**:
1. Check if service is running: `gcloud run services describe <service>`
2. Verify environment variables are set
3. Test health endpoint manually: `curl <backend-url>/health`
4. Check application logs for startup errors
5. Increase health check timeout

## Rollback Procedures

### Quick Rollback

```bash
# Set environment
export SERVICE_NAME="simpalahr-backend-dev"
export REGION="us-central1"

# List revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION

# Rollback to previous revision
gcloud run services update-traffic $SERVICE_NAME \
  --to-revisions=<PREVIOUS-REVISION-NAME>=100 \
  --region=$REGION
```

### Via GCP Console

1. Go to Cloud Run service
2. Click "REVISIONS & TRAFFIC"
3. Select previous working revision
4. Click "MANAGE TRAFFIC"
5. Set to 100%
6. Save

## Best Practices

### Development

- ✅ Always run tests locally before pushing
- ✅ Use descriptive commit messages
- ✅ Create feature branches for new features
- ✅ Test in dev before merging to main
- ✅ Review deployment logs after each deploy

### Production

- ✅ Always merge through dev first
- ✅ Test thoroughly in development
- ✅ Review all changes before deploying
- ✅ Have rollback plan ready
- ✅ Monitor after deployment
- ✅ Schedule deployments during low-traffic periods
- ✅ Backup database before major changes

### Security

- ✅ Rotate secrets every 90 days
- ✅ Use different secrets for dev/prod
- ✅ Never commit secrets to repository
- ✅ Review GCP permissions regularly
- ✅ Enable audit logging
- ✅ Use branch protection rules

## Performance Optimization

### CI Pipeline

- ✅ Uses npm caching for faster installs
- ✅ Docker layer caching enabled
- ✅ Parallel job execution where possible
- ✅ Build validation without push

### Docker Images

- ✅ Multi-stage builds for smaller images
- ✅ Production-only dependencies in final stage
- ✅ Health checks included
- ✅ Optimized layer ordering

### Cloud Run

- ✅ CPU boost enabled for faster cold starts
- ✅ No CPU throttling during request processing
- ✅ Appropriate resource limits set
- ✅ Min instances for prod (always warm)
- ✅ Max instances prevent runaway costs

## Cost Considerations

### CI/CD

- GitHub Actions: Free tier includes 2,000 minutes/month
- Estimated usage: ~500-800 minutes/month
- Cost: $0 (within free tier)

### Cloud Run

**Development**:
- Min instances: 0 (scales to zero)
- Estimated cost: $5-20/month

**Production**:
- Min instances: 1 (always running)
- Estimated cost: $50-200/month (traffic dependent)

### Artifact Registry

- Storage: ~$0.10/GB/month
- Network egress: Free within same region
- Estimated cost: $1-5/month

## Future Improvements

- [ ] Automated performance testing
- [ ] Visual regression testing
- [ ] Blue-green deployments
- [ ] Canary releases
- [ ] Automated rollback on failure
- [ ] Multi-region deployment
- [ ] Infrastructure as Code (Terraform)
- [ ] Disaster recovery automation
- [ ] Cost optimization alerts
- [ ] Security scanning (Snyk, Dependabot)

## Support

For issues with workflows:

1. Check workflow logs in GitHub Actions
2. Review [DEPLOYMENT_GUIDE.md](../docs/DEPLOYMENT_GUIDE.md)
3. Check [SECRETS_SETUP.md](../docs/SECRETS_SETUP.md)
4. Review GCP Cloud Run logs
5. Contact DevOps team

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**Last Updated**: November 3, 2025  
**Maintained By**: DevOps Team
