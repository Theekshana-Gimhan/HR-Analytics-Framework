# Sprint 4 Delivery Report

**Date**: February 28, 2026  
**Branch**: `dev`  
**Status**: ✅ Delivered — 10/10 smoke tests green, 31/31 full regression green

---

## Deployed Services

| Service | URL | Revision |
|---------|-----|----------|
| Backend | https://simpalahr-backend-dev-85939737092.us-central1.run.app | simpalahr-backend-dev-00223-9qt |
| Frontend | https://simpalahr-frontend-dev-85939737092.us-central1.run.app | simpalahr-frontend-dev-00150-cqv |

---

## Features Delivered

### 1. Audit Log API + Admin Page
- **Backend**: `GET /api/v1/audit-logs` with OWNER-only RBAC (`AUDIT_LOG_VIEW` permission)
- **Frontend**: Full admin page at `/admin/audit-logs` with:
  - Paginated table with action, entity type, and date range filters
  - Color-coded action chips grouped by category (Leave, Payroll, Employee, Roster, Auth, Admin)
  - Tooltip for JSON details per log entry
- **RBAC**: OWNER-only. ADMIN and EMPLOYEE explicitly denied (403).
- **Files**: `audit.controller.ts`, `audit.routes.ts`, `AuditLogPage.tsx`, `audit.ts` (API client)

### 2. Document Expiry CRUD API + Dashboard UI
- **Backend**: Full REST API at `/api/v1/expiry-documents`
  - `GET /summary` — counts by status (valid, expiringSoon, expired, total)
  - `GET /` — list with filters (employeeId, status, documentType, expiringWithinDays)
  - `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` with validation
- **Frontend**: Dashboard page at `/documents/expiry` with:
  - Summary cards (valid/expiring/expired/total)
  - Filterable, paginated table
  - Create/Edit dialog with full form
  - Delete confirmation dialog
- **RBAC**: `EXPIRY_DOCUMENT_VIEW` and `EXPIRY_DOCUMENT_MANAGE` permissions for ADMIN and OWNER
- **Document types**: LICENSE, CERTIFICATION, VISA, WORK_PERMIT, MEDICAL_CERTIFICATE, BACKGROUND_CHECK, OTHER
- **Files**: `expiry-document.service.ts`, `expiry-document.controller.ts`, `expiry-document.routes.ts`, `ExpiryDocumentsPage.tsx`, `expiryDocuments.ts` (API client)

### 3. Sri Lankan Leave Policy Validations
- **Casual Leave**: Max 2 consecutive days per request (Shop & Office Act compliance)
- **Medical Leave**: Requests >2 days require a reason (with medical certificate reminder)
- **Annual Leave**: Blocked during probation period (first 365 days from employment start)
- **Files**: `leave.service.ts` (3 new validation blocks), `simpala-types-fixed-shim.d.ts` (added `reason` field)

---

## Smoke Test Results

### Sprint 4 Tests (10/10 ✅)
| # | Test | Result |
|---|------|--------|
| S4-T1 | OWNER can GET /audit-logs | ✅ PASS |
| S4-T2 | ADMIN denied GET /audit-logs | ✅ PASS (403) |
| S4-T3 | EMPLOYEE denied GET /audit-logs | ✅ PASS (403) |
| S4-T4 | GET /expiry-documents/summary | ✅ PASS |
| S4-T5 | POST /expiry-documents (create) | ✅ PASS |
| S4-T6 | GET /expiry-documents (list + verify) | ✅ PASS |
| S4-T7 | PATCH /expiry-documents/:id (update) | ✅ PASS |
| S4-T8 | DELETE /expiry-documents/:id | ✅ PASS |
| S4-T9 | Casual Leave >2 days rejected | ✅ PASS (400) |
| S4-T10 | Medical Leave >2 days no reason rejected | ✅ PASS (400) |

### Full Regression (31/31 ✅)
- Sprint 1: 5/5 ✅
- Sprint 2: 9/9 ✅
- Sprint 3: 7/7 ✅
- Sprint 4: 10/10 ✅

---

## Files Changed

### New Files (Backend)
- `backend/src/controllers/audit.controller.ts`
- `backend/src/routes/audit.routes.ts`
- `backend/src/services/expiry-document.service.ts`
- `backend/src/controllers/expiry-document.controller.ts`
- `backend/src/routes/expiry-document.routes.ts`

### New Files (Frontend)
- `frontend/src/lib/api/audit.ts`
- `frontend/src/lib/api/expiryDocuments.ts`
- `frontend/src/pages/Admin/AuditLogPage.tsx`
- `frontend/src/pages/Documents/ExpiryDocumentsPage.tsx`

### New Files (Tests)
- `ops/test/sprint4-smoke-tests.ps1`

### Modified Files
- `backend/src/middleware/rbac.ts` — 3 new permissions
- `backend/src/index.ts` — 2 new route registrations
- `backend/src/schemas/validation.schemas.ts` — 2 new Zod schemas
- `backend/src/services/leave.service.ts` — 3 leave policy validations
- `backend/src/types/simpala-types-fixed-shim.d.ts` — added `reason` field
- `frontend/src/lib/api/index.ts` — 2 new exports
- `frontend/src/lib/api/hooks.ts` — 6 new hooks + query keys
- `frontend/src/App.tsx` — 2 new lazy routes
- `frontend/src/routes/navConfig.tsx` — 2 new nav items
- `ops/test/sprint-all-smoke-tests.ps1` — Sprint 4 tests added, base URL updated
- `quick-deploy.ps1` — fixed GCP project ID
- `ops/cloudbuild/cloudbuild-frontend-dev.yaml` — updated backend URL

---

## Technical Notes
- **Type shim fix**: `simpala-types-fixed-shim.d.ts` was overriding the `@simpala/types` package. Had to add `reason?: string` to `ApplyForLeaveData` to fix TS2339 error.
- **Deploy fix**: `quick-deploy.ps1` had wrong `PROJECT_ID`. Fixed to `long-operator-466309-g6`. Also `gcloud run deploy --source` routes to wrong Artifact Registry repo — used `gcloud builds submit --config` instead.
- **Service URL change**: New Cloud Run URLs use `85939737092` suffix instead of previous `wxbl5wur4q`.
