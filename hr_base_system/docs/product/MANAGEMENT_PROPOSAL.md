# Simpala HR - Management Proposal
## Solution Overview & Cost Analysis

**Document Date:** December 24, 2025  
**Version:** 1.0  
**Prepared For:** Management Review  
**Status:** Confidential

---

## 1. Executive Summary

Simpala HR is a cloud-based Human Resources Management System specifically designed for Sri Lankan Small and Medium Businesses (10-100 employees). The platform addresses a critical market gap by providing an affordable, locally-compliant HR solution that automates payroll, leave management, attendance tracking, and core HR operations.

### Key Value Propositions
- **100% Sri Lankan Compliance**: Built-in EPF, ETF, PAYE calculations per Sri Lankan labor laws
- **80% Time Reduction**: Automated payroll processing vs. manual Excel/paper methods
- **Mobile-First Design**: Accessible anytime, anywhere on smartphones
- **Enterprise Security**: Bank-grade encryption and security standards
- **Zero Infrastructure Hassle**: Fully cloud-hosted on Google Cloud Platform

---

## 2. Complete Feature Set

### 2.1 Core HR - Employee Management âœ… LIVE

#### Employee Database
- **Digital Employee Profiles**
  - Complete personal details (name, NIC, DOB, contact info)
  - Job information (designation, department, join date, employment status)
  - Bank account details for salary disbursement
  - Salary structure and components
  
- **Employee Directory**
  - Searchable and filterable employee list
  - Active/inactive status tracking
  - Quick search by name, NIC, or designation
  - Comprehensive detail view per employee
  
- **Document Management**
  - Upload and store employee documents (ID, certificates, appointment letters)
  - Secure document storage with UUID filenames
  - Download with role-based access control
  - Organized per-employee directory structure
  
- **User Authentication & Authorization**
  - Multi-role support: OWNER, ADMIN, EMPLOYEE
  - JWT token-based secure authentication
  - Refresh token mechanism
  - Password encryption (bcrypt)
  - Auto-redirect on session expiry

### 2.2 Leave Management âœ… LIVE

#### Leave Types & Policies
- **Sri Lankan Standard Leave Types**
  - Annual Leave (14 days/year)
  - Casual Leave (7 days/year)
  - Medical Leave (7 days/year)
  - Customizable leave type creation
  - Configurable default balances
  
#### Automated Leave Balance System
- **Real-time Balance Tracking**
  - Per-employee, per-leave-type balances
  - Automatic accrual from hire date
  - Transaction history for all changes
  - Decimal precision for partial days
  - Availability computation
  
#### Leave Application Workflow
- **Employee Self-Service**
  - Mobile-friendly leave application form
  - Date range selection
  - Leave type selection
  - Real-time balance validation
  - Status tracking (PENDING, APPROVED, REJECTED)
  
- **Manager Approval Interface**
  - One-click approve/reject workflow
  - Email notifications (configurable)
  - Leave request list with filters
  - Filter by status, year, month, employee
  
- **Leave Calendar**
  - Company-wide calendar view
  - Month navigation
  - Display approved leaves with employee names
  - Leave type visibility
  - Resource planning insights

### 2.3 Attendance Management âœ… LIVE

#### Attendance Tracking
- **Flexible Attendance Entry**
  - Manual daily attendance marking
  - Date-based recording
  - Present/Absent status tracking
  
- **Bulk Import Capability**
  - CSV file upload
  - Biometric device export compatibility
  - Data validation during import
  
- **Integrity Checks**
  - Automatic discrepancy detection
  - Alert on conflicting data (present + on leave)
  - Data validation rules

### 2.4 Payroll Management âœ… LIVE

#### Sri Lankan Statutory Payroll
- **Automated Salary Calculation**
  - Monthly salary processing
  - Basic salary + allowances
  - Automatic deductions
  - Net pay computation
  
