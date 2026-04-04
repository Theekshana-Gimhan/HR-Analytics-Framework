# GCP Configuration Summary - SimpalaHR
**Generated:** December 24, 2025  
**Project:** long-operator-466309-g6 (Development)  
**Region:** us-central1

---

## 1. Project Overview

### Active GCP Projects

| Environment | Project ID | Project Number | Project Name |
|-------------|-----------|----------------|--------------|
| **Development** | `long-operator-466309-g6` | 85939737092 | MyCompany WebApp Dev |
| **Production** | `start-project-466908` | 468105947604 | MyCompany WebApp Prod |

**Currently Active:** Development (`long-operator-466309-g6`)

---

## 2. Cloud Run Services

### 2.1 SimpalaHR Services (Active)

#### Backend Service
- **Service Name:** `simpalahr-backend-dev`
- **URL:** `https://simpalahr-backend-dev-85939737092.us-central1.run.app`
- **Region:** us-central1
- **Last Deployed:** December 23, 2025 at 09:47:32 UTC
- **Deployed By:** theekshana3942@gmail.com
- **Access:** Unauthenticated (public)

**Resource Configuration:**
- **CPU:** 1 vCPU
- **Memory:** 512 MB
- **CPU Throttling:** Disabled (always-on CPU)
- **Startup CPU Boost:** Enabled
- **Max Scale:** 10 instances
- **VPC Connector:** `simpala-vpc-connector`
- **VPC Egress:** All traffic through VPC

**Estimated Costs (Per Instance-Hour):**
- CPU: 1 vCPU Ã— $0.00002400/vCPU-second = $0.0864/hour
- Memory: 512 MB Ã— $0.00000250/GB-second = $0.0046/hour
- **Total:** ~$0.091/instance-hour

#### Frontend Service
- **Service Name:** `simpalahr-frontend-dev`
- **URL:** `https://simpalahr-frontend-dev-85939737092.us-central1.run.app`
- **Region:** us-central1
- **Last Deployed:** December 22, 2025 at 11:18:24 UTC
- **Deployed By:** theekshana3942@gmail.com
- **Access:** Unauthenticated (public)

**Resource Configuration:**
- **CPU:** 1 vCPU
- **Memory:** 256 MB
- **Max Scale:** 10 instances
- **Startup CPU Boost:** Enabled

**Estimated Costs (Per Instance-Hour):**
- CPU: 1 vCPU Ã— $0.00002400/vCPU-second = $0.0864/hour
- Memory: 256 MB Ã— $0.00000250/GB-second = $0.0023/hour
- **Total:** ~$0.0887/instance-hour

### 2.2 Other Services in Project

| Service Name | URL | Last Deployed |
|--------------|-----|---------------|
| `agent-commission-dev` | https://agent-commission-dev-85939737092.us-central1.run.app | Dec 2, 2025 |
| `kpi-dashboard-dev` | https://kpi-dashboard-dev-85939737092.us-central1.run.app | Dec 24, 2025 |

---

## 3. Artifact Registry (Container Images)

### 3.1 SimpalaHR Repository

- **Repository Name:** `simpalahr`
- **Location:** us-central1
- **Format:** Docker
- **Created:** October 31, 2025
- **Last Updated:** December 22, 2025
- **Total Size:** 20.7 GB
- **Encryption:** Google-managed key

**Images Stored:**
- `simpalahr-backend-dev:latest`
- `simpalahr-frontend-dev:latest`
- `seed-basic` (database seeding)
- Multiple versioned images with SHA256 digests

**Storage Costs:**
- 20.7 GB Ã— $0.10/GB/month = **$2.07/month**

### 3.2 Other Repositories

