# Production Deployment Runbook — Simpala HR

**Target Date:** March 25, 2026  
**Status:** ✅ Ready for Deployment  
**Owner:** DevOps Team

---

## Pre-Deployment Checklist

### 1. Code & Quality Gates
- [x] All unit tests passing (215/215)
- [x] Integration tests passing
- [x] E2E tests in CI pipeline (12 Playwright specs)
- [x] Coverage thresholds enforced (70% minimum)
- [x] 0 Critical/High bugs in regression cycle
- [x] Security scan passing (Trivy + npm audit)
- [x] Pen test report signed off

### 2. Security
- [x] Helmet configured (CSP, HSTS, X-Frame-Options)
- [x] CORS restricted to production origins
- [x] Rate limiting enabled
- [x] Swagger UI disabled in production
- [x] JSON body size limited to 10KB
- [ ] **ACTION REQUIRED:** Rotate production JWT secret before go-live
- [ ] **ACTION REQUIRED:** Set `CORS_ORIGIN` env to production frontend URL

### 3. Database
- [x] All Prisma migrations applied and tested
- [x] Seed data verified for production schema
- [ ] **ACTION REQUIRED:** Verify production database backup is enabled
- [ ] **ACTION REQUIRED:** Test migration rollback procedure

### 4. Infrastructure
- [x] Cloud Run services configured (backend + frontend)
- [x] Artifact Registry images building and pushing
- [x] VPC connector configured for database access
- [x] Workload Identity Federation for GitHub Actions
- [ ] **ACTION REQUIRED:** Verify production DNS records
- [ ] **ACTION REQUIRED:** Confirm min-instances=1 for production (cold start prevention)

---

## Deployment Steps

### Step 1: Final Verification (T-1 day)
```bash
# Verify dev environment is green
# Check latest CI run on dev branch
gh run list --branch dev --limit 5

# Verify no pending security alerts
gh api repos/:owner/:repo/dependabot/alerts --jq '.[] | select(.state=="open") | .security_vulnerability.severity'
```

### Step 2: Merge to Main (T-0)
```bash
# Create PR from dev -> main
gh pr create --base main --head dev \
  --title "Release: Sprint 3 — Go Live" \
  --body "## Changes\n- M4.0: Unit tests (80%+ coverage)\n- M4.0.1: E2E in CI\n- M4.0.2: Coverage thresholds\n- M4.2: Security scan\n- M4.5: Security fixes (body limit, Swagger disabled in prod)\n- All regression tests passing"

# After approval, merge
gh pr merge --squash
```

### Step 3: Monitor CI/CD Pipeline
The `deploy-prod.yml` workflow will automatically:
1. Run security scan (Trivy + npm audit)
2. Lint & type check
3. Run backend tests with coverage
4. Run frontend tests
5. Build validation
6. Build & push Docker images to Artifact Registry
7. Run database migrations
8. Deploy backend to Cloud Run (1Gi, 2 CPU, min 1 instance)
9. Deploy frontend to Cloud Run (512Mi, 1 CPU, min 1 instance)
10. Run health checks
11. Run smoke tests

### Step 4: Post-Deploy Verification
```bash
# Health check
curl -f https://<PROD_BACKEND_URL>/health

# Verify API responds
curl -s https://<PROD_BACKEND_URL>/api/v1/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  | jq .message

# Verify frontend loads
curl -s -o /dev/null -w "%{http_code}" https://<PROD_FRONTEND_URL>/

# Verify Swagger is disabled
curl -s -o /dev/null -w "%{http_code}" https://<PROD_BACKEND_URL>/api-docs
# Expected: 404
```

### Step 5: DNS Switchover
```bash
# Update DNS A/CNAME records to point to Cloud Run URLs
# Verify SSL certificate is active
# Test custom domain access
```

---

## Rollback Procedure

If issues are found post-deploy:

```bash
# Rollback backend to previous revision
gcloud run services update-traffic simpalahr-backend-prod \
  --to-revisions=PREVIOUS-REVISION=100 \
  --region us-central1

# Rollback frontend to previous revision
gcloud run services update-traffic simpalahr-frontend-prod \
  --to-revisions=PREVIOUS-REVISION=100 \
  --region us-central1

# If migration needs rollback (CAUTION: data loss possible)
# 1. Restore database from backup
# 2. Redeploy previous image
```

---

## Production Configuration

### Environment Variables (Backend)
| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | Cloud Run env |
| `DATABASE_URL` | `***` | Secret Manager: `prod-database-url` |
| `JWT_SECRET` | `***` | Secret Manager: `prod-jwt-secret` |
| `CORS_ORIGIN` | `https://<frontend-domain>` | Cloud Run env |
| `PORT` | `8080` | Cloud Run default |

### Cloud Run Settings
| Setting | Backend | Frontend |
|---------|---------|----------|
| Memory | 1Gi | 512Mi |
| CPU | 2 | 1 |
| Min Instances | 1 | 1 |
| Max Instances | 100 | 100 |
| Timeout | 300s | 60s |
| CPU Boost | Yes | Yes |
| CPU Throttling | No | Default |

---

## Monitoring & Alerts

- **Cloud Run Metrics:** Request count, latency, error rate via GCP Console
- **Error Tracking:** Application logs via Cloud Logging
- **Uptime Checks:** Configure in GCP Monitoring for `/health` endpoint
- **Alert Policy:** P95 latency > 500ms or error rate > 1%

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| DevOps Lead | — | — | ⏳ Pending |
| Dev Lead | — | — | ⏳ Pending |
| QA Lead | — | — | ⏳ Pending |
| Product Owner | — | — | ⏳ Pending |

---

*Runbook maintained by DevOps Team. Last updated: Feb 12, 2026.*
