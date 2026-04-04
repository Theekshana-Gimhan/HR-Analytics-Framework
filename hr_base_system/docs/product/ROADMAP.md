# Project Roadmap: Simpala HR

## 1. Status Audit (The "Now")

| Area | Progress | Status Summary |
| :--- | :---: | :--- |
| **Backend** | ~92% | Core services complete. Audit Log API, Document Expiry CRUD, Sri Lankan leave policy validations added (Sprint 4). Emergency contacts + self-service leave balance (Sprint 3). Correction request approval workflow (Sprint 2). |
| **Frontend** | ~83% | Core UI complete. Audit Log admin page and Document Expiry dashboard added (Sprint 4). Leave balance widget (Sprint 3). Attendance check-in/out and correction request UI (Sprint 2). |
| **Infra** | ~82% | Cloud Run ready, Dockerized, CI/CD exists. Dev environment smoke-test verified clean (Feb 2026). New service URL deployed. |
| **Product** | ~87% | Full CRUD for document expiry tracking. Audit logs for owners. Leave policies enforce Sri Lankan labor law (Casual 2-day max, Medical certification, Annual probation block). |

### Sprint Delivery Summary (Feb 2026)

| Sprint | Key Features | Tests | Status |
|--------|-------------|-------|--------|
| Sprint 1 | `CANCELLED` leave status, `LATE/HALF_DAY/WFH/ON_LEAVE` attendance statuses, `DocumentCategory` enum | 5/5 ✅ | Delivered |
| Sprint 2 | Check-in/out endpoints, monthly attendance summary, correction request workflow with admin approval | 9/9 ✅ | Delivered |
| Sprint 3 | Employee emergency contact fields, `GET /leave/balance/me` self-service endpoint, frontend balance widgets | 7/7 ✅ | Delivered |
| Sprint 4 | Audit Log API + admin page, Document Expiry CRUD API + dashboard UI, Sri Lankan leave policy validations (casual 2-day cap, medical cert, probation block) | 10/10 ✅ | Delivered |
| **Total** | | **31/31** ✅ | **All Green** |

## 2. Milestone Mapping (The Journey)

```mermaid
gantt
    title Simpala HR Roadmap
    dateFormat  YYYY-MM-DD
    section M1: Immediate Gap Closure
    Frontend Restructure (Pages vs Components) :active, m1_1, 2026-02-04, 3d
    Backend: User Profile & Settings API       :active, m1_2, 2026-02-05, 3d
    Fix Flaky Integration Tests                :        m1_3, 2026-02-06, 2d

    section M2: MVP Release
    Leave Approval Flow (UI + Backend)         :        m2_1, 2026-02-08, 4d
    Payroll Generation & PDF Export            :        m2_2, 2026-02-10, 5d
    Attendance Tracking & Reports              :        m2_3, 2026-02-12, 4d

    section M3: Scale & Optimization
    Company Management (Admin UI)              :done,   m3_1, 2026-02-11, 2026-02-11
    Role-Based Access Control (Granular)       :done,   m3_2, 2026-02-11, 2026-02-11
    Performance Optimization (Caching)         :done,   m3_3, 2026-02-11, 2026-02-11
    STRIDE Threat Model                        :done,   m3_4, 2026-02-11, 2026-02-11

    section M4: Final Polish
    Security Audit (Pen Test Fixes)            :        m4_1, 2026-03-05, 5d
    User Documentation & Walkthroughs          :        m4_2, 2026-03-08, 3d
    Production Launch                          :crit,   m4_3, 2026-03-12, 1d
```

## 3. Detail per Milestone

### ðŸ›‘ M1: Immediate Gap Closure (Stability First)
*Focus: Stabilize the base and fix "invisible" technical debt.*
- **PO Priority**: ensure existing features work reliably (Tests).
- **Tech Lead Requirements**:
    - Move "Page" components to `src/pages` for clear separation.
    - Implement `CompanyController` and `UserController` for profile/settings.
    - Fix database connection issues in Integration Tests to ensure CI reliability.
- **DoD**: All integration tests pass locally. Frontend structure mimics standard React patterns. User can update their own profile.

### ðŸš€ M2: MVP (Feature Complete)
*Focus: deliver the core value proposition.*
- **PO Priority**: Users must be able to Request Leave, Approve it, and Run Payroll.
- **Tech Lead Requirements**:
    - Complete the `LeaveService` logic (accruals, carry-forward).
    - Implement `BankFileService` for Payroll exports.
    - Add "My Requests" vs "Team Requests" views in Frontend.
- **DoD**: A user can go from "Hired" -> "Request Leave" -> "Get Paid" without database intervention.

### ðŸ“ˆ M3: Scale & Optimization
*Focus: Multi-tenancy, security hardening, and Admin experience.*
- **PO Priority**: Admins can manage Company details and Roles self-service.
- **Tech Lead Requirements**:
    - ✅ `CompanyService` for creating/editing tenants.
    - ✅ In-memory LRU cache (Redis-swappable) for dashboard, leave types, and employee list endpoints.
    - ✅ Permission-based RBAC (`checkPermission()`) replacing all hardcoded role checks.
    - ✅ STRIDE threat model with remediation of CRITICAL/HIGH findings.
- **DoD**: Super Admin can provision a new Company via UI. All routes protected by granular permissions. Threat model documented.

### âœ¨ M4: Final Polish & Launch
*Focus: Trust and Excellence.*
- **PO Priority**: Marketing ready, bug-free, secure.
- **Tech Lead Requirements**:
    - Rate Limiting hardening.
    - ✅ Audit Logs visualization (Sprint 4 — admin page with filters, color-coded action chips).
- **DoD**: Security scan passes with 0 Critical/High issues. Page load time < 1s.

## 4. Resource & Time Estimation
- **Bottlenecks**:
    - **Frontend Capacity**: Refactoring `src/components` to `src/pages` might take time but is crucial for maintainability.
    - **Testing**: Flaky integration tests are a major risk for regression. Fix this ASAP.

