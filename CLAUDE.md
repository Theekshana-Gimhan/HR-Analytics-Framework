# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NexusHR** (codebase name: Simpala HR) is a Final Year Research Project (COM 4901) at Kaatsu International University. It is a **Cost-Effective Predictive HR Analytics Framework** targeting Sri Lankan SMEs (20–50 employees), with a goal of < LKR 10,000/month operational cost.

The system combines a production HR platform (payroll, leave, attendance) with a GCP-based ML pipeline for employee attrition prediction using Vertex AI AutoML.

---

## Repository Structure

```
hr_base_system/          # Main monorepo (the working application)
  backend/               # Node.js/Express/Prisma REST API (port 3001)
  frontend/              # React 19/Vite/MUI SPA (port 3000)
  packages/types/        # Shared TypeScript types (@simpala/types)
  ops/                   # Cloud Build, deploy, DB, seed, test scripts
  tests/                 # Performance/E2E tests
  .github/               # CI/CD workflows and copilot-instructions.md
data/                    # CSV datasets for ML pipeline
scripts/                 # Python data processing scripts
docs/                    # Technical and product documentation
references/              # Research papers
```

---

## Commands

All commands run from `hr_base_system/backend/` or `hr_base_system/frontend/` unless noted.

### Backend

```powershell
npm run dev                # ts-node + nodemon hot reload
npm run build              # prisma generate + tsc compile
npm test                   # Full test suite (sequential, requires Postgres)
npm run test:unit          # Unit tests only (no DB required)
npm run test:integration   # Integration tests only
npm run test:coverage      # Coverage report
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix lint errors
npm run typecheck          # TypeScript validation without emit
npm run seed               # Full dev seed (1 company, 20 employees, 1300 attendance records)
npm run seed:test          # Minimal test seed (1 company, 3 employees)
npm run db:reset           # Drop + migrate + reseed
npm run extract-ai-data    # Export anonymized data for ML pipeline
```

Run `npm test -- --runInBand` when running tests manually (backend uses `maxWorkers: 1`).

### Frontend

```powershell
npm run dev        # Vite dev server on :3000
npm run build      # Production build → dist/
npm test           # Vitest unit tests
npm run lint       # ESLint zero-warnings check
npm run typecheck  # TypeScript validation
npm run e2e        # Playwright headless E2E
npm run e2e:ui     # Playwright interactive mode
```

### Monorepo Root (`hr_base_system/`)

```powershell
npm install        # Install all workspaces
npm run build      # Build packages/types → backend → frontend in order
```

### Local Development with Docker

```powershell
cd hr_base_system/backend
docker compose up --build   # Starts Postgres on :5432 + backend on :3001
```

### Fast Deployment (dev iteration only, bypasses full CI/CD)

```powershell
.\quick-deploy.ps1 -Service backend    # or frontend
# Dev URLs:
# Backend:  https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app
# Frontend: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app
```

Push to `dev` or `main` to trigger the full GitHub Actions pipeline (20–30 min with tests + migrations).

### Database (Prisma — run from `backend/`)

```powershell
npx prisma generate                         # Regenerate client after schema changes
npx prisma migrate dev --name <name>        # Create and apply migration
npx prisma migrate deploy                   # Apply migrations in prod/staging
```

---

## Backend Architecture

### Request Lifecycle

```
Route → validateRequest(ZodSchema) → authenticate → authorize([roles]) → Controller → Service → Prisma
```

- `authenticate` injects `req.user: { id, role, companyId }` on all protected routes
- `authorize(['OWNER', 'ADMIN'])` is role-gated middleware
- `validateRequest` wraps Zod schemas defined in `schemas/validation.schemas.ts`

### Multi-Tenancy — Critical Rule

**Every Prisma query must filter by `companyId`** from `req.user.companyId`. Never expose data across companies. See `leave.controller.ts:createLeaveType` as the reference implementation.

### Prisma Field Naming — Critical Rule

Prisma models use **camelCase** fields with `@map` for snake_case DB columns. API input often uses snake_case, so you must explicitly map before Prisma operations:

```typescript
const { default_balance, requires_anniversary, ...rest } = inputData;
await prisma.leaveType.create({
  data: { ...rest, defaultBalance: default_balance, requiresAnniversary: requires_anniversary }
});
```

### Transaction Pattern

Use `prisma.$transaction` for multi-step operations (leave applications, balance updates, payroll generation).

### Caching