- **EPF (Employees' Provident Fund)**
  - Employee contribution: 8% of gross salary (auto-calculated)
  - Employer contribution: 12% of gross salary (auto-calculated)
  - Contribution tracking and reporting
  
- **ETF (Employees' Trust Fund)**
  - Employer contribution: 3% of gross salary (auto-calculated)
  - Automatic calculation and tracking
  
- **PAYE (Pay As You Earn) Tax**
  - Progressive tax calculation per Sri Lankan tax slabs
  - Monthly tax deduction
  - Tax relief management
  
#### Payslip Generation
- **PDF Payslips**
  - Professional individual employee payslips
  - Company branding and logo
  - Detailed earnings breakdown
  - All statutory deductions (EPF, ETF, PAYE)
  - Net pay calculation
  - Secure download endpoint
  
- **Payroll Dashboard**
  - Monthly summary statistics
  - Total employees, gross pay, net pay
  - PAYE tax totals
  - EPF/ETF breakdown (employee + employer)
  - Payslip history table
  - Year/month filtering
  
#### Bank Integration
- **Salary Disbursement Files**
  - **CIPS Format** (Common Integrated Payment System)
  - **SLIPS Format** (Sri Lanka Interbank Payment System)
  - CSV export with validated account numbers
  - Bank-ready files for direct upload
  - One-click download
  - Amount reconciliation and totals
  - Export audit trail

### 2.5 Security & Compliance âœ… LIVE

#### Enterprise-Grade Security
- **Application Hardening**
  - Helmet.js for HTTP header security
  - API rate limiting
  - CORS configuration
  - JWT token rotation
  - Input validation (Zod schemas)
  - SQL injection prevention (Prisma ORM)
  
#### Comprehensive Audit Logging
- **Activity Tracking**
  - Winston logger with daily log rotation
  - Request correlation IDs
  - Separate log streams (error, http, combined)
  - Log retention management
  - User activity audit trail

### 2.6 Testing & Quality Assurance âœ… LIVE

#### Automated Testing
- **Backend Tests**
  - 75+ integration tests (100% passing)
  - Jest test framework
  - API endpoint coverage
  - Auth and authorization tests
  
- **End-to-End Tests**
  - Playwright E2E framework
  - Authentication flow tests
  - Critical user journey tests
  - HTML test reports
  
#### Code Quality
- **Static Analysis**
  - ESLint v9 with strict rules
  - Prettier code formatting
  - TypeScript strict mode
  - CodeQL security scanning
  - Trivy vulnerability scanning
  - Docker image security scanning
  - Secrets detection

### 2.7 DevOps & Infrastructure âœ… LIVE

#### CI/CD Pipeline
- **GitHub Actions Automation**
  - Automated linting (~1 min)
  - Automated testing (~2 min)
  - Production builds (~2 min)
  - Docker multi-stage builds (~4 min)
  - Container registry deployment
  - Total pipeline: ~8 minutes
  - Parallel job execution
  
#### Containerization
- **Docker Infrastructure**
  - Multi-stage builds
  - Production-optimized images (~250MB)
  - Non-root user security
  - Health checks
  - Layer caching optimization
  
#### API Documentation
- **Interactive Documentation**
  - Swagger/OpenAPI 3.0 specification
  - Swagger UI at `/api-docs`
  - All endpoints documented
  - Request/response schemas
  - Authentication examples
  - Try-it-out functionality

---

## 3. Technology Stack

### Frontend
- **React 19** - Latest version with performance optimizations
- **Vite** - Lightning-fast build tool
- **Material-UI (MUI)** - Professional UI components
- **TypeScript** - Type-safe development

### Backend
- **Node.js 20** - Modern JavaScript runtime
- **Express.js** - Web application framework
- **Prisma ORM** - Type-safe database access
- **PostgreSQL 16** - Enterprise-grade database
- **TypeScript** - End-to-end type safety

### Infrastructure
- **Google Cloud Platform (GCP)**
  - Cloud Run (serverless containers)
  - Cloud SQL (managed PostgreSQL)
  - Cloud Storage (document storage)
  - Cloud Build (CI/CD)
  - Cloud Armor (DDoS protection)
  - Cloud CDN (content delivery)

### Security & Monitoring
- **JWT Authentication** - Industry-standard tokens
- **bcrypt** - Password hashing
- **Helmet.js** - Security headers
- **Winston** - Structured logging
- **Cloud Monitoring** - Real-time alerts

---

## 4. Operational Cost Analysis (Per User/Month)

### 4.1 Infrastructure Costs Breakdown

#### Fixed Monthly Costs (Base Infrastructure)
| Component | Service | Specification | Monthly Cost (USD) |
|-----------|---------|---------------|-------------------|
| **Database** | Cloud SQL PostgreSQL | db-custom-1-4096 (1 vCPU, 4GB RAM, 50GB SSD) | $48.00 |
| **Storage** | Cloud Storage | 50GB documents + backups | $2.50 |
| **Load Balancer** | Cloud Load Balancing | HTTPS load balancer | $18.00 |
| **CDN** | Cloud CDN | 100GB traffic | $8.00 |
| **Monitoring** | Cloud Monitoring | Logs + metrics | $5.00 |
| **Backups** | Cloud SQL Backups | 7 days retention | $3.00 |
| **SSL Certificates** | Google-managed SSL | Free | $0.00 |
| **Secret Management** | Secret Manager | 10 secrets | $1.00 |
| **DNS** | Cloud DNS | 1 zone | $0.50 |
| **Total Fixed Costs** | | | **$86.00** |

#### Variable Costs (Per User Tier)

**Backend Compute** (Cloud Run - Serverless)
- vCPU: $0.00002400/vCPU-second
- Memory: $0.00000250/GB-second
- Requests: $0.40 per million requests
- Estimated usage: 50 requests/user/day

**Frontend Hosting** (Cloud Run)
- Static assets on Cloud CDN (included in base CDN cost)
- Minimal compute (serverless)

### 4.2 Cost Per User Tier (Monthly Operating Costs)

#### Tier 1: 1-10 Users
| Cost Component | Calculation | Amount (USD) |
|----------------|-------------|--------------|
| Fixed Infrastructure | Base costs | $86.00 |
| Backend Compute | 10 users Ã— 50 req/day Ã— 30 days Ã— 0.1s Ã— $0.024/vCPU-s | $3.60 |
| Backend Memory | 10 users Ã— 50 req/day Ã— 30 days Ã— 0.1s Ã— 512MB Ã— $0.0025/GB-s | $0.96 |
| Request Charges | (10 Ã— 50 Ã— 30) / 1,000,000 Ã— $0.40 | $0.01 |
| Bandwidth | 10 users Ã— 50MB/month Ã— $0.12/GB | $0.60 |
| **Total Monthly Cost** | | **$91.17** |
| **Cost Per User** | $91.17 / 10 | **$9.12** |
| **Cost Per User (LKR @ 300)** | $9.12 Ã— 300 | **LKR 2,736** |

#### Tier 2: 10-50 Users
| Cost Component | Calculation | Amount (USD) |
|----------------|-------------|--------------|
| Fixed Infrastructure | Base costs | $86.00 |
| Backend Compute | 50 users Ã— 50 req/day Ã— 30 days Ã— 0.1s Ã— $0.024/vCPU-s | $18.00 |
| Backend Memory | 50 users Ã— 50 req/day Ã— 30 days Ã— 0.1s Ã— 512MB Ã— $0.0025/GB-s | $4.80 |
| Request Charges | (50 Ã— 50 Ã— 30) / 1,000,000 Ã— $0.40 | $0.03 |
| Bandwidth | 50 users Ã— 50MB/month Ã— $0.12/GB | $3.00 |
| Database Upgrade | db-custom-2-8192 (2 vCPU, 8GB RAM) | +$48.00 |
| **Total Monthly Cost** | | **$159.83** |
| **Cost Per User** | $159.83 / 50 | **$3.20** |
| **Cost Per User (LKR @ 300)** | $3.20 Ã— 300 | **LKR 960** |

#### Tier 3: 50-100 Users
| Cost Component | Calculation | Amount (USD) |
|----------------|-------------|--------------|
| Fixed Infrastructure | Base costs | $86.00 |
| Backend Compute | 100 users Ã— 50 req/day Ã— 30 days Ã— 0.1s Ã— $0.024/vCPU-s | $36.00 |
| Backend Memory | 100 users Ã— 50 req/day Ã— 30 days Ã— 0.1s Ã— 512MB Ã— $0.0025/GB-s | $9.60 |
| Request Charges | (100 Ã— 50 Ã— 30) / 1,000,000 Ã— $0.40 | $0.06 |
| Bandwidth | 100 users Ã— 50MB/month Ã— $0.12/GB | $6.00 |
| Database Upgrade | db-custom-4-16384 (4 vCPU, 16GB RAM) | +$144.00 |
| Storage Increase | 100GB documents | +$2.50 |
| **Total Monthly Cost** | | **$284.16** |
| **Cost Per User** | $284.16 / 100 | **$2.84** |
| **Cost Per User (LKR @ 300)** | $2.84 Ã— 300 | **LKR 852** |

### 4.3 Cost Summary Table

| User Tier | Total Monthly Cost (USD) | Cost Per User (USD) | Cost Per User (LKR) |
|-----------|-------------------------|---------------------|---------------------|
| **1-10 Users** | $91.17 | $9.12 | LKR 2,736 |
| **10-50 Users** | $159.83 | $3.20 | LKR 960 |
| **50-100 Users** | $284.16 | $2.84 | LKR 852 |

### 4.4 Additional Cost Considerations

#### One-Time Setup Costs
- Initial database migration: **$0** (automated via Cloud Build)
- SSL certificate setup: **$0** (Google-managed)
- Domain setup: **~$12/year** (Google Domains)
- Initial data seeding: **$0** (automated scripts)

#### Optional Add-On Costs
- **Custom domain email**: $6/user/month (Google Workspace)
- **Enhanced support**: $50/month (24/7 support SLA)
- **Data export service**: $25/month (automated backup to Cloud Storage)
- **Advanced analytics**: $30/month (BigQuery integration)
- **Custom integrations**: Development time-based pricing

#### Scaling Considerations
- **100-200 users**: $500-600/month (~$3.00-3.50/user)
- **200-500 users**: $900-1,200/month (~$2.40-2.80/user)
- **500+ users**: Enterprise pricing with dedicated infrastructure

---

## 5. Competitive Cost Analysis

### Market Comparison (Monthly Cost Per User)

| Solution | Cost/User (USD) | Sri Lankan Compliance | Local Support |
|----------|----------------|----------------------|---------------|
| **International HR Systems** | $15-30 | âŒ No | âŒ No |
| **Enterprise Local Systems** | $12-25 | âœ… Yes | âœ… Yes |
| **Excel/Manual** | $0 (+ labor cost) | âš ï¸ Manual | N/A |
| **Simpala HR (1-10 users)** | **$9.12** | âœ… Yes | âœ… Yes |
| **Simpala HR (10-50 users)** | **$3.20** | âœ… Yes | âœ… Yes |
| **Simpala HR (50-100 users)** | **$2.84** | âœ… Yes | âœ… Yes |

### Total Cost of Ownership (TCO) Savings

#### Example: 50-Employee Company
**Manual/Excel Method:**
- HR Admin time: 40 hours/month @ $10/hour = $400/month
- Error cost (EPF/ETF mistakes): ~$100/month average
- Compliance risk: Unquantifiable
- **Total hidden cost: $500+/month**

**Simpala HR:**
- System cost: $159.83/month
- HR Admin time: 8 hours/month @ $10/hour = $80/month
- Error cost: ~$0 (automated)
- **Total cost: $239.83/month**
- **Savings: $260.17/month (52% reduction)**
- **Annual savings: $3,122/year**

---

## 6. Revenue Model Recommendation

### Suggested Pricing Strategy (3x Cost Markup)

| User Tier | Our Cost/User | Suggested Price/User | Gross Margin |
|-----------|---------------|---------------------|--------------|
| **1-10 Users** | $9.12 (LKR 2,736) | **$30** (LKR 9,000) | 69% |
| **10-50 Users** | $3.20 (LKR 960) | **$10** (LKR 3,000) | 68% |
| **50-100 Users** | $2.84 (LKR 852) | **$8** (LKR 2,400) | 65% |

### Revenue Projections (Conservative)

#### Year 1 (6 months active sales)
- Target: 100 companies
- Mix: 60 companies (10-50 users avg 30) + 30 companies (1-10 avg 5) + 10 companies (50-100 avg 75)
- Monthly Revenue:
  - Tier 1: 30 companies Ã— 5 users Ã— $30 = $4,500
  - Tier 2: 60 companies Ã— 30 users Ã— $10 = $18,000
  - Tier 3: 10 companies Ã— 75 users Ã— $8 = $6,000
  - **Total: $28,500/month**
- Annual Revenue (6 months): **$171,000**
- Annual Cost: ~$85,000
- **Net Profit Year 1: $86,000**

#### Year 2 (Full year)
- Target: 300 companies (3x growth)
- **Annual Revenue: $1,026,000**
- Annual Cost: ~$255,000
- **Net Profit Year 2: $771,000**

---

## 7. Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Database performance degradation | Medium | High | Auto-scaling Cloud SQL, read replicas, query optimization |
| Service downtime | Low | High | Multi-region deployment, 99.95% SLA from GCP, health checks |
| Data loss | Very Low | Critical | Automated daily backups, 7-day retention, point-in-time recovery |
| Security breach | Low | Critical | Encryption at rest/transit, regular security audits, penetration testing |
| API rate limiting issues | Medium | Medium | Adaptive rate limiting, caching layer, CDN |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Slow customer acquisition | Medium | High | Free trial period, freemium tier, partner with accounting firms |
| Compliance changes | Medium | High | Regular monitoring of labor law changes, rapid update capability |
| Competition | High | Medium | Feature differentiation, superior UX, local support, competitive pricing |
| Currency fluctuation | High | Medium | Lock USD costs via Google Cloud committed use discounts |
| Customer churn | Medium | High | Excellent onboarding, customer success team, regular feature updates |

---

## 8. Implementation Roadmap

### Phase 1: Current (Complete) âœ…
- Core HR, Leave, Attendance, Payroll modules
- Sri Lankan compliance (EPF, ETF, PAYE)
- Bank file exports (CIPS, SLIPS)
- Security hardening
- Automated testing
- CI/CD pipeline
- API documentation

### Phase 2: Q1 2026 (Planned)
- Advanced leave policies (carry-forward, encashment)
- Multi-currency payroll
- Enhanced reporting and analytics
- Mobile app (iOS/Android)
- Biometric device integration
- Shift management

### Phase 3: Q2 2026 (Planned)
- Employee self-service portal
- Performance management module
- Recruitment and onboarding
- Training and development tracking
- Asset management
- Advanced analytics dashboard

### Phase 4: Q3-Q4 2026 (Future)
- API marketplace for integrations
- AI-powered insights
- Workforce planning tools
- Multi-company support
- White-label option for partners

---

## 9. Recommendations

### Immediate Actions (Next 30 Days)
1. âœ… **Launch Beta Program**
   - Recruit 10 pilot companies (mix of tiers)
   - Offer 3 months free in exchange for feedback
   - Validate pricing model

2. âœ… **Optimize Costs**
   - Implement committed use discounts (20-30% savings)
   - Enable Cloud SQL query insights
   - Set up cost alerts and budgets

3. âœ… **Marketing Preparation**
   - Create demo environment with sample data
   - Develop case studies from beta customers
   - Build landing page with pricing
   - Set up customer support channels

### Medium-Term Actions (3-6 Months)
1. **Customer Acquisition**
   - Partner with 5 accounting firms in Colombo
   - Attend SME business forums
   - Launch Google Ads campaign
   - Offer referral incentives

2. **Product Enhancement**
   - Mobile app development (React Native)
   - Advanced reporting features
   - Custom integrations (accounting software)
   - Payroll advance features

3. **Operational Excellence**
   - Hire customer success manager
   - Create comprehensive user documentation
   - Build training video library
   - Establish SLA commitments

### Long-Term Actions (6-12 Months)
1. **Scale Infrastructure**
   - Multi-region deployment (Singapore, India)
   - Implement caching layer (Redis)
   - Database read replicas
   - Advanced monitoring (APM)

2. **Market Expansion**
   - Enter Indian market (similar compliance needs)
   - Bangladesh market exploration
   - White-label partnerships
   - Enterprise tier (500+ employees)

3. **Product Maturity**
   - AI-powered payroll insights
   - Predictive analytics
   - Workforce planning tools
   - Mobile app feature parity

---

## 10. Conclusion

Simpala HR represents a compelling market opportunity with:

âœ… **Strong Product-Market Fit**: Purpose-built for Sri Lankan SMBs  
âœ… **Competitive Unit Economics**: $2.84-$9.12 cost per user vs. $30+ market rates  
âœ… **Scalable Architecture**: Cloud-native infrastructure that grows with demand  
âœ… **Defensible Moat**: Deep Sri Lankan compliance integration  
âœ… **Clear Path to Profitability**: 65-69% gross margins, breakeven at ~150 customers

### Financial Summary
- **Operating Cost**: $2.84-$9.12 per user/month (tier-dependent)
- **Suggested Pricing**: $8-$30 per user/month
- **Target Year 1 Revenue**: $171,000 (100 customers, 6 months)
- **Target Year 2 Revenue**: $1,026,000 (300 customers, full year)
- **Gross Margin**: 65-69%

### Next Steps
1. Approve beta launch and pricing model
2. Allocate marketing budget for customer acquisition
3. Commit to Google Cloud platform (lock in discounts)
4. Hire customer success and support staff
5. Begin Phase 2 development planning

---

**Document Classification:** Confidential - Management Only  
**Prepared By:** Product & Engineering Team  
**Review Date:** December 24, 2025  
**Next Review:** March 2026

