# CI/CD Quick Reference Card

## 🚀 Quick Start

### View CI/CD Status
- Go to **Actions** tab in GitHub
- Check workflow runs and logs
- Green ✅ = All tests passed
- Red ❌ = Check logs for errors

### Trigger CI/CD
```bash
# Automatic triggers:
git push origin main              # Full CI/CD + deployment
git push origin feature/new-feat  # Full CI/CD only
git push origin fix/bug-123       # Full CI/CD only

# Pull requests to main also trigger CI
```

---

## 📋 Jobs That Run

| Job | What It Does | When It Runs |
|-----|--------------|--------------|
| **lint-backend** | ESLint + Prettier checks | Every push/PR |
| **build-and-test-backend** | TypeScript compile + Jest tests | Every push/PR |
| **lint-frontend** | React tests (CI mode) | Every push/PR |
| **build-frontend** | Production build | Every push/PR |
| **docker-build-backend** | Build & push Docker image | Only on `main` |
| **deploy-staging** | Deploy to staging | Only on `main` (placeholder) |

---

## 🔧 Common Commands (Local Testing)

### Backend
```bash
cd SimpalaHR/backend

# Install dependencies
npm ci

# Run linting
npm run lint
npm run format:check

# Run tests
npm test
npm run test:coverage

# Build TypeScript
npm run build

# Run production build
npm start
```

### Frontend
```bash
cd SimpalaHR/frontend

# Install dependencies
npm ci

# Run tests
npm test -- --watchAll=false

# Build production
npm run build

# Start dev server
npm start
```

---

## 🐳 Docker Commands

### Build Backend Image
```bash
cd SimpalaHR/backend
docker build -t simpala-hr-backend .
```

### Run with Docker Compose
```bash
cd SimpalaHR/backend
docker-compose up -d
```

### View Logs
```bash
docker logs simpala-backend -f
```

---

## ❌ Troubleshooting

### "Tests failed in CI but pass locally"
1. Check Node.js version matches (18)
2. Run `npm ci` instead of `npm install`
3. Check environment variables
4. Clear `node_modules` and reinstall

### "Docker build fails"
1. Ensure all dependencies in `package.json`
2. Check `Dockerfile` paths
3. Verify `.dockerignore` doesn't exclude needed files
4. Check for TypeScript errors

### "Linting errors"
```bash
# Auto-fix linting issues
npm run lint:fix

# Auto-fix formatting
npm run format
```

### "Coverage upload fails"
- This is non-blocking (job continues)
- Check if Codecov is configured
- See `.github/CI_CD_GUIDE.md` for setup

---

## 📊 View Test Coverage
1. Go to [codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Find your repository
4. View coverage reports and trends

---

## 🔐 Secrets (For Deployment)

Only needed when deploying to staging/production:

| Secret Name | Purpose |
|-------------|---------|
| `STAGING_DATABASE_URL` | Staging database connection |
| `GITHUB_TOKEN` | Auto-provided by GitHub |

**Current CI uses test credentials** - no secrets needed to run tests!

---

## 📦 Build Artifacts

### Frontend Builds
- Stored for 7 days after each successful build
- Download from Actions run summary page
- Located in `SimpalaHR/frontend/build`

### Docker Images
- Pushed to GitHub Container Registry (ghcr.io)
- Tagged with branch name and commit SHA
- `latest` tag for main branch

---

## 🎯 Best Practices

### Before Pushing
```bash
# Run these locally first:
npm run lint
npm run format:check
npm test
npm run build
```

### Branch Names
- `feature/description` - New features
- `fix/description` - Bug fixes
- Use descriptive names for CI logs

### Commit Messages
- Clear and descriptive
- Reference issue numbers if applicable
- Example: "Fix user authentication bug (#123)"

---

## 📝 Important Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI/CD pipeline definition |
| `.github/CI_CD_GUIDE.md` | Detailed setup guide |
| `docs/CI_CD_FIXES_REPORT.md` | Complete fixes documentation |
| `SimpalaHR/backend/Dockerfile` | Production Docker build |
| `SimpalaHR/backend/.dockerignore` | Docker build optimization |

---

## 🆘 Getting Help

1. **Check logs**: GitHub Actions → Your workflow run → Job details
2. **Read guides**: 
   - `.github/CI_CD_GUIDE.md` (setup & troubleshooting)
   - `docs/CI_CD_FIXES_REPORT.md` (detailed fixes)
3. **Common errors**: See troubleshooting section above
4. **Still stuck?**: Contact DevOps team

---

## ⚡ Performance Tips

- CI runs take ~5-10 minutes typically
- Caching speeds up npm install (~40% faster)
- Jobs run in parallel when possible
- Docker builds use layer caching

---

**Last Updated**: October 15, 2025  
**Status**: ✅ All systems operational