| Repository | Size (GB) | Monthly Cost |
|------------|-----------|--------------|
| `kpi-dashboard-repo` | 16.0 GB | $1.60 |
| `agent-commission-dev` | 11.9 GB | $1.19 |
| `staging-docker-repo` | 1.05 GB | $0.11 |
| `tts-backend-repo` | 0.75 GB | $0.08 |
| `diag-repo` | 0.48 GB | $0.05 |
| `ai-persona-simulator-repo` | 0.03 GB | $0.003 |
| **Total** | **30.2 GB** | **$3.03** |

---

## 4. Cloud SQL / Database

### Current Status
- **Cloud SQL Instances:** None detected in current project
- **Database:** Using external PostgreSQL database (likely third-party managed)
- **Connection:** Via DATABASE_URL secret in Secret Manager

**Cost Impact:**
- Currently: $0 (external database)
- **If migrated to Cloud SQL:**
  - db-custom-1-4096 (1 vCPU, 4GB RAM): $48/month
  - db-custom-2-8192 (2 vCPU, 8GB RAM): $96/month
  - db-custom-4-16384 (4 vCPU, 16GB RAM): $192/month

---

## 5. Secret Manager

### Active Secrets (20 total)

#### SimpalaHR Specific:
- `dev-database-url` - PostgreSQL connection string (dev)
- `prod-database-url` - PostgreSQL connection string (prod)
- `jwt-secret` - JWT signing secret (dev)
- `prod-jwt-secret` - JWT signing secret (prod)
- `encryption-key` - Data encryption key
- `seed-token-dev` - Database seeding authentication

#### Other Application Secrets:
- `agent-commission-database-url`
- `kpi-dashboard-db-connection-string`
- `gemini-api-key`
- `db-connection-string` / `db-connection-string-dev`
- Various synapse database credentials

**Costs:**
- 20 secrets Ã— $0.06/secret/month = **$1.20/month**
- Access operations: Minimal cost (<$0.10/month)

---

## 6. Networking

### VPC Configuration
- **VPC Connector:** `simpala-vpc-connector`
- **Egress:** All traffic routes through VPC
- **Purpose:** Secure database connections, internal service communication

**Estimated Costs:**
- VPC Connector: ~$8-10/month (charged per hour of usage)
- Egress Traffic: $0.12/GB (to internet)

---

## 7. Cloud Build

### Build Configurations

| Config File | Purpose | Target Image |
|-------------|---------|--------------|
| `cloudbuild-backend.yaml` | Production backend build | `gcr.io/${PROJECT_ID}/simpalahr-backend-dev:latest` |
| `cloudbuild-backend-dev.yaml` | Dev backend build | `us-central1-docker.pkg.dev/*/simpalahr/simpalahr-backend-dev` |
| `cloudbuild-frontend.yaml` | Frontend build | `us-central1-docker.pkg.dev/*/simpalahr/simpalahr-frontend-dev` |
| `cloudbuild-backend-migration.yaml` | Database migrations | Backend image |
| `cloudbuild-seed-dev.yaml` | Development data seeding | Seed container |
| `cloudbuild-seed.yaml` | Production data seeding | Seed container |

**Build Settings:**
- Timeout: 900s (15 minutes)
- Logging: Cloud Logging only
- Builder: `gcr.io/cloud-builders/docker`

**Estimated Costs:**
- Build time: First 120 build-minutes/day free
- After free tier: $0.003/build-minute
- Typical build: 5-8 minutes = ~$0.015-$0.024 per build
- Estimated monthly: ~$5-10 (if building 10-15 times/day)

---

## 8. Cost Summary (Current Configuration)

### Fixed Monthly Costs

| Component | Configuration | Monthly Cost (USD) |
|-----------|---------------|-------------------|
| **Cloud Run - Backend** | 1 vCPU, 512MB, always-on | $65.52* |
| **Cloud Run - Frontend** | 1 vCPU, 256MB | $32.76* |
| **Artifact Registry** | 20.7 GB storage | $2.07 |
| **Secret Manager** | 20 secrets | $1.20 |
| **VPC Connector** | Hourly usage | $8-10 |
| **Cloud Build** | ~300 builds/month | $5-10 |
| **Cloud Logging** | Standard logs | $2-5 |
| **Cloud Monitoring** | Basic metrics | $1-3 |
| **Total Current Infrastructure** | | **$118-130/month** |

