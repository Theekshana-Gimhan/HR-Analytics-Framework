# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NexusHR** (codebase name: Simpala HR) is a Final Year Research Project (COM 4901) at Kaatsu International University. It is a **Cost-Effective Predictive HR Analytics Framework** targeting Sri Lankan SMEs (20–50 employees), with a goal of < LKR 10,000/month operational cost.

The system combines a production HR platform (payroll, leave, attendance) with a GCP-based ML pipeline for employee attrition prediction using scikit-learn Random Forest + SHAP (Explainable AI).

---

## Repository Structure

```
hr_base_system/          # Main monorepo (the working application)
  backend/               # Node.js/Express 5/Prisma 6 REST API (port 3001)
  frontend/              # React 19/Vite/MUI SPA (port 3000)
  packages/types/        # Shared TypeScript types (@simpala/types)
  ops/                   # Cloud Build, deploy, DB, seed, test scripts
  tests/                 # Performance/E2E tests
  .github/               # CI/CD workflows and copilot-instructions.md
data/                    # ML datasets (master, validation, benchmark, raw sources)
  raw/                   # Downloaded real-world datasets (Saudi, Russian, Sri Lanka)
scripts/                 # Python ML pipeline (5 scripts, run in order)
docs/                    # Technical and product documentation
references/              # Research papers (17 references)
masters_plan.md          # Comprehensive project record (all decisions, methodology, timeline)
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

## ML / AI Pipeline

**Current status:** Phase 3 — `scripts/train_model.py` runs end-to-end. Two models reported: a weak cross-domain **transfer** model (SL ROC-AUC ~0.64) and a strong **local** model (SL ROC-AUC ~0.94). See masters_plan.md §12. GCP deployment pending.

### Data Strategy

Training uses weighted multi-source data (real international + calibrated synthetic). Validation uses held-out real Sri Lankan data.

| File | Records | Role |
|---|---|---|
| `data/nexus_hr_master_dataset.csv` | 2,820 | Training (Saudi Real 1,191 + Russian Real 1,129 + Synthetic 500) |
| `data/validation_srilanka.csv` | 230 | Held-out validation (real Sri Lankan, never in training; 8 psychometric constructs) |
| `data/benchmark_ibm.csv` | 1,470 | Published comparison only |
| `data/calibration_params.json` | — | Logistic regression coefficients from 2,550 real records |

Real data gets weight 2.0, synthetic gets 0.5. Income is z-score normalised within each source before merging. Missing features are NaN, never 0.

### Two-model evaluation (`scripts/train_model.py`)

- **Transfer model** — trains on the master, validates on SL using only the 4 features shared with the SL survey (`Age, Gender, JobSatisfaction, WorkLifeBalance`). Ordinal features are min-max rescaled within each dataset (master is 1–3 scale, SL is 1–5). Uses SMOTETOMEK + threshold tuning on an internal split. Weak (~0.64) — this is expected and is itself a finding.
- **Local model** — trains + 5-fold CV *within* the SL data on **8 psychometric constructs** (`JobSatisfaction, WorkLifeBalance, Happiness, ManagementSupport, CareerManagement, InnovativeWorkBehavior, LeaderMemberExchange, CoworkerSupport`). Strong (~0.94, multi-seed CV) with a usable operating point (P 0.73 / R 0.82). These constructs come from `preprocess_raw.py` (computed from the raw xlsx) and are **survey-sourced** — their production input is the planned Dialogflow pulse-check, not operational HR data.
- **SL target:** `Attrition_binary` = turnover-intention composite (mean of 4 ET items) **≥ 3.5** on a 1–5 scale → 14.3% positives. (Earlier docs said "≥ 4"; the code is and always was 3.5.)
- Outputs: `models/attrition_rf.joblib`, `reports/training_report.json`, `reports/shap_*.png` (all gitignored).

### Python Pipeline (scripts/ — run in order)

```
scripts/download_datasets.py       # Fetch real datasets (Saudi, Russian, Sri Lanka)
scripts/preprocess_raw.py          # Convert xlsx → clean numeric CSV
scripts/calibrate.py               # Fit logistic regression → calibration_params.json
scripts/generate_synthetic_data.py # Generate 500 calibrated synthetic records
scripts/merge_and_clean_data.py    # Build master + validation + benchmark files
```

The Russian dataset (Kaggle CSV, cp1251 encoding) is read directly by `calibrate.py` and `merge_and_clean_data.py` — it skips `preprocess_raw.py`. Both scripts handle cp1251 (Cyrillic) encoding via multi-encoding fallback.

### Python Environment

There is no `requirements.txt` — install dependencies manually into a venv:

```powershell
python -m venv .venv && .\.venv\Scripts\Activate.ps1
pip install pandas numpy scipy scikit-learn openpyxl   # openpyxl is needed to read the .xlsx sources
# Phase 3 training (scripts/train_model.py) will additionally need: imbalanced-learn shap
```

Scripts are run directly (`python scripts/<name>.py`); some accept `argparse` flags (e.g. `generate_synthetic_data.py`). If a source dataset is missing, the pipeline degrades gracefully to literature-default coefficients rather than failing.

### GCP Services

| Service | Purpose |
|---|---|
| Cloud Storage (GCS) | Dataset and model artifact storage |
| BigQuery | Feature engineering and analytics |
| Cloud DLP | Automated PII masking before model training |
| Cloud Run | Serverless model inference endpoint (scales to zero) |
| Cloud Scheduler | Monthly retraining triggers |
| Dialogflow CX | Weekly "Pulse Check" employee sentiment surveys |

### ML Service / Inference (`ml_service/` — deployed)

A FastAPI inference service is **deployed and live**. It is separate from the
Node HR backend and serves both models on separate routes.

| Item | Value |
|---|---|
| Project / region | `kpi-uat` / `us-central1` (NOT the stale `long-operator-466309-g6` in `quick-deploy.ps1`) |
| Service | Cloud Run `simpalahr-ml-dev` — IAM-locked (`--no-allow-unauthenticated`), scale-to-zero, 1 CPU / 1 GiB |
| URL | `https://simpalahr-ml-dev-809106518632.us-central1.run.app` |
| Model bucket | `gs://kpi-uat-simpalahr-ml/models/` (loaded at startup; baked-in fallback) |
| Runtime SA | `simpalahr-ml-runtime@kpi-uat` (`storage.objectViewer` on bucket only) |
| Retrain | Cloud Run Job `simpalahr-ml-retrain` + monthly Cloud Scheduler |