Dashboard endpoints use an in-memory LRU cache (500 entries, 60s TTL). The provider interface is Redis-ready. Cache keys must include `companyId` for tenant isolation. Health check at `GET /health` includes cache metrics.

### Key Service Files

| Service | Responsibility |
|---|---|
| `auth.service.ts` | JWT/WebAuthn, token rotation, bcrypt |
| `leave.service.ts` | Application workflow, quota calculation, transactions |
| `payroll.service.ts` | EPF/ETF/PAYE calculation, payslip generation, bank file export |
| `attendance.service.ts` | Recording, bulk CSV import, correction requests |
| `bankFile.service.ts` | CIPS/SLIPS format generation with audit trail |

---

## Frontend Architecture

### Code Splitting

All routes are lazy-loaded via `React.lazy()` in `App.tsx`. Rollup chunks in `vite.config.ts` split MUI, TanStack Query, and React core into separate vendor bundles.

### API Client

Base client is in `lib/api/client.ts` (or `lib/api.ts`). All calls use centralized error handling and inject the bearer token from `localStorage`.

### Environment Variables

Frontend vars **must** start with `VITE_`:

```
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

### Providers (composition in `app/providers/AppProviders.tsx`)

`AppThemeProvider` (MUI theme) → `QueryProvider` (TanStack React Query) → `FeedbackProvider` (toasts/snackbars)

---

## Sri Lankan Compliance

### Payroll Calculations

| Item | Rate |
|---|---|
| EPF Employee | 8% of basic salary |
| EPF Employer | 12% of basic salary |
| ETF | 3% of basic salary |
| PAYE | Progressive (see PRD) |

### Statutory Leave Minimums

- Annual: 14 days/year
- Casual: 7 days/year
- Medical: 7 days/year (accrual requires anniversary date)

### Bank File Exports

Supports CIPS and SLIPS formats. Implementation in `services/bankfile.service.ts`.

### Data Privacy

Governed by Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022. PII must be stripped at the database layer before ML training. Cloud DLP triggers before any cross-border data movement.

---

## ML / AI Pipeline (GCP)

**Current status:** Phase 2 complete — `data/nexus_hr_master_dataset.csv` (1970 records) is ready for training.

### Data Sources

- `data/ibm_hr_attrition.csv` — IBM benchmark (1470 records)
- `data/synthetic_hr_data.csv` — Generated Sri Lankan SME data (500 records)
- `data/nexus_hr_master_dataset.csv` — Merged, cleaned master dataset

### GCP Services

| Service | Purpose |
|---|---|
| Vertex AI AutoML Tabular | Attrition prediction model |
| Vertex Explainable AI | SHAP feature attributions for manager trust |
| BigQuery | Serverless analytics and feature engineering |
| Google Cloud Storage | Dataset and model artifact storage |
| Dialogflow CX | Weekly "Pulse Check" employee sentiment surveys |
| Cloud DLP | Automated PII masking before model training |
| Cloud Run | Serverless container deployment |

### ML Target

Recall > 80% on attrition label (minimize false negatives for early warning).

---

## Common Pitfalls

1. **Prisma client out of sync** — Always run `npx prisma generate` after any `schema.prisma` change.
2. **Field name mismatch** — API accepts snake_case; Prisma requires camelCase. Map explicitly.
3. **Missing `companyId` filter** — Every query must be scoped to the authenticated user's company.
4. **Workspace commands** — Run `npm` commands from the correct workspace directory, not the repo root (unless building all workspaces).
5. **Frontend env vars** — Must be prefixed with `VITE_` to be included in the browser bundle.
6. **Transaction isolation** — Use `prisma.$transaction` for any operation touching multiple tables.
7. **Test runner** — Backend tests require a live Postgres instance and must run sequentially (`--runInBand`).

---

## Key Reference Files

- `docs/technical/SOLUTION_ARCHITECTURE.md` — System design and data flows
- `docs/product/ROADMAP.md` — 20-task development plan with priorities
- `docs/technical/TECHNICAL_SPECIFICATION.md` — Stack decisions and NFRs
- `backend/prisma/schema.prisma` — Prisma schema and field naming conventions
- `backend/src/middleware/auth.middleware.ts` — Auth pattern reference
- `backend/src/routes/leave.routes.ts` — Route validation pattern
- `backend/src/services/leave.service.ts` — Transaction pattern examples
- `packages/types/src/index.ts` — Shared TypeScript type definitions
- `GEMINI.md` — Current project status and next steps