*_Assuming minimal idle time with startup CPU boost and no throttling. Actual costs will be lower if instances scale to zero during idle periods._

### Variable Costs (Usage-Based)

| Component | Rate | Estimated Monthly |
|-----------|------|-------------------|
| **Requests** | $0.40/million | <$1 |
| **Bandwidth** | $0.12/GB egress | $2-5 |
| **Storage I/O** | Artifact Registry pulls | <$1 |
| **VPC Egress** | Additional charges | $1-3 |
| **Total Variable** | | **$4-10/month** |

### Grand Total (Dev Environment)
**Estimated: $122-140/month**

---

## 9. Cost Optimization Opportunities

### Immediate Savings (Potential: 30-40%)

1. **Enable CPU Throttling** 
   - Current: CPU always-on (costs ~$0.09/instance-hour)
   - Optimized: CPU throttled when idle (costs ~$0.02/instance-hour)
   - **Savings: ~$40/month**

2. **Reduce Memory Allocation**
   - Backend: 512MB â†’ 256MB (if sufficient)
   - **Savings: ~$15/month**

3. **Cleanup Old Images**
   - Delete unused Docker images (20.7GB â†’ 5GB)
   - **Savings: ~$1.57/month**

4. **Implement Aggressive Autoscaling**
   - Scale to zero during nights/weekends
   - **Savings: ~$30-40/month**

5. **Use Committed Use Discounts**
   - 1-year commitment: 20% discount
   - 3-year commitment: 37% discount
   - **Savings: ~$24-45/month**

### Total Potential Savings
**$110-140/month** â†’ **$60-80/month** (45% reduction)

---

## 10. Comparison: Management Proposal vs. Actual Costs

### Management Proposal Assumptions (10 users)

| Component | Proposal Cost | Actual Cost | Variance |
|-----------|--------------|-------------|----------|
| **Database** | $48.00 | $0.00** | -$48.00 |
| **Backend Compute** | $3.60 | $65.52 | +$61.92 |
| **Frontend Compute** | Included | $32.76 | +$32.76 |
| **Storage** | $2.50 | $2.07 | -$0.43 |
| **CDN** | $8.00 | $0.00*** | -$8.00 |
| **Load Balancer** | $18.00 | $0.00*** | -$18.00 |
| **Monitoring** | $5.00 | $3.00 | -$2.00 |
| **Secrets** | $1.00 | $1.20 | +$0.20 |
| **VPC** | Not included | $10.00 | +$10.00 |
| **Cloud Build** | Not included | $8.00 | +$8.00 |
| **Total** | **$86.10** | **$122.55** | **+$36.45** |

**Database hosted externally (not on GCP)  
***Not yet configured (would add ~$26/month if implemented)

### Revised Cost Model

#### With Optimizations (Per 10 Users)
- Backend: $20/month (with CPU throttling + scale-to-zero)
- Frontend: $10/month (with optimizations)
- Storage: $2/month
- VPC: $8/month
- Secrets: $1/month
- Cloud Build: $5/month
- Monitoring: $3/month
- Database (external): $0/month
- **Total: $49/month**
- **Per User: $4.90/month**

#### With Cloud SQL (Recommended for Production)
- Above costs: $49/month
- Cloud SQL db-custom-1-4096: $48/month
- **Total: $97/month**
- **Per User: $9.70/month**

---

## 11. Recommendations

### Short-Term Actions (This Week)

1. âœ… **Enable CPU Throttling**
   ```bash
   gcloud run services update simpalahr-backend-dev \
     --cpu-throttling \
     --region=us-central1
   ```

2. âœ… **Configure Minimum Instances to 0**
   ```bash
   gcloud run services update simpalahr-backend-dev \
     --min-instances=0 \
     --region=us-central1
   ```

