# Regression Test Cycle Report — Simpala HR

**Date:** February 13, 2026  
**Sprint:** Sprint 3 (Full Regression — Sprints 1 + 2 + 3)  
**Status:** ✅ Pass — 21/21 Live Smoke Tests Green — 0 Critical/High Bugs

---

## 1a. Live Cloud Smoke Tests — Sprint 1 + 2 + 3

**Environment:** `https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1`  
**Script:** `ops/test/sprint-all-smoke-tests.ps1`  
**Run date:** 2026-02-13  
**Result:** ✅ **21 / 21 PASSED**

### Sprint 1 — Leave/Attendance/Document Schema Extensions
| Test | Description | Result |
|------|-------------|--------|
| S1-T1 | Create casual leave → admin cancels it (CANCELLED status) | ✅ PASS |
| S1-T2 | Employee can read leave types | ✅ PASS |
| S1-T3 | Document upload with category=IDENTIFICATION | ✅ PASS |
| S1-T4 | Document upload with category=OTHER | ✅ PASS |
| S1-T5 | At least 3 statutory leave types exist | ✅ PASS |

### Sprint 2 — Attendance Check-in/out & Correction Requests
| Test | Description | Result |
|------|-------------|--------|
| S2-T1 | Employee check-in (or finds existing today's record) | ✅ PASS |
| S2-T2 | Duplicate check-in correctly returns 409 | ✅ PASS |
| S2-T3 | Employee check-out returns success | ✅ PASS |
| S2-T4 | Monthly attendance summary returns valid data | ✅ PASS |
| S2-T5 | Employee creates correction request | ✅ PASS |
| S2-T6 | Employee sees their own correction requests | ✅ PASS |
| S2-T7 | Admin sees all company correction requests | ✅ PASS |
| S2-T8 | Admin approves correction request | ✅ PASS |
| S2-T9 | Attendance record status updated to WFH after approval | ✅ PASS |

### Sprint 3 — Emergency Contact + Self-Service Leave Balance
| Test | Description | Result |
|------|-------------|--------|
| S3-T1 | Employee saves emergency contact via PATCH /users/me | ✅ PASS |
| S3-T2 | GET /users/me returns saved emergency contact | ✅ PASS |
| S3-T3 | Partial PATCH preserves emergency contact fields | ✅ PASS |
| S3-T4 | GET /leave/balance/me returns employee's balances | ✅ PASS |
| S3-T5 | Balance response has flat leaveTypeName/accrued/used/available | ✅ PASS |
| S3-T6 | Emergency contact can be cleared (empty string) | ✅ PASS |
| S3-T7 | Emergency contact can be re-set after clearing | ✅ PASS |

> **Bugs found during smoke-test authoring (fixed before sign-off):**
> - `updateProfileSchema` (validation middleware) was missing `emergency_contact_name/phone` fields → fields stripped before controller ran → **Fixed**
> - Frontend `MyLeavesWidget` / `LeavePage` used `balance.leaveType.name` (nested) instead of `balance.leaveTypeName` (flat) → **Fixed**

---

## 1. Test Execution Summary

### Backend Unit Tests
| Metric | Result |
|--------|--------|
| Test Suites | 18 passed, 1 skipped, 19 total |
| Tests | 215 passed, 1 skipped, 216 total |
| Failures | 0 |
| Duration | ~25s |

### Backend Service Coverage (M4.0 targets)
| Service | Statements | Branches | Functions | Lines | Status |
|---------|-----------|----------|-----------|-------|--------|
| auth.service.ts | 100% | 100% | 100% | 100% | ✅ |
| leave.service.ts | 89.38% | 80%+ | 85%+ | 89.38% | ✅ |
| payroll.service.ts | 98.97% | 95%+ | 100% | 98.97% | ✅ |
| bankFile.service.ts | 100% | 100% | 100% | 100% | ✅ |

### Frontend Unit Tests
| Metric | Result |
|--------|--------|
| Framework | Vitest + React Testing Library |
| Coverage Thresholds | 70% branches/functions/lines/statements |
| Status | ✅ Configured and enforced |

### E2E Tests
| Metric | Result |
|--------|--------|
| Framework | Playwright (Chromium) |
| Test Files | 12 spec files |
| CI Integration | ✅ Added to deploy-dev.yml |
| Retries | 2 (in CI) |

---

## 2. Test Categories Covered

| Category | Tests | Status |
|----------|-------|--------|
| Authentication (login, JWT, refresh) | 28 | ✅ |
| Leave Management (CRUD, apply, approve, reject) | 35 | ✅ |
| Payroll (calculate, batch, PDF, statistics) | 24 | ✅ |
| Bank File (CSV generation, validation) | 19 | ✅ |
| Employee CRUD | Integration suite | ✅ |
| Authorization (role-based access) | Integration suite | ✅ |
| Document Management | Integration suite | ✅ |
| E2E Auth & Navigation | Playwright | ✅ |
| E2E Leave Workflows | Playwright | ✅ |
| E2E Payroll Workflows | Playwright | ✅ |
| E2E Employee Lifecycle | Playwright | ✅ |

---

## 3. Bug Summary

| Severity | Count | Details |
|----------|-------|---------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |
| Low | 0 | — |

**Acceptance Criteria Met:** ✅ 0 Critical/High bugs

---

## 4. Regression Areas Verified

- [x] User authentication (login, logout, token refresh)
- [x] Employee directory (list, search, pagination, CRUD)
- [x] Leave type management (create, update, statutory caps)
- [x] Leave application workflow (apply, approve, reject, **cancel**, balance updates)
- [x] **Self-service leave balance (GET /leave/balance/me)**
- [x] Payroll calculation (EPF 8%/12%, ETF 3%, PAYE progressive tax)
- [x] Bank file export (CIPS/SLIPS CSV generation)
- [x] **Attendance check-in / check-out (Sprint 2)**
- [x] **Attendance correction requests with admin approval (Sprint 2)**
- [x] **Attendance status propagation on approval (Sprint 2)**
- [x] Attendance upload (CSV parsing)
- [x] **Document upload with DocumentCategory enum (IDENTIFICATION, OTHER, etc.) (Sprint 1)**
- [x] **Employee emergency contact fields (Sprint 3)**
- [x] Role-based authorization (OWNER, ADMIN, EMPLOYEE)
- [x] Multi-tenancy isolation (companyId filtering)
- [x] API input validation (Zod schemas)
- [x] Error handling (HttpError hierarchy)

---

## 5. Sign-Off

| Role | Date | Status |
|------|------|--------|
| QA Lead | Feb 12, 2026 | ✅ Approved (unit/integration/E2E) |
| Dev Lead | Feb 12, 2026 | ✅ Approved (unit/integration/E2E) |
| QA Lead | Feb 13, 2026 | ✅ Approved (Sprint 1+2+3 live smoke tests, 21/21) |
| Dev Lead | Feb 13, 2026 | ✅ Approved (Sprint 1+2+3 live smoke tests, 21/21) |

---

*Report based on automated test runs and CI pipeline results.*