Routes: `GET /health`, `GET /model-info`, `POST /predict/local` (8 constructs,
strong ~0.94), `POST /predict/transfer` (4 features, weak ~0.64). Each prediction
returns probability, threshold, flag, risk band, and per-request SHAP contributions.

```powershell
# from ml_service/  (run scripts/train_model.py first so the bundles exist)
.\setup-iam.ps1                 # once: bucket grant, runtime SA, invoker grant
.\deploy.ps1                    # build (regional Cloud Build) -> Cloud Run
.\retrain\setup-retrain.ps1     # once: provision the monthly retrain Job + Scheduler
python scripts\upload_model.py  # publish freshly-trained bundles to GCS
```

Call the locked endpoint with an identity token:
```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" $URL/health
```

**Critical:** `ml_service/requirements.txt` pins `scikit-learn==1.8.0` to match
`scripts/train_model.py` — a version mismatch can break joblib unpickling.
Preprocessing in `ml_service/app/model.py` mirrors `train_model.py` exactly
(gender encoding, persisted min-max rescale bounds, median imputation) for
train/serve parity. `.ps1` deploy scripts must stay ASCII-only (Windows
PowerShell reads them as ANSI).

### ML Approach

- **Model:** scikit-learn Random Forest + SMOTETOMEK (NOT Vertex AI AutoML — too costly and opaque)
- **Explainability:** SHAP TreeExplainer (exact, not approximated)
- **Goal metric:** Recall > 80% on attrition class (minimize false negatives for early warning)
- **Target column:** `Attrition_binary` is the single canonical 0/1 label. Never train on the raw `Attrition` string column — each source encodes it differently (Saudi `' Yes'`/`' No'` with leading spaces, Russian's label is in `event`), so `merge_and_clean_data.py` strips those raw/leakage columns before writing. The merge step asserts target integrity (no NaN, binary only, every source contributes labelled rows) before saving.
- **Training weights:** `SampleWeight` column in master dataset, passed to `sample_weight` parameter
- **Caveat — feature fragmentation:** sources barely overlap on features (satisfaction is Saudi-only, attendance/leave are synthetic-only, personality traits are Russian-only; only age/income/tenure are shared). Treat SHAP findings on source-exclusive features cautiously, and remember the SL validation target is turnover *intention*, not actual attrition.

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
- `masters_plan.md` — Comprehensive project record (decisions, methodology, timeline, evaluation plan, current status)