3. âœ… **Cleanup Unused Docker Images**
   - Keep only last 5 versions per image
   - Delete untagged images
   - **Script:** `gcloud artifacts docker images delete`

4. âœ… **Set Budget Alerts**
   ```bash
   gcloud billing budgets create \
     --billing-account=015254-D26DDD-6F9F75 \
     --display-name="SimpalaHR Dev Monthly Budget" \
     --budget-amount=150USD \
     --threshold-rule=percent=80 \
     --threshold-rule=percent=100
   ```

### Medium-Term Actions (This Month)

1. **Migrate to Cloud SQL**
   - Create `db-custom-1-4096` instance
   - Enable automated backups (7 days)
   - Configure private IP for security
   - Migrate from external database

2. **Implement Cloud CDN**
   - Configure for frontend static assets
   - Enable cache for API responses (where applicable)
   - Expected savings: Faster load times, reduced egress

3. **Set Up Load Balancer**
   - Global HTTP(S) load balancer
   - SSL termination
   - Custom domain support
   - Health checks

### Long-Term Actions (Next Quarter)

1. **Multi-Region Deployment**
   - Primary: us-central1
   - Failover: asia-southeast1 (Singapore)
   - Disaster recovery setup

2. **Committed Use Discounts**
   - Commit to 1-year Cloud Run usage
   - 20% discount on compute costs
   - Lock in predictable pricing

3. **Monitoring & Alerting**
   - Set up Cloud Monitoring dashboards
   - Configure uptime checks
   - Error rate alerts
   - Performance SLIs/SLOs

---

## 12. Security Audit

### Current Security Posture

âœ… **Strengths:**
- All secrets managed in Secret Manager
- VPC connector for secure database access
- Encrypted container images
- HTTPS enforced on all endpoints
- JWT-based authentication

âš ï¸ **Areas for Improvement:**
- Services allow unauthenticated access (consider Cloud IAM)
- No DDoS protection (Cloud Armor not configured)
- No Web Application Firewall
- Billing account closed (need active billing)
- No audit logging for secret access

### Security Recommendations

1. **Enable Cloud Armor**
   - DDoS protection
   - Rate limiting
   - IP allowlisting/denylisting
   - **Cost:** ~$15/month

2. **Implement Cloud IAP**
   - Identity-Aware Proxy for admin access
   - OAuth 2.0 authentication
   - **Cost:** Free

3. **Enable Security Command Center**
   - Vulnerability scanning
   - Compliance monitoring
   - **Cost:** Free tier available

4. **Audit Logging**
   - Enable data access logs
   - Monitor secret access
   - **Cost:** ~$2-5/month

---

## 13. Support & Documentation

### Key Resources

- **GCP Console:** https://console.cloud.google.com/
- **Project Dashboard:** https://console.cloud.google.com/home/dashboard?project=long-operator-466309-g6
- **Cloud Run Services:** https://console.cloud.google.com/run?project=long-operator-466309-g6
- **Artifact Registry:** https://console.cloud.google.com/artifacts?project=long-operator-466309-g6
- **Secret Manager:** https://console.cloud.google.com/security/secret-manager?project=long-operator-466309-g6

### Quick Commands

```bash
# Set active project
gcloud config set project long-operator-466309-g6

# View services
gcloud run services list --region=us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=simpalahr-backend-dev" --limit=50

# Deploy backend
gcloud run deploy simpalahr-backend-dev \
  --image=gcr.io/long-operator-466309-g6/simpalahr-backend-dev:latest \
  --region=us-central1

# Deploy frontend
gcloud run deploy simpalahr-frontend-dev \
  --image=us-central1-docker.pkg.dev/long-operator-466309-g6/simpalahr/simpalahr-frontend-dev:latest \
  --region=us-central1
```

---

**Document Status:** Current as of December 24, 2025  
**Next Review:** January 15, 2026  
**Owner:** DevOps Team  
**Classification:** Internal Use

