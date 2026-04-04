# GitHub Actions CI/CD Configuration Guide

## Required GitHub Secrets

To run the CI/CD pipeline successfully, you need to configure the following secrets in your GitHub repository:

### For Production Deployment (Optional - when ready to deploy)

1. **STAGING_DATABASE_URL** (Optional)
   - Description: PostgreSQL connection string for staging environment
   - Format: `postgresql://username:password@host:port/database?schema=public`
   - Example: `postgresql://user:pass@staging-db.example.com:5432/simpala_hr?schema=public`
   - Used in: Deploy-staging job

2. **GITHUB_TOKEN** (Automatically provided)
   - Description: Automatically generated token for GitHub Actions
   - No configuration needed - provided by GitHub

### Current CI Configuration

The CI pipeline now uses **hardcoded test credentials** for the PostgreSQL service container:
- Database URL: `postgresql://postgres:postgres@localhost:5432/simpala_hr_test?schema=public`
- JWT Secret: `test-jwt-secret-key-for-ci-only-not-production`

These are safe for CI because:
- They only exist in the ephemeral GitHub Actions runner
- The PostgreSQL service container is destroyed after each run
- They are never used in production

## How to Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name listed above
5. Save the secret

## CI/CD Pipeline Overview

### Jobs

1. **lint-backend**: Runs ESLint and Prettier checks on backend code
2. **build-and-test-backend**: Runs TypeScript compilation and Jest tests with coverage
3. **lint-frontend**: Runs React tests in CI mode
4. **build-frontend**: Builds production React bundle
5. **docker-build-backend**: Builds and pushes Docker image to GitHub Container Registry (only on main branch)
6. **deploy-staging**: Placeholder for staging deployment (customize based on your infrastructure)

### Workflow Triggers

- **Push**: Runs on `main`, `fix/**`, and `feature/**` branches
- **Pull Request**: Runs on PRs targeting `main` branch

### Service Containers

- **PostgreSQL 15**: Used for integration tests in the backend
  - Includes health checks to ensure database is ready before tests run
  - Isolated database for each CI run

## Deployment

The current deployment job is a placeholder. To implement actual deployment:

1. Uncomment the `environment` section in `deploy-staging` job
2. Add your deployment commands based on your infrastructure:
   - For Kubernetes: Use `kubectl` commands
   - For Docker Compose: SSH to server and pull/restart containers
   - For cloud platforms: Use provider-specific CLI (AWS, Azure, GCP)

Example deployment commands are provided in the workflow file.

## Coverage Reports

Test coverage reports are automatically uploaded to Codecov. To view them:

1. Sign up at [codecov.io](https://codecov.io)
2. Connect your GitHub repository
3. Coverage reports will be available after each CI run

## Artifacts

- **Frontend build artifacts**: Stored for 7 days after each successful build
- Can be downloaded from the Actions run summary page

## Troubleshooting

### Common Issues

1. **Tests fail locally but pass in CI (or vice versa)**
   - Check environment variable differences
   - Verify Node.js and npm versions match

2. **Docker build fails**
   - Ensure all dependencies are in package.json
   - Check that Dockerfile has correct paths

3. **Database migration fails**
   - Verify DATABASE_URL format is correct
   - Ensure PostgreSQL service is healthy before migrations run

## Local Testing

To test the CI pipeline locally using Docker:

```bash
# Backend tests
cd SimpalaHR/backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm test

# Frontend tests
cd SimpalaHR/frontend
npm ci
npm test -- --watchAll=false
npm run build
```

## Performance Optimization

Current optimizations:
- ✅ NPM caching enabled (speeds up dependency installation)
- ✅ Docker layer caching via GitHub Actions cache
- ✅ Tests run in band (--runInBand) to avoid conflicts
- ✅ Parallel execution of independent jobs (lint, frontend, backend)

## Next Steps

1. Configure staging environment secrets when ready to deploy
2. Set up Codecov integration for coverage tracking
3. Configure deployment infrastructure (Kubernetes, Docker Compose, etc.)
4. Add end-to-end (E2E) tests workflow
5. Set up branch protection rules requiring CI to pass
