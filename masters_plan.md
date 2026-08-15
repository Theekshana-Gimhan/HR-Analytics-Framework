# NexusHR — Masters Plan

> Complete project record: what was built, why each decision was made, and what remains.
> Written as a reference for thesis writing, viva preparation, and defense.

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Research Questions & Objectives](#2-research-questions--objectives)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Strategy](#4-data-strategy)
5. [ML Pipeline — Step by Step](#5-ml-pipeline--step-by-step)
6. [HR Application — The Product](#6-hr-application--the-product)
7. [Privacy & Compliance (PDPA)](#7-privacy--compliance-pdpa)
8. [GCP Cloud Architecture](#8-gcp-cloud-architecture)
9. [Testing & Quality Assurance](#9-testing--quality-assurance)
10. [Development Timeline — What Was Done](#10-development-timeline--what-was-done)
11. [Remaining Work — What Is Ahead](#11-remaining-work--what-is-ahead)
12. [Evaluation Plan](#12-evaluation-plan)
13. [Risk Register](#13-risk-register)
14. [Key Decisions Log](#14-key-decisions-log)
15. [References](#15-references)

---

## 1. Project Identity

| Field | Detail |
|---|---|
| **Project Title** | NexusHR: A Cost-Effective Predictive HR Analytics Framework for Sri Lankan SMEs |
| **Module** | COM 4901 — Final Year Individual Research Project |
| **University** | Kaatsu International University (KIU) |
| **Degree** | BSc (Hons) in Management Information Systems |
| **Codebase Name** | Simpala HR (internal), NexusHR (research) |
| **Repository** | `HR-Analytics-Framework` on GitHub |
| **Proposal Status** | Submitted and Approved |
| **Viva Status** | Successfully Completed (May 2026) |
| **Interim Report** | Submitted (June 2026); research audit completed 5 July 2026 — see created_docs/Audit_and_FineTuning_Plan.md |

### Elevator Pitch

Sri Lankan SMEs (20–50 employees) cannot afford enterprise HR analytics platforms like SAP SuccessFactors or Workday, which start at USD 8–15 per employee per month. NexusHR provides the same predictive attrition capability at under **LKR 10,000/month total** (~LKR 200/employee for a 50-person firm) by combining a production-ready HR application with a serverless GCP machine learning pipeline. The system predicts which employees are at risk of leaving before they resign, explains why via SHAP feature attributions, and delivers this through a manager-facing dashboard — all while complying with the Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022.

### The Research Gap

**No public individual-level HR attrition dataset exists for Sri Lankan companies.** This was confirmed through systematic search of Kaggle, UCI ML Repository, Mendeley Data, Zenodo, and Google Dataset Search. The closest available data is a PLoS ONE 2023 survey of 230 Sri Lankan startup employees measuring *turnover intention* (ordinal, not actual attrition). This gap is both the motivation for the project and a constraint that shaped the entire data strategy.

---

## 2. Research Questions & Objectives

### Primary Research Question

> Can a serverless, cost-effective AI system deliver actionable employee attrition predictions for Sri Lankan SMEs at enterprise-grade accuracy?

### Sub-Questions

1. **Prediction accuracy**: Can a Random Forest model trained on multi-source international data achieve Recall > 80% when validated on real Sri Lankan workforce data?
2. **Cost efficiency**: Can the full inference pipeline (data storage, model training, prediction serving) run within LKR 10,000/month using GCP serverless services?
3. **Explainability**: Can SHAP feature attributions produce explanations that SME managers trust and act on, measured by System Usability Scale (SUS) > 80?
4. **Privacy compliance**: Can the system handle employee PII in full compliance with PDPA No. 9 of 2022 through automated masking and audit trails?

### Three Measurable Targets

| Metric | Target | How Measured |
|---|---|---|
| **Recall** | > 80% on attrition class | Evaluated on held-out `validation_srilanka.csv` (230 real Sri Lankan records never seen during training) |
| **SUS Score** | > 80 | System Usability Scale questionnaire with simulated SME HR managers |
| **Monthly Cost** | < LKR 10,000 | GCP billing audit under realistic usage (50 employees, daily predictions, monthly retraining) |

### Why These Metrics

- **Recall over Precision**: A false negative (missed at-risk employee who then quits) is far more expensive than a false positive (flagging someone who stays). Replacing an employee costs 50–200% of their annual salary in recruitment, onboarding, and productivity loss. A system that misses too many resignations provides no value.
- **SUS > 80**: Research (Bangor et al., 2009) classifies SUS > 80 as "excellent" usability. SME managers are not data scientists — if they don't understand or trust the predictions, they won't use the system regardless of accuracy.
- **< LKR 10,000/month**: This is the cost ceiling that makes AI analytics accessible to SMEs that currently spend zero on predictive HR tools. Enterprise solutions start at 10–50x this cost.

---

## 3. Architecture Overview

### Two-System Design

The project has two distinct systems that work together:

```
┌────────────────────────────────────────────────────────────────┐
│  HR Application (hr_base_system/)                              │
│  React 19 + Node.js/Express 5 + PostgreSQL                    │
│  Handles: payroll, leave, attendance, documents, rostering     │
│  This is the production system that SMEs use daily.            │
└──────────────┬─────────────────────────────────────────────────┘
               │ Anonymized data export (PII stripped)
               ▼
┌────────────────────────────────────────────────────────────────┐
│  ML Pipeline (scripts/ + GCP)                                  │
│  Python → Cloud Storage → BigQuery → Cloud Run                 │
│  Handles: training, prediction, explanation, retraining        │
│  This is the AI layer that adds predictive capability.         │
└────────────────────────────────────────────────────────────────┘
```

### Technology Choices and Rationale

| Component | Choice | Why (over alternatives) |
|---|---|---|
| **ML Model** | scikit-learn Random Forest | Vertex AI AutoML was considered but rejected — too costly for SME budgets (training alone can cost USD 50+/run) and opaque (no control over feature engineering). RF with SHAP provides full transparency and runs locally or on Cloud Run at near-zero cost. |
| **Resampling** | SMOTETOMEK | The master dataset has imbalanced classes. SMOTE alone can create noisy synthetic minority samples near the decision boundary; Tomek link removal cleans these. Applied on training split only — never on validation data. |
| **Explainability** | SHAP (TreeExplainer) | Exact computation (not approximated) for tree-based models. Provides per-employee attribution: "satisfaction score contributed most to this employee's risk." Required for manager trust. |
| **Frontend** | React 19 + Vite + Material UI | Industry standard for SPAs. MUI provides production-ready components (data grids, forms, charts). Vite gives sub-second HMR in development. |
| **Backend** | Express 5 + Prisma 6 + PostgreSQL | Express 5 adds native async/await error handling. Prisma 6 provides type-safe database access with migration versioning. PostgreSQL for production reliability and JSON support. |
| **Auth** | JWT (15-min access / 7-day refresh) + WebAuthn | Short-lived access tokens limit exposure. WebAuthn provides passwordless option for mobile users. RBAC with four roles (OWNER, ADMIN, HR, EMPLOYEE). |
| **Deployment** | Cloud Run (serverless containers) | Pay-per-request, scales to zero when idle. A 50-employee SME might make 100 predictions/month — paying only for those seconds of compute, not a 24/7 VM. |
| **Data Pipeline** | Python scripts (not Airflow/Prefect) | The pipeline runs 5 scripts in sequence, once a month. An orchestration framework would add complexity for zero benefit at this scale. |

### System Data Flow

```
Employee daily activity
    → HR App records attendance, leave, payroll
        → Weekly/monthly batch export (anonymized)
            → Cloud DLP scans for residual PII
                → Data lands in Cloud Storage
                    → BigQuery feature engineering
                        → Model training/retraining (monthly)
                            → Cloud Run prediction endpoint
                                → HR Dashboard shows risk scores + SHAP explanations
                                    → Manager takes retention action
```

---

## 4. Data Strategy

### The Problem

There is no public, individual-level HR attrition dataset from Sri Lanka. The closest proxy is a PLoS ONE 2023 survey of 230 startup employees measuring *turnover intention* on an ordinal scale — not actual attrition events. This means the model cannot be trained exclusively on Sri Lankan data.

### The Solution: Multi-Source Weighted Training

Train on international real-world data from developing countries with similar economic structures, augmented with calibrated synthetic data, and validate on real Sri Lankan responses.

### Training Data (nexus_hr_master_dataset.csv — 2,820 records)

| Source | File | Records | Type | Weight | Key Columns | Limitations |
|---|---|---|---|---|---|---|
| **Saudi Employee Attrition** | `data/raw/saudi_attrition.csv` | 1,191 | Real, developing-country private sector | 2.0 | Age, tenure, salary, satisfaction, attrition (binary) | Salary in SAR (normalised to z-score before merging); 43% attrition rate is high for SL context |
| **Russian Employee Turnover** | `data/raw/russian_turnover.csv` | 1,129 | Real, private-sector company | 2.0 | Age, tenure (`stag`), personality traits, attrition (`event`) | No income or satisfaction columns; Cyrillic encoding (cp1251); 50.6% attrition |
| **Local Synthetic (calibrated)** | `data/synthetic_hr_data.csv` | 500 | Simulated, Sri Lankan SME context | 0.5 | All standard HR features (age, salary in LKR, attendance, leave) | Synthetic — low weight ensures real data dominates |

### Validation Data (held out, never in training)

| File | Source | Records | Purpose |
|---|---|---|---|
| `data/validation_srilanka.csv` | Sri Lanka Startups Survey (Kanchana & Jayathilaka, PLoS ONE 2023) | 230 | **Primary validation** — real Sri Lankan workforce responses. Turnover-intention composite (mean of 4 ET items) ≥ 3.5 (on a 1–5 scale) thresholded as high flight risk → 33 positives (14.3%). Carries 8 psychometric constructs (see Local Model, §12). |
| `data/benchmark_ibm.csv` | IBM HR Analytics (Kaggle) | 1,470 | **Published comparison only** — used to compare model performance against results in published papers (Sarker 2021, etc.). Not in training because it is synthetic and uses fictional income units. |

### Why These Weights

- **Real international data (2.0)**: These are actual attrition events from real companies. The patterns (age → stability, satisfaction → retention) transfer across cultures, even if the base rates differ.
- **Synthetic data (0.5)**: Provides Sri Lankan feature distributions (LKR salaries, local department structures, attendance patterns) but is machine-generated. Low weight prevents the model from overfitting to synthetic patterns.
- **Future real Sri Lankan data (4.0)**: When a partner SME contributes data, it gets the highest weight — it is both real and locally relevant. The pipeline accepts this without architectural changes.

### Income Normalisation — A Critical Decision

The Saudi dataset has salaries in SAR, the synthetic data uses LKR, and the IBM data uses fictional units. Merging these raw values would teach the model that "SAR 15,000/month = LKR 15,000/month" which is wrong.

**Solution**: MonthlyIncome is z-score normalised *within each data source* before merging. The raw value is retained as `MonthlyIncome_raw` for reference, but the model only sees `MonthlyIncome_normalized` — which represents "how this employee's salary compares to others in their source." This is the semantically correct feature: relative purchasing power within context.

### Ordinal Scale Mismatch — A Second Normalisation Decision

The same cross-source comparability problem affects the ordinal survey features. `JobSatisfaction` and `WorkLifeBalance` are recorded on a **1–3 scale in the Saudi master data** but a **1–5 scale in the Sri Lanka validation survey**. A RandomForest split learned at "satisfaction ≤ 2.5" on a 1–3 instrument means something entirely different on a 1–5 instrument, so the raw values are not transferable between training and validation.

**Solution**: `train_model.py` min-max rescales these ordinal features to `[0,1]` *within each dataset* before training/evaluating. This aligns the lowest and highest observed levels of each instrument, the most defensible assumption available for cross-instrument ordinal alignment (directly analogous to the within-source income z-score above). This was missed in the original pipeline and is corrected at the model layer.

### Missing Values — Why NaN, Not Zero

Features not collected by a particular dataset are left as `NaN`, never filled with 0. This matters because:
- `Attendance_LateCount = 0` means "this employee was never late" (good employee)
- `Attendance_LateCount = NaN` means "this dataset didn't track attendance" (no information)

Imputing NaN with 0 would teach the model that all Saudi and Russian employees had perfect attendance, which is false.

**Correction (verified empirically):** scikit-learn's `RandomForestClassifier` does **not** handle NaN natively — it raises `ValueError` on missing values (unlike `HistGradientBoostingClassifier`, which does). `train_model.py` therefore applies median imputation (fit on the training split only) before fitting the forest. The "NaN not zero" decision still holds at the *data* layer — it preserves the distinction between "measured as zero" and "not measured" in the stored CSV, and lets us choose the imputation strategy explicitly at train time rather than baking a false zero into the data.

### Calibration Methodology

The synthetic data is not generated from hand-coded rules. It uses a logistic function whose coefficients are derived from real data:

**Step 1**: Fit a logistic regression on 2,550 real records (Saudi + Russian + Sri Lanka) using available common features (age, tenure, salary ratio, satisfaction).

**Step 2**: Extract standardised coefficients. These tell us the *direction* and *relative strength* of each predictor:

| Coefficient | Value | Source | Interpretation |
|---|---|---|---|
| `age_norm` | -0.297 | Calibrated | Older employees less likely to leave |
| `tenure_years_norm` | +0.396 | Calibrated | Experienced workers more mobile (Saudi/Russian context) |
| `salary_ratio_norm` | +0.051 | Calibrated | Salary alone is a weak predictor |
| `satisfaction_norm` | -0.514 | Calibrated | **Job satisfaction is the dominant driver** |
| `career_stagnation` | +0.48 | Literature | Long tenure in junior role → higher risk |
| `late_count_norm` | +0.18 | Literature | Attendance problems → higher risk |
| `absent_count_norm` | +0.22 | Literature | Absenteeism → higher risk |

**Step 3**: The intercept is NOT taken from calibration. The Saudi baseline attrition rate is 43%, which does not apply to Sri Lanka. Instead, the intercept is computed to produce a 15% base attrition rate — consistent with SLBFE 2023 labour market reports and ILO Sri Lanka data.

**Step 4**: The synthetic generator uses `scipy.special.expit` (numerically stable sigmoid) to convert the linear combination of features into an attrition probability for each synthetic record.

### Key Insight from Calibration

When the Russian dataset (1,129 records) was added to the existing Saudi + Sri Lanka calibration (1,421 records), the coefficient directions stayed stable. This cross-validation across two independent real-world datasets from different countries confirms the calibrated coefficients are robust, not artifacts of a single dataset.

### Future-Proof Design

When real Sri Lankan company data is contributed:
1. Add the CSV to `data/raw/` with appropriate column mapping
2. Add a loader function in `merge_and_clean_data.py` with `SampleWeight=4.0`
3. Rerun `calibrate.py` → `generate_synthetic_data.py` → `merge_and_clean_data.py`
4. Retrain model — no architectural changes needed

---

## 5. ML Pipeline — Step by Step

The pipeline is five Python scripts that run in sequence. Each is idempotent — you can rerun any step safely.

### Script 1: `download_datasets.py`

**Purpose**: Download the three real-world HR datasets.

**What it does**:
- Attempts to download the Saudi dataset from Mendeley Data (DOI: 10.17632/6z2hty8php.1)
- Prints manual download instructions for the Kaggle Russian dataset (requires Kaggle account)
- Attempts to download the Sri Lanka PLoS ONE supplementary data
- Validates that files exist and have expected record counts

**Output**: Raw files in `data/raw/`:
- `saudi_attrition.xlsx` (and .csv after preprocessing)
- `russian_turnover.csv` (Cyrillic cp1251 encoding)
- `srilanka_turnover_intent.xlsx` (and .csv after preprocessing)

### Script 2: `preprocess_raw.py`

**Purpose**: Convert raw Excel files to clean, numeric CSVs.

**What it does**:
- **Saudi dataset**: Converts ordinal string categories ("From 5 to 10 years", "Less than 5000 SAR") to numeric midpoints. Maps categorical satisfaction levels to integers.
- **Sri Lanka dataset**: Computes composite Likert scores for 8 constructs from multi-item survey groups (Job Satisfaction, Work-Life Balance, Happiness, Management Support, Career Management, Innovative Work Behaviour, Leader-Member Exchange, Co-worker Support). Creates binary `Attrition_binary` by thresholding the turnover-intention composite ≥ 3.5 (1–5 scale).

**Note**: The Russian dataset is already a CSV with numeric columns — it skips this step entirely.

**Output**: Clean CSV files in `data/raw/` (same names, `.csv` extension).

### Script 3: `calibrate.py`

**Purpose**: Fit a logistic regression on real data to extract attrition coefficients.

**What it does**:
1. Loads all available real datasets using a multi-encoding fallback (utf-8-sig → utf-8 → cp1251 → latin-1) to handle the Russian Cyrillic encoding
2. Maps dataset-specific column names to common features using alias dictionaries (e.g., Russian `stag` → `tenure_years`, `event` → `attrition`)
3. Computes within-source salary z-scores to avoid cross-currency contamination
4. Fits a `LogisticRegression` with `class_weight='balanced'` and `StandardScaler` on common features
5. Extracts standardised coefficients
6. Merges fitted coefficients with literature defaults for features not in the real data (attendance, absenteeism, career stagnation)
7. Records which coefficients came from calibration vs. literature

**Output**: `data/calibration_params.json` containing:
- All coefficients with source tags (calibrated vs. literature_default)
- Metadata: number of records calibrated (2,550), sources used, calibration date

**Graceful degradation**: If no real datasets are found, writes literature defaults and the pipeline continues — synthetic generation still works, just without data-driven calibration.

### Script 4: `generate_synthetic_data.py`

**Purpose**: Generate 500 synthetic Sri Lankan SME HR records.

**What it does**:
1. Loads calibration parameters from `calibration_params.json`
2. Generates realistic feature distributions:
   - **Age**: Uniform 22–55 (Sri Lankan workforce range)
   - **Tenure**: Exponential distribution (mean ~3.5 years, capped at 15) — most SME employees have short tenure
   - **Salary**: Log-normal per seniority band, calibrated to Sri Lankan LKR (Junior ~LKR 80K, Mid ~LKR 140K, Senior ~LKR 280K — from Salary Explorer Sri Lanka 2023)
   - **Attendance**: Poisson-distributed late/absent counts; 15% of employees have elevated absence patterns
   - **Departments**: Engineering, Sales, HR, Finance, Operations, Marketing with realistic job titles
3. Computes attrition probability using the calibrated logistic function:
   - Uses calibrated slopes from real data (direction + strength of each predictor)
   - Recomputes intercept to target 15% base attrition rate (appropriate for Sri Lanka, not Saudi's 43%)
   - Applies `scipy.special.expit` (sigmoid) to get probabilities
   - Draws binary attrition from Bernoulli distribution
4. Each record carries `DataSource='Local_Synthetic'` and `SampleWeight=0.5`

**Output**: `data/synthetic_hr_data.csv` (500 records, ~15% attrition rate)

**Reproducibility**: Fixed random seed (42) ensures identical output on each run.

### Script 5: `merge_and_clean_data.py`

**Purpose**: Combine all sources into the final training, validation, and benchmark files.

**What it does**:
1. Loads each dataset through source-specific loader functions that handle encoding, column mapping, and normalisation
2. Applies within-source income z-score normalisation (the cross-currency fix)
3. Converts all attrition columns to binary 0/1 (handling string "Yes"/"No", numeric, and ordinal formats)
4. Separates datasets by role:
   - **Training master**: Synthetic + Saudi Real + Russian Real → `nexus_hr_master_dataset.csv`
   - **Validation**: Sri Lanka PLoS ONE → `validation_srilanka.csv` (never in training)
   - **Benchmark**: IBM → `benchmark_ibm.csv` (for published comparison only)
5. Aligns all datasets to a common schema (MASTER_COLUMNS) preserving source-specific features as extra columns
6. Leaves missing features as NaN (never imputed with 0)

**Output**:
- `data/nexus_hr_master_dataset.csv` — 2,820 training records
- `data/validation_srilanka.csv` — 230 validation records
- `data/benchmark_ibm.csv` — 1,470 benchmark records

### Pipeline Dependency Graph

```
download_datasets.py
    │
    ├─→ preprocess_raw.py (Saudi xlsx, Sri Lanka xlsx)
    │       │
    │       ▼
    ├─→ calibrate.py (reads all 3 real CSVs)
    │       │
    │       ▼
    │   generate_synthetic_data.py (reads calibration_params.json)
    │       │
    │       ▼
    └─→ merge_and_clean_data.py (reads synthetic + all real CSVs)
            │
            ├─→ nexus_hr_master_dataset.csv    (training)
            ├─→ validation_srilanka.csv         (validation)
            └─→ benchmark_ibm.csv              (benchmark)
```

---

## 6. HR Application — The Product

The HR application (`hr_base_system/`) is a production-ready web application that Sri Lankan SMEs use daily for core HR operations. It is not a prototype — it handles real payroll calculations, statutory compliance, and employee data management.

### Modules

#### Authentication & Access Control
- JWT-based auth: 15-minute access tokens, 7-day refresh tokens with rotation
- WebAuthn (FIDO2) for passwordless biometric login
- RBAC with four roles: **OWNER** (full access) → **ADMIN** (company management) → **HR** (employee management) → **EMPLOYEE** (self-service)
- Rate limiting on auth endpoints to prevent brute force

#### Employee Management
- Full CRUD for employee records (personal details, job role, department, salary)
- Employee document management with expiry tracking and automatic notifications
- Profile self-service for employees (view payslips, request leave, check attendance)

#### Payroll
- Sri Lankan statutory calculations:
  - **EPF Employee**: 8% of basic salary
  - **EPF Employer**: 12% of basic salary
  - **ETF**: 3% of basic salary
  - **PAYE**: Progressive tax rates per Sri Lanka Inland Revenue
- Payslip PDF generation (pdfkit)
- Bank file export in **CIPS** and **SLIPS** formats (Sri Lankan banking standards)
- Audit trail on all payroll operations

#### Leave Management
- Configurable leave types per company
- Statutory minimums enforced: Annual (14 days), Casual (7 days), Medical (7 days with anniversary accrual)
- Application → Approval workflow with multi-level authorization
- Leave balance tracking with carry-over rules
- Calendar view for team leave visibility

#### Attendance
- Daily check-in/check-out recording
- Bulk CSV import for batch attendance upload
- Correction request workflow (employee requests → manager approves)
- Late count and absence tracking (feeds into ML features)

#### Rostering & Shift Management
- Shift template creation and management
- Roster grid view for scheduling
- Shift assignment with conflict detection

#### Dashboard
- Overview metrics: headcount, leave utilization, attendance rates
- Liquidity widget for payroll cost tracking
- Per-employee leave status widget
- LRU cache (500 entries, 60s TTL) for performance — Redis-ready interface

#### Documents & Compliance
- Employee document storage (contracts, certificates, IDs)
- Expiry tracking with automated email notifications
- Audit logging with correlation IDs on all data operations

### Technical Implementation

#### Multi-Tenancy
Every Prisma query filters by `companyId` from `req.user.companyId`. This is an absolute rule — no data ever crosses company boundaries. The pattern is enforced at the service layer, not middleware, so it's explicit in every query.

#### Request Lifecycle
```
Route definition → validateRequest(ZodSchema) → authenticate → authorize([roles]) → Controller → Service → Prisma
```

#### Field Naming Convention
Prisma models use camelCase with `@map` for snake_case PostgreSQL columns. API input often arrives in snake_case (from forms), so explicit mapping is required before every Prisma operation:
```typescript
const { default_balance, ...rest } = inputData;
await prisma.leaveType.create({
  data: { ...rest, defaultBalance: default_balance }
});
```

#### Database
- PostgreSQL via Prisma 6 ORM
- 20+ models across 21 versioned migrations
- Key models: Company, User, Employee, Attendance, LeaveRequest, LeaveType, LeaveBalance, Payslip, BankFileExport, Roster, ShiftTemplate, EmployeeDocument, AuditLog, Authenticator, RefreshToken

#### Frontend Architecture
- All routes lazy-loaded via `React.lazy()` for code splitting
- Rollup chunks split MUI, TanStack Query, and React core into separate vendor bundles
- TanStack React Query for server state management (caching, revalidation, optimistic updates)
- React Hook Form + Zod for form validation
- Centralised API client with bearer token injection and error handling
- Provider composition: AppThemeProvider → QueryProvider → FeedbackProvider

### Key Backend Service Files

| Service | File | Responsibility |
|---|---|---|
| Auth | `auth.service.ts` | JWT/WebAuthn, token rotation, bcrypt password hashing |
| Leave | `leave.service.ts` | Application workflow, quota calculation, transactions |
| Payroll | `payroll.service.ts` | EPF/ETF/PAYE calculation, payslip generation |
| Attendance | `attendance.service.ts` | Recording, bulk CSV import, correction requests |
| Bank File | `bankFile.service.ts` | CIPS/SLIPS format generation with audit trail |
| Dashboard | `dashboard.service.ts` | Aggregated metrics with LRU caching |
| Roster | `roster.service.ts` | Shift scheduling and assignment |

---

## 7. Privacy & Compliance (PDPA)

### Governing Law

**Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022** — the country's first comprehensive data protection legislation, modelled on GDPR.

### Privacy by Design Implementation

| Layer | Mechanism | Purpose |
|---|---|---|
| **Database layer** | PII stripping before export | Names, NICs, emails, phone numbers removed before any data leaves the HR application |
| **Export script** | `extract-ai-data` backend command | Produces anonymized CSV with only ML-relevant features; replaces identifiers with hashed IDs |
| **Cloud DLP** | Automated scan before GCS upload | Google Cloud Data Loss Prevention detects any residual PII (NIC patterns, email patterns, phone numbers) and masks/redacts before storage |
| **Transit** | HTTPS + encryption at rest | All data encrypted in transit and at rest on GCP |
| **Audit trail** | Correlation IDs | Every data operation logged with unique correlation ID for compliance audit |
| **Access control** | RBAC + JWT | Only OWNER/ADMIN roles can trigger data exports; employees cannot access other employees' data |

### What Gets Exported for ML

| Included | Excluded |
|---|---|
| Age, gender, department, job role | Name, NIC, email, phone, address |
| Tenure, salary (normalised), allowances | Bank account numbers |
| Attendance counts (late, absent, half-day) | Specific dates/times (aggregated only) |
| Leave statistics (days approved, request count) | Leave reasons (medical details) |
| Attrition binary (yes/no) | Termination reasons (free text) |

### Cross-Border Data Movement

- Data originates in Sri Lanka (HR application database)
- ML training and inference run on GCP (US region for cost optimization)
- Cloud DLP triggers **before** any data crosses borders
- This follows PDPA Section 25 (cross-border transfer requires adequate protection)

---

## 8. GCP Cloud Architecture

### Deployed Environment (verified June 2026)

The inference architecture is **live** in the team's dev project. Coordinates:

| Item | Value |
|---|---|
| **Project** | `kpi-uat` (MAD Dev Hub, #809106518632) |
| **Region** | `us-central1` (org policy `constraints/gcp.resourceLocations` pins resources here — Cloud Build must run regionally) |
| **Artifact Registry** | `us-central1-docker.pkg.dev/kpi-uat/simpalahr/` |
| **Model bucket** | `gs://kpi-uat-simpalahr-ml/models/` (both joblib bundles + `manifest.json`) |
| **Inference service** | Cloud Run `simpalahr-ml-dev` (IAM-locked, scale-to-zero, 1 CPU / 1 GiB) |
| **Runtime SA** | `simpalahr-ml-runtime@kpi-uat` (least-privilege: `storage.objectViewer` on the bucket only) |
| **Caller** | HR backend SA `staging-runtime-sa@kpi-uat` granted `roles/run.invoker` |
| **Retrain** | Cloud Run Job `simpalahr-ml-retrain` + Cloud Scheduler monthly (`0 2 1 * *`, Asia/Colombo) |

The service (`ml_service/`) is a FastAPI app serving **both** models on separate
routes — `POST /predict/local` (8 constructs, strong) and `POST /predict/transfer`
(4 features, weak) — each returning probability, risk band, flag, and per-request
SHAP contributions. Models load from GCS at startup (baked-in fallback). See
`ml_service/README.md`. *(The repo's `hr_base_system/quick-deploy.ps1` references a
stale project `long-operator-466309-g6`; real deploys target `kpi-uat`.)*

### HR-app integration (live on dev — verified June 28, 2026)

The production HR app now **consumes** the inference service, closing the loop
from model → product. The HR system is a **separate GitHub repo**
(`Mad-marketing-git/HR`, branch `dev`), distinct from this research repo; the
integration is done **over the API boundary** (thin proxy + HTTP), not by merging
the ML pipeline into the product.

- **PR #207** (merged): backend proxy service + `/api/v1/attrition` routes
  (`ATTRITION_VIEW`-gated, ID-token auth via the Cloud Run metadata server) and a
  frontend **Attrition Risk card** on the Employee Detail page (8 Likert sliders →
  risk band + probability vs threshold + top SHAP factors, beta-labelled).
- **PR #208** (merged): deploy enablement — reconciled a broken `package-lock.json`
  that had frozen all dev deploys since ~June 8, added `ML_SERVICE_URL` to the
  deploy workflow, added `.prettierignore`.
- **Activation:** `ML_SERVICE_URL` set on `simpalahr-backend-dev` (rev `00021-zoh`);
  frontend rev `00019-wex`. **End-to-end verified** with a real OWNER login:
  `status`→`enabled`, `predict/local`→LOW (p≈0.09), `predict/transfer`→HIGH
  (p≈0.71), both with coherent SHAP; bad input → 400 Zod validation.
- **Cost evidence:** with both Cloud Run services (HR + ML) scaling to zero, idle
  cost ≈ $0 — the < LKR 10,000/month thesis is now demonstrable, not just claimed.
- **Cold-start fix — PR #210** (merged + live on dev, backend rev `00023-riy`):
  the upstream timeout is now 60s with one automatic retry (first call wakes the
  scaled-to-zero instance, the retry lands warm), keeping scale-to-zero rather
  than paying for a warm instance.

### Pulse Check — closing the data loop (PRs #211 / #212, June 29, 2026)

The local model's 8 constructs needed a production source. Rather than a full
Dialogflow CX agent (extra cost + GCP dependency), the chosen approach is a
**lightweight in-app weekly Pulse Check** — keeping everything in the existing
stack and preserving the cost thesis.

- **Design:** 16 Likert items (2 per construct), averaged into the 8 constructs
  using the *same* mean-of-items definition as training (`preprocess_raw.py`),
  so train/serve parity holds. One submission per employee per ISO week (upsert).
- **PR #211 (backend):** `PulseResponse` model + migration, question bank,
  `pulse.service` (compute constructs → best-effort score via the ML proxy →
  persist), routes `/api/v1/pulse/{questions,status,responses,latest/:id}`, a new
  `PULSE_SUBMIT` permission (manager read reuses `ATTRITION_VIEW`). 9 unit tests.
- **PR #212 (frontend):** `/pulse` survey page, dashboard nudge banner, nav entry,
  and a manager-side `PulseRiskCard` on the employee detail page. **Privacy by
  design:** employees see only a confirmation, never their own risk score.
- **Honest caveats (kept in the UI):** the short 2-item form is not the full
  validated battery (noisier), and the model predicts turnover *intention*.
- **Status: merged + live on dev** (June 29, 2026). Both PRs squash-merged to
  `dev`; migration `20260629090000_add_pulse_responses` applied via the
  `prisma-migrate-dev` Job; backend rev `00025-qiv`, frontend rev `00021-vaf`.
  **End-to-end verified** with a real OWNER login: `questions`→16 +
  `scoringEnabled`, `status`→false→true after submit, `responses`→scored with
  SHAP + persisted, `latest/:id`→manager readout. Scoring is best-effort so an
  ML cold start / outage never blocks a submission.

### Services and Their Roles

| Service | Purpose | Cost Model |
|---|---|---|
| **Cloud Storage (GCS)** | Store training data, model artifacts, SHAP plots | Pay per GB stored (~USD 0.02/GB/month) |
| **BigQuery** | Feature engineering (tenure bands, salary percentile vs. cohort), analytics | Pay per query (first 1 TB/month free) |
| **Cloud DLP** | Automated PII detection and masking before training | Pay per transformation (~USD 1 per 10K items) |
| **Cloud Run** | Serverless model inference endpoint (`simpalahr-ml-dev`) | Pay per request + compute time (scales to zero) |
| **Cloud Scheduler** | Trigger monthly retraining job (`simpalahr-ml-retrain`) | ~USD 0.10/month for 1 job |

### Cost Model (How < LKR 10,000/month is Achieved)

For a 50-employee SME with daily predictions and monthly retraining:

| Component | Estimated Monthly Cost (USD) |
|---|---|
| Cloud Storage (< 1 GB data + model) | ~$0.02 |
| BigQuery (light queries, under free tier) | ~$0.00 |
| Cloud DLP (one scan/month, ~3,000 records) | ~$0.30 |
| Cloud Run (100 predictions/month, ~2 seconds each) | ~$0.01 |
| Cloud Scheduler | ~$0.10 |
| **Total** | **~$0.43 (≈ LKR 140)** |

Even with generous safety margins (10x traffic, model serving overhead, logging), total stays well under LKR 10,000. The key insight is **serverless = pay-per-use**: when no one is making predictions, the cost is essentially zero.

### Why Not Vertex AI AutoML

Vertex AI AutoML was evaluated and rejected for three reasons:
1. **Cost**: A single AutoML training run can cost USD 50+ for tabular data. Monthly retraining would cost USD 600+/year just for training — before inference costs.
2. **Opacity**: AutoML is a black box. You cannot inspect feature engineering, understand model decisions at the coefficient level, or generate exact SHAP attributions.
3. **Control**: The research requires demonstrating understanding of the ML pipeline. AutoML abstracts away everything that makes this a research contribution.

scikit-learn Random Forest + SHAP provides equivalent or better accuracy at near-zero training cost (runs on any Python environment), with full transparency.

---

## 9. Testing & Quality Assurance

### Backend Testing

| Type | Tool | Config | Notes |
|---|---|---|---|
| Integration tests | Jest 30 + Supertest | `jest.config.js` | Requires live PostgreSQL; must run sequentially (`--runInBand`). 19 test files covering all services. |
| Unit tests | Jest 30 | `jest.unit.config.js` | No DB required. Tests pure business logic (payroll calculations, validation schemas). |
| Coverage | Jest `--coverage` | | Reports line, branch, function coverage |
| Linting | ESLint + TypeScript strict | `eslint.config.mjs` | Zero-warnings policy |
| Type checking | `tsc --noEmit` | `tsconfig.json` | Run separately to catch type errors without emitting JS |

### Frontend Testing

| Type | Tool | Notes |
|---|---|---|
| Unit tests | Vitest | Component tests with @testing-library/react |
| E2E tests | Playwright | Headless browser automation with `npm run e2e` or interactive `npm run e2e:ui` |
| Accessibility | axe-core + vitest-axe | Automated WCAG compliance checks |
| Type checking | `tsc --noEmit` | Frontend has its own tsconfig |

### QA Documentation

12 comprehensive QA guides in `hr_base_system/docs/QA/`:
- API testing checklist
- E2E testing guide
- Manual testing checklist
- Penetration test report
- Regression test report
- Visual QA checklist
- Deployment testing guide

### Security

- Penetration testing documented in `PENETRATION_TEST_REPORT.md`
- Threat model in `docs/technical/THREAT_MODEL.md`
- Rate limiting on all auth endpoints
- Helmet.js for HTTP security headers
- CORS configured per environment
- Input validation via Zod at every endpoint

---

## 10. Development Timeline — What Was Done

### Phase 1: Foundation & Research (Completed)

**Period**: Before April 2026

- Literature review on SME HR challenges, cloud pricing models, and ML approaches to attrition prediction
- Identified the research gap: no public Sri Lankan individual-level HR attrition data
- Designed system architecture (two-system approach: HR app + ML pipeline)
- Wrote and submitted research proposal
- Project proposal approved
- Viva defense successfully completed

### Phase 2: Data Preparation & Feature Engineering (Completed)

**April 4, 2026** — `2f88fa3` Initial commit
- Research proposal, 17 reference papers, and base HR system committed
- The HR application was already functional at this point (developed pre-commit)

**May 10, 2026** — Multiple commits for data pipeline
- `7120211` Added root README with project overview and research goals
- `c212322` Updated README with detailed 6-phase project plan and GCP tech stack
- `d1b1129` Generated 500 synthetic SME HR records for AI training
  - First version of `generate_synthetic_data.py` with literature-default coefficients
- `69fd79b` Updated progress to show synthetic data generation completion
- `2c95e72` Merged IBM and Local Synthetic datasets into master training file
  - First version of `merge_and_clean_data.py`
- `89c9dd8` Updated GEMINI.md with latest project status and GCP roadmap
- `a947127` **Rebuilt ML pipeline with real-data calibration** (major milestone)
  - Downloaded Saudi Employee Attrition dataset (Mendeley, 1,191 records)
  - Downloaded Sri Lanka Startups Survey (PLoS ONE, 230 records)
  - Wrote `download_datasets.py`, `preprocess_raw.py`, `calibrate.py`
  - Rewrote `generate_synthetic_data.py` to use calibrated logistic function instead of hard-coded rules
  - Rewrote `merge_and_clean_data.py` with proper multi-source strategy
  - Separated validation (Sri Lanka) and benchmark (IBM) from training data
  - Implemented within-source income z-score normalisation

**May 16, 2026** — `56a17e1` Added Russian employee turnover dataset
- Downloaded Russian turnover data from Kaggle (1,129 records)
- Fixed cp1251 (Cyrillic) encoding issue in `calibrate.py` and `merge_and_clean_data.py`
- Multi-encoding fallback: utf-8-sig → utf-8 → cp1251 → latin-1
- Master dataset grew from 1,691 to 2,820 records
- Calibration now uses 2,550 real records (was 1,421)
- Coefficients remained stable — validates the calibration approach

### Key Decisions During Phase 2

| Decision | Context | Outcome |
|---|---|---|
| Calibrate from real data, not hard-code | Literature defaults are averages across many studies; real coefficients are more specific | Satisfaction emerged as the dominant predictor (-0.514), stronger than literature suggested (-0.55 was close but not identical) |
| Recompute intercept instead of using calibrated one | Saudi baseline attrition is 43%; Sri Lanka is ~15% | Intercept is solved analytically to hit 15% target rate in synthetic population |
| Separate IBM from training | IBM data has fictional income units and is itself synthetic | Avoids contaminating the model with unrealistic salary distributions |
| Hold out Sri Lanka data entirely | Only 230 records, but they are the most locally relevant | Preserves the most valuable data for unbiased evaluation |
| Use within-source z-scores for income | Raw merging would conflate SAR, LKR, and fictional IBM units | Model learns relative purchasing power, not absolute amounts |
| Leave NaN instead of imputing 0 | Zero is a valid observation; NaN is missing information | Prevents the model from learning false patterns |

### Phase 3: Model Training & Evaluation (Completed — June 2026)

`scripts/train_model.py` implemented end-to-end, producing the two-model result
that is the project's central empirical finding: a weak cross-domain **transfer**
model (SL ROC-AUC ~0.64 on the 4 features shared with the SL survey) versus a
strong **local** model (SL ROC-AUC ~0.94, multi-seed CV, on the 8 psychometric
constructs), with a usable operating point (Precision 0.73 / Recall 0.82). SHAP
TreeExplainer reports generated for both models (`reports/shap_local.png`,
`reports/shap_summary.png`). Both trained model bundles persisted via `joblib`.
See §12 for full metrics and honest limitations.

### Phase 4: Deployment & Product Integration (Completed — June 2026)

- FastAPI inference service (`ml_service/`) deployed to an IAM-locked, scale-to-zero
  Cloud Run service `simpalahr-ml-dev` (project `kpi-uat`, region `us-central1`);
  model bundles published to `gs://kpi-uat-simpalahr-ml/models/`; monthly retrain
  Cloud Run Job + Cloud Scheduler provisioned. See §8 for full architecture.
- HR-app integration shipped **over the API boundary** (not a monorepo merge) via
  **PR #207**: a dependency-free attrition proxy service plus the `AttritionRiskCard`
  on the Employee Detail page — live on dev, verified end-to-end June 28, 2026.
  **PR #208** fixed a broken lockfile that had frozen dev deploys and wired
  `ML_SERVICE_URL` into the deploy workflow. **PR #210** fixed a cold-start
  UX issue with a 60s timeout + one automatic retry, deliberately preserving
  scale-to-zero rather than paying for a warm instance.
- **Pulse Check** (PRs #211/#212, June 29, 2026): a 16-item weekly Likert
  micro-survey that auto-produces the local model's 8 constructs (mean-of-items,
  matching `preprocess_raw.py` for train/serve parity), replacing manual entry on
  the `AttritionRiskCard`. New `PulseResponse` model + migration
  (`20260629090000_add_pulse_responses`), permission-gated routes, and a
  manager-side `PulseRiskCard`. Privacy by design: employees never see their own
  score. Live on dev, verified end-to-end. This **supersedes** the Dialogflow CX
  "Pulse Check" originally planned in Phase 4 below — descoped on cost grounds
  (see §11).

### Phase 5: Interim Report & Research Audit (June–July 2026)

- Interim Report (COM4901, 15% of module marks) written, verified (20 pages,
  6 figures, 5 tables, 21 IEEE references), and submitted June 2026.
- Corrected the Sri Lanka validation dataset attribution to Kanchana &
  Jayathilaka (2023), *PLOS ONE* 18(2):e0281729.
- Full research audit completed 5 July 2026, producing a prioritized fine-tuning
  plan (P1–P15) for the Final Report — see
  `created_docs/Audit_and_FineTuning_Plan.md` and §11/§12/§13 below.
- **Evaluation hardening P1–P5 complete** (P1 5 Jul, P2 6 Jul, P3–P5 15 Aug 2026).
  Five new reproducible audit scripts (`audit_local_model.py`,
  `ablation_synthetic.py`, `baseline_comparison.py`, `threshold_sensitivity.py`,
  `fairness_audit.py`) now stand behind both headline numbers, RQ3, the estimator
  choice, the binarisation choice, and the fairness position. Every claim in §12
  traces to a JSON report under `reports/` (gitignored, regenerable). Remaining
  before the 31 Aug Final Report: **P6** (measured cost study), **P7** (ethics
  approval — external latency, gates P8), **P8–P12** (SUS study, literature
  expansion, dissertation, logbook, textual fixes).

---

## 11. Remaining Work — What Is Ahead

The original Phase 3–5 roadmap that previously occupied this section (ML training,
Cloud Run deployment, HR-app integration, Pulse Check) was **completed in June
2026** — see §10, Phases 3–4, for what actually shipped. The planned **Dialogflow CX** conversational agent was
deliberately **superseded** by the lighter, cheaper in-app **Pulse Check**
(§10 Phase 4, §8) on cost-thesis grounds. What remains is driven by the
**5 July 2026 research audit** (`created_docs/Audit_and_FineTuning_Plan.md`,
plan items P1–P15) plus the fixed COM4901 final-report timeline.

### July 2026 — Evaluation hardening (audit P1–P7)

| # | Action | Defends / Answers | Effort |
|---|---|---|---|
| P1 | **✅ Done 5 Jul 2026** (`scripts/audit_local_model.py`). Leakage & CMB audit of the local model. Result: no leakage (0% missing → imputation is a no-op; ET items disjoint from predictors); 0.94 survives (leak-free 0.937, bootstrap 95% CI [0.88, 0.98], Brier 0.056); operating point was optimistic (nested P 0.58 / R 0.88 vs reported 0.73/0.82). | The 0.94 headline | Done |
| P2 | **✅ Done 6 Jul 2026** (`scripts/ablation_synthetic.py`). RQ3 ablation (6 conditions × 5 seeds; SMOTETOMEK/seed-42 reproduces the 0.64 headline). Result: synthetic augmentation gives a marginal, non-harmful lift (+0.03 ROC-AUC, edge of noise); synthetic-only ≈ 0.53 (near random); 2.0/0.5 weights immaterial (Δ −0.007); transfer signal is same-source SL satisfaction (Age+Gender alone = 0.46, below chance), not cross-cultural transfer. | RQ3 (now answered) | Done |
| P3 | **✅ Done 15 Aug 2026** (`scripts/baseline_comparison.py`). LogReg + GBM beside RF, identical data/seeds/folds, both resampling paths. Result: **RF wins the local arm outright** (0.937 vs GBM 0.853, LogReg 0.823; Δ +0.084, \|z\|=7.8) — the 0.94 estimator choice is vindicated where it matters. **RF does not win the transfer arm**: LogReg is better and far steadier (0.854 ± 0.003 vs 0.821 ± 0.020 class-weight; 0.833 ± 0.005 vs 0.718 ± 0.100 SMOTETOMEK). Corroborates P2 — the transfer task is signal-poor enough that a linear model on 4 features matches an ensemble. | "Why Random Forest?" viva question | Done |
| P4 | **✅ Done 15 Aug 2026** (`scripts/threshold_sensitivity.py`). Three-point curve at ET ≥ 3.0 / 3.5 / 4.0 (51 / 33 / 12 positives). Result: **the contrast survives every cut** — local − transfer = +0.131/+0.116/+0.095 (class-weight) and +0.215/+0.218/+0.175 (SMOTETOMEK). Only ≥ 3.0 and ≥ 3.5 clear the 20-positive reliability bar; ≥ 4.0 is reported as indicative (boot CI widens to [0.68, 0.95]). | Binarization choice | Done |
| P5 | **✅ Done 15 Aug 2026** (`scripts/fairness_audit.py`). Rescoped — the data cannot support the planned table, and why is the finding: `Age` has 4 coded values (88.7% at 25), the female subgroup has 2 positives. Result: evaluable slices are clean (male 0.941, age=25 0.943); four-fifths fails on both attributes but for opposite reasons once base rates are decomposed; gender proxy from the 8 constructs = 0.655 (weak, disclose); **drop-and-test says remove `Age`+`Gender` from the transfer model — costs nothing (Δ +0.004)**. | LO2, ethics, Age-dominance in the transfer model | Done |
| P6 | Formal cost study: ≥ 1 month GCP billing export; 3–4 architecture comparison (scale-to-zero Cloud Run vs min-instances=1 vs always-on VM vs Vertex AI) via scripted load test; hidden line items (Artifact Registry, Cloud Build, egress); USD→LKR rate/date + FX sensitivity note; SaaS PEPM comparison row | RQ2 | 2–3 days spread over the month |
| P7 | Ethics compliance: confirm KIU requirements for the SUS study and Pulse Check primary data; obtain approval/waiver | Guidelines §8; gates P8 — **start immediately** | admin |

### August 2026 — Evaluation completion & dissertation (P8–P12)

| # | Action | Notes |
|---|---|---|
| P8 | SUS study (5–10 SME stakeholders) | After P7 |
| P9 | Literature expansion to ~40+ references (transfer learning, synthetic tabular data, common method bias, fairness in algorithmic HR, turnover-intention validity); replace weak sources | Feeds Chapter 2 |
| P10 | Final dissertation: formal **Threats to Validity** section; **DSRM (Peffers et al. 2007)** phase-mapping table | The intellectual core of the writeup |
| P11 | Assemble the required **Project Diary / Logbook** from `masters_plan.md` + git history + supervisor meeting notes | Required for final submission |
| P12 | Small textual fixes carried from the interim report: abstract idle-vs-operational cost wording, "barely above chance" precision, SLBFE statistic precision | 0.5 day |

### Stretch (P13–P15, only if time permits — must not displace P1–P12)

| # | Action | Value |
|---|---|---|
| P13 | Partner-SME real *attrition* (behaviour) data through the pipeline | Would dissolve the transfer model's label-shift confound — highest scientific value, lowest controllability |
| P14 | Pulse Check short-form reliability once ≥ ~50 real pulse responses exist | Defends the 16-item descope empirically |
| P15 | Cloud DLP + BigQuery hardening | The original "Phase 2 GCP setup" items below — re-scoped as optional hardening, not required for the cost/PDPA claims already made |

<details>
<summary>Original Phase 2 GCP setup items (re-scoped as P15, optional)</summary>

- [ ] Configure Google Cloud DLP job for automated PII detection/masking
- [ ] Upload `data/nexus_hr_master_dataset.csv` to Google Cloud Storage bucket
- [ ] Create BigQuery dataset and load master file
- [ ] Engineer additional BigQuery features:
  - Tenure bands (0–1y, 1–3y, 3–5y, 5–10y, 10+)
  - Salary percentile within department cohort
  - Rolling attendance trend (3-month window)

</details>

### Fixed deadlines

| Milestone | Date | Weight |
|---|---|---|
| Final Report | 31 Aug 2026 | 30% |
| Presentation & demo | 02–09 Sep 2026 | 30% |
| Supervisor review | ≥ 1 week before LMS submission | — |
| Turnitin check | Before submission | — |

---

## 12. Evaluation Plan

### Metric 1: Recall > 80% on Attrition Class

**How it will be measured**:
1. Train model on `nexus_hr_master_dataset.csv` (2,820 records)
2. Evaluate on `validation_srilanka.csv` (230 records, never seen during training)
3. Primary metric: Recall on the positive (attrition) class
4. Secondary metrics: Precision, F1, AUC-ROC
5. Confusion matrix showing true positives, false negatives, etc.

**Why this metric**: A missed at-risk employee (false negative) is far more costly than a false alarm (false positive). The system must catch as many potential leavers as possible.

**Benchmark comparison**: Also evaluate on `benchmark_ibm.csv` and compare against published results (Sarker 2021 reported ~85% accuracy on IBM data with Random Forest).

### Metric 2: SUS > 80

**How it will be measured**:
1. Deploy the full system (HR app + predictions + SHAP explanations)
2. Recruit 5–10 participants representing SME HR manager personas
3. Define task scenarios:
   - "Log in and find the dashboard"
   - "Identify the three highest-risk employees"
   - "Explain why Employee X is flagged as high risk"
   - "Generate this month's payroll"
4. Administer the standard 10-item SUS questionnaire after task completion
5. Calculate composite SUS score (0–100 scale)

**Interpretation**: SUS > 80 = "Excellent" (Bangor et al., 2009). SUS 68 = industry average.

### Metric 3: Cost < LKR 10,000/month

**How it will be measured**:
1. Run the system for one full billing cycle on GCP
2. Simulate realistic usage: 50 employees, daily attendance logging, weekly pulse checks, 100 predictions/month, 1 retraining run
3. Export GCP billing report
4. Document each line item and total

**Safety margin**: The estimated cost is ~LKR 140/month. Even at 10x the estimated usage, the cost stays under LKR 1,500 — well within the LKR 10,000 target.

### Headline Result: Transfer vs Local (the core empirical finding)

`scripts/train_model.py` trains and reports **two models side by side**. The contrast between them is the project's central empirical contribution — it turns a data limitation into evidence for the research gap.

| Model | What it does | Features | SL ROC-AUC | SL PR-AUC | Usable operating point |
|---|---|---|---|---|---|
| **Transfer** | Train on international attrition (Saudi+Russian) → predict SL intention | 4 shared | **0.64** (SMOTETOMEK, seed 42; seed-averaged 0.72 ± 0.10 — unstable. See P2 §12 #7. A LogReg on the same features would give 0.83 ± 0.005 — see P3 §12 #9) | 0.29 | None — recall 0.80 needs precision ~0.15 (flags ~90% of staff) |
| **Local** | Train + 5-fold CV *within* SL data on 8 psychometric constructs | 8 | **0.94** (5 seeds 0.93–0.94; bootstrap 95% CI [0.88, 0.98]; Brier 0.056) | 0.79 (baseline 0.14) | Optimistic **P 0.73 / R 0.82** (threshold tuned on the reported fold); honest nested **P 0.58 / R 0.88** — see §12 limitation #6 |

**Interpretation.** Cross-cultural transfer of attrition patterns is weak; a locally-trained model on rich, same-instrument features is strong and *usable* (0.94, with a genuine early-warning operating point). This directly quantifies why Sri Lanka needs its own HR data — which is precisely the research gap that motivated the project. The "negative" transfer result is not a failure; it is the evidence. **Audit P2 (6 Jul 2026) sharpens this:** decomposing the 4 transfer features shows the *genuinely* cross-country demographics (`Age`+`Gender`) score **0.46 — below chance**, and the whole 0.64–0.72 "transfer" signal comes from the two shared satisfaction features (`JobSatisfaction`+`WorkLifeBalance` alone → 0.83). But on the SL side those two are the *same within-survey constructs* the local model uses (CMV-correlated with the intention target, per P1) — so the "transfer" number is buoyed by same-source SL signal, not knowledge transferred from Saudi/Russia. True cross-cultural transfer is essentially nil, which **strengthens** the "SL needs its own data" gap rather than weakening it.

The local model's most important constructs (RF importance) are interpretable and plausible: Work-Life Balance, Co-worker Support, Innovative Work Behaviour, and Job Satisfaction. SHAP plots are saved to `reports/shap_local.png` (local) and `reports/shap_summary.png` (transfer); full numbers in `reports/training_report.json`.

### Honest limitations (report these alongside the result)

These are properties of the available data, not bugs. They bound what can be claimed.

1. **Small N for the local model.** 230 records, ~33 positives. The 0.94 is reported as a *repeated cross-validation mean with seed range* (0.93–0.94) precisely because a single split would be unstable. It is encouraging, not definitive.
2. **Construct, not behaviour.** Both models predict turnover *intention* (composite ≥ 3.5), not observed resignations (intention–behaviour gap, Griffeth et al. 2000). Results are a flight-risk proxy.
3. **Feature provenance differs by model.** The transfer model is limited to the 4 features shared with the international data (its SHAP plot is dominated by `Age` — but see limitation #8: on the SL validation side `Age` takes only 4 coded values with 88.7% at a single one, so that dominance must not be read as a substantive age effect). The local model's 8 constructs are **survey-sourced** — in production their input is the in-app weekly **Pulse Check** (live since June 29, 2026; see §8), *not* the operational HR data (attendance/leave/payroll). The two models therefore target different deployment paths.
4. **Base-rate mismatch (transfer model).** International training prevalence ~42% vs SL 14.3%; thresholds are tuned on a held-out split and the full metric suite (P/R/F1/ROC-AUC/PR-AUC + confusion matrix) is reported at each operating point, never recall alone.
5. **Label-shift confound in the transfer experiment.** The transfer model trains on observed attrition (Saudi/Russian) but is validated on intention ≥ 3.5 (SL). The weak 0.64 therefore conflates cross-cultural domain shift with behaviour-vs-intention label shift. Name it explicitly in the thesis; the practical conclusion (local data is required) holds under either component, but the claim must be worded precisely. (Audit P2, limitation #7, adds a third strand: the residual signal is same-source satisfaction, not genuine transfer.)
6. **Common method variance is present but not disqualifying (audit P1 resolved, 5 Jul 2026).** The local model's 8 predictor constructs and the intention target come from the same survey instrument, same respondents, same sitting (Podsakoff et al. 2003), so shared-method variance is a real concern. Audit P1 (`scripts/audit_local_model.py`, `reports/audit_local_model.json`) settled what it does and does not do: (a) **no leakage** — the construct matrix has 0% missing values so the "impute on all rows" step is a no-op (fold-internal vs all-data ROC-AUC delta = 0.0000), and the target's ET-1..4 items are a **disjoint** group from every predictor construct (no item-overlap); (b) the **0.94 ROC-AUC survives** — leak-free mean 0.937, bootstrap 95% CI [0.88, 0.98], well-calibrated (Brier 0.056); (c) the one genuine correction is the **operating point**: `train_model.py` tunes the threshold on the same out-of-fold predictions it reports P/R at, so the interim "P 0.73 / R 0.82" is optimistic — under nested threshold selection it is **P 0.58 / R 0.88**. Constructs correlate −0.43 to −0.61 with the intention composite (theoretically expected direction). **Action for the final report:** report the 0.94 with its bootstrap CI, report the nested operating point (or clearly label 0.73/0.82 as optimistic), and add a Harman's single-factor / marker-variable CMV note in Chapter 5.
7. **RQ3 answered — synthetic augmentation is a mild, non-harmful hybrid, not a driver (audit P2, 6 Jul 2026).** `scripts/ablation_synthetic.py` (`reports/ablation_synthetic.json`, `ablation_synthetic.png`) runs the transfer model over 6 conditions × 5 seeds on the fixed SL validation set (harness verified: SMOTETOMEK/seed-42 reproduces the 0.64 headline exactly). Findings: (a) **synthetic helps a little** — with class-weighting, ROC-AUC 0.821 (with synthetic) vs 0.788 (real-only), Δ +0.032 at the edge of seed noise (|z|≈1.3); under the SMOTETOMEK headline path Δ +0.063 but within noise (|z|≈0.7). **Synthetic-only ≈ 0.53** (near random) — it has no standalone transferable signal, only augments. (b) **The 2.0 / 0.5 sample weights are immaterial** — 2.0/0.5 vs 1.0/1.0 → Δ −0.007 (|z|≈0.4); the specific ad-hoc weighting does no real work, so disclose it as a defensible-but-not-load-bearing choice. (c) **The transfer signal is same-source, not cross-cultural** — `Age`+`Gender` alone score 0.46 (below chance); `JobSatisfaction`+`WorkLifeBalance` alone score 0.83; the two satisfaction features are the SL survey's own constructs (CMV-linked per #6), so the "transfer" AUC does not reflect knowledge transferred from Saudi/Russia. (d) **The 0.64 headline is one draw** from an unstable SMOTETOMEK distribution (seed-averaged 0.72 ± 0.10); a class-weighted transfer would be higher and stable (0.82 ± 0.02) but we keep 0.64 as the documented recipe and recontextualise it here rather than restate the number. **Action for the final report:** state RQ3's answer (hybrid augmentation gives a marginal, non-harmful lift; weights immaterial; report the ablation table), and frame the transfer result via the demographic-vs-satisfaction decomposition.

8. **Fairness cannot be fully validated on this data — structurally, not by oversight (audit P5, 15 Aug 2026).** `scripts/fairness_audit.py` (`reports/fairness_audit.json`). Two hard blocks: (a) **`Age` is not continuous** — it takes 4 coded values (25: n=204 / **88.7%**, 35: 17, 45: 6, 52: 3), almost certainly bracket midpoints from the source instrument, so age-band subgroup analysis is unsupportable *and* the interim report's Figure 6 "Age dominates the transfer model" must be re-worded, since the feature is near-constant on the validation side; (b) **the female subgroup has 2 positive cases** (2/73 = 2.7% vs male 31/157 = 19.8%), so a female ROC-AUC is unevaluable and the script deliberately refuses to print one. What *is* established: evaluable slices are clean (male 0.941, age=25 0.943, overall 0.943); the four-fifths rule fails on both attributes (gender 0.416, age 0.462) but decomposing against base rates splits the two cases — for **gender** the model's gap is *narrower* than the outcome gap already present (base-rate ratio 0.139; women flagged at 3.0× their own base rate vs men 1.0×), which is the Kleinberg et al. (2016) / Chouldechova (2017) calibration-vs-parity impossibility rather than a defect, whereas for **age** the model *amplifies* the gap (0.462 vs base 0.574; n=26, indicative only). A new **proxy test** shows `Gender` is recoverable from the 8 constructs at ROC-AUC **0.655** — weak but non-zero, so "the deployed model excludes protected attributes" is mostly, not entirely, true. **Action for the final report:** write a dedicated fairness/ethics section (LO2) reporting the above with Kleinberg/Chouldechova, Barocas & Selbst and the EU AI Act high-risk framing; state subgroup validation as a **deployment precondition**; and adopt the drop-and-test recommendation in #9.

9. **Estimator choice is empirically justified for the local model and *not* for the transfer model (audit P3, 15 Aug 2026).** `scripts/baseline_comparison.py` (`reports/baseline_comparison.json`) runs LogReg and Gradient Boosting through the identical harness. **Local arm: RF wins outright** — 0.937 ± 0.006 vs GBM 0.853 ± 0.016 and LogReg 0.823 ± 0.009 (Δ +0.084, |z| = 7.8), with the best PR-AUC (0.790) and Brier (0.061). Since the local model is the deployed one and the 0.94 headline, "Why Random Forest?" is answered where it counts. **Transfer arm: RF loses** — LogReg scores 0.854 ± 0.003 vs RF 0.821 ± 0.020 (class-weight) and 0.833 ± 0.005 vs 0.718 ± 0.100 (SMOTETOMEK), i.e. better *and* roughly an order of magnitude more stable; GBM collapses to 0.393 under SMOTETOMEK. This **corroborates P2 from an independent direction**: the transfer setting is so signal-poor that a 4-feature linear model matches or beats an ensemble, so RF's extra capacity buys variance rather than accuracy. **Action for the final report:** publish the baseline table in Chapter 5; defend RF for the local model on the evidence, and for the transfer model either report the LogReg figure alongside or justify RF explicitly on cross-model consistency and exact TreeSHAP — do not leave the choice asserted. Note that the local RF arm reproduces P1's leak-free 0.937 exactly, which cross-validates both harnesses.

10. **The ≥ 3.5 binarisation is not driving the headline (audit P4, 15 Aug 2026).** `scripts/threshold_sensitivity.py` (`reports/threshold_sensitivity.json`) re-derives the SL target at ET ≥ 3.0 / 3.5 / 4.0 (51 / 33 / 12 positives; the master training target is unchanged throughout, since it is real observed attrition). The local−transfer contrast holds at **every** cut: +0.131 / +0.116 / +0.095 (class-weight) and +0.215 / +0.218 / +0.175 (SMOTETOMEK). Two honesty notes to carry into the writeup: only ≥ 3.0 and ≥ 3.5 clear a 20-positive reliability bar (at ≥ 4.0 the bootstrap CI widens to [0.68, 0.95] and the point is labelled indicative), and **3.5 happens to be where the local model peaks** (0.937 vs 0.908 and 0.849) — the cut long predates this analysis and the contrast is robust regardless, but the full curve must be shown rather than the best point alone. PR-AUC is reported against its own moving baseline at each cut (lift 3.7× / 5.5× / 8.5×).

**Implications for the thesis.** Lead with the transfer-vs-local comparison as the empirical contribution, supported by the framework, methodology, cost architecture, and production HR platform. Do **not** claim a single universal ">80% recall" headline. The honest path to an even stronger result is obtaining real Sri Lankan *attrition* (not intention) data from a partner SME — noted as future work.

### Evaluation hardening (from the 5 July 2026 research audit)

| Audit item | Defends |
|---|---|
| P1 — leakage/CMB audit ✅ **done 5 Jul** | The 0.94 headline (survives: CI [0.88, 0.98], no leakage; operating point corrected) |
| P2 — synthetic ablation ✅ **done 6 Jul** | RQ3 (now answered: synthetic +0.03 marginal, weights immaterial, transfer signal is same-source not cross-cultural) |
| P3 — baseline comparison ✅ **done 15 Aug** | "Why Random Forest?" (RF vindicated on the local model, \|z\|=7.8; LogReg better on the transfer model — disclosed) |
| P4 — threshold sensitivity ✅ **done 15 Aug** | The ≥ 3.5 binarization choice (contrast survives ≥ 3.0 / 3.5 / 4.0) |
| P5 — fairness subgroup analysis ✅ **done 15 Aug** | LO2/ethics (subgroup validation is structurally limited; drop `Age`+`Gender` from the transfer model) |
| P6 — measured-vs-estimated cost discipline | RQ2 |

Full detail in `created_docs/Audit_and_FineTuning_Plan.md`.

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Headline results weaken under audit** (0.94 inflated by CMB/leakage; transfer claim over-read) | ~~Medium~~ Low (P1 done) | High | **Audit P1 completed 5 Jul 2026** (`scripts/audit_local_model.py`): no leakage (0% missing; ET items disjoint), 0.94 survives with bootstrap 95% CI [0.88, 0.98] and Brier 0.056. Residual: the reported operating point was optimistic (nested P 0.58 / R 0.88) — correct it in the final report. Thesis wording reframed around the transfer-vs-local contrast with the label-shift confound named explicitly (§12). |
| **No real Sri Lankan company data contributed** | High | Medium | The validation set (PLoS ONE 230 records) provides real Sri Lankan signal. The pipeline is designed to accept partner data later — the research contribution is the framework and methodology, not dependent on a single dataset. |
| **GCP cost exceeds target** | Low | Medium | Serverless architecture inherently limits cost. BigQuery free tier covers most queries. Cloud Run scales to zero. Monitor billing alerts at USD 5 and USD 10 thresholds. |
| **PDPA compliance gap** | Low | High | Cloud DLP scan before every upload. PII stripping at database layer. Audit trail on all exports. No personal identifiers in model features. |
| **Russian personality traits cause noise** | Medium | Low | These columns are 60% NaN in the master dataset. Strategy: either drop them entirely or impute and use as optional features. (Note: they are not in the Sri Lanka validation set, so they cannot contribute to the primary evaluation regardless.) |
| **Model performs well on IBM but poorly on Sri Lanka** | Medium | High | IBM data is synthetic and not representative. Sri Lanka validation is the primary target — IBM benchmark is secondary. If there's a gap, investigate which features transfer and which don't. |
| **SUS < 80** | Medium | Medium | Iterate on dashboard UX before final evaluation. Test with 2–3 users first (pilot), incorporate feedback, then run formal evaluation. The HR app is already production-grade — the risk is in how predictions/explanations are presented. |
| **Viva questions about synthetic data validity** | Medium | Medium | The key defense: synthetic data has weight 0.5 (lowest) and is generated from coefficients fitted on 2,550 real records. The model is primarily trained on real international data. Synthetic data fills feature gaps (attendance, leave) that real datasets lack. **P2 ablation (6 Jul 2026) now backs this empirically**: synthetic-only is near-random (0.53), and dropping synthetic changes SL ROC-AUC by only ~+0.03 — the model does not depend on it, and it is not harmful. |
| ~~**"Why Random Forest?" cannot be answered empirically**~~ **Resolved (P3 done 15 Aug 2026)** | ~~High~~ Resolved | Medium | `scripts/baseline_comparison.py`: RF wins the local arm outright (0.937 vs GBM 0.853 / LogReg 0.823, \|z\|=7.8) — the deployed model's estimator is defended by a table. Residual to disclose, not hide: LogReg beats RF on the *transfer* arm and is far more stable, which independently corroborates that the transfer setting is signal-poor (see §12 limitation #9). |
| **Fairness/bias exposure in an employment-ML system** (Age + Gender are transfer-model inputs; EU AI Act would class this high-risk) | ~~Medium~~ Low (P5 done) | High | **Audit P5 completed 15 Aug 2026** (`scripts/fairness_audit.py`). The deployed local model takes no protected attribute (gender proxy from its 8 constructs is only 0.655 — weak, disclosed). Drop-and-test shows removing `Age`+`Gender` from the transfer model costs nothing (Δ +0.004) — **adopt it**. Four-fifths results are reported with a base-rate decomposition so the gender result is not misread as model bias. Residual: subgroup validation is structurally impossible on this data (2 female positives; `Age` 88.7% one value) — must be stated as a deployment precondition, and the interim Figure 6 Age commentary must be corrected. See §12 limitation #8. |
| ~~**Headline contrast is an artefact of the ≥ 3.5 intention cut**~~ **Resolved (P4 done 15 Aug 2026)** | ~~Medium~~ Resolved | High | `scripts/threshold_sensitivity.py`: the local−transfer gap survives at ET ≥ 3.0 / 3.5 / 4.0 (+0.095 to +0.131 class-weight; +0.175 to +0.218 SMOTETOMEK). Disclose that 3.5 is the local model's peak and that ≥ 4.0 (12 positives) is indicative only. See §12 limitation #10. |
| **Ethics approval for SUS/Pulse Check delayed** | Medium | Medium | Start the KIU approval process immediately (P7); SUS study gated on it. Pulse Check design is already privacy-preserving (employees never see their own score; manager access is permission-gated). |
| **Project Diary/Logbook not maintained in required format** | High | Medium | Required by guidelines §7 and the final submission checklist. Assemble in August (P11) from `masters_plan.md`, git history, and supervisor meeting notes. |
| ~~**RQ3 left unanswered**~~ **RQ3 answered (P2 done 6 Jul 2026)** | ~~Medium~~ Resolved | High | `scripts/ablation_synthetic.py` (6 conditions × 5 seeds, `reports/ablation_synthetic.json`): synthetic augmentation gives a marginal, non-harmful lift (+0.03 ROC-AUC, edge of noise); synthetic-only ≈ 0.53 (near random); the 2.0/0.5 weights are immaterial (Δ −0.007). Decomposition shows the transfer AUC is same-source SL satisfaction signal, not cross-cultural transfer (Age+Gender = 0.46). See §12 limitation #7. |

---

## 14. Key Decisions Log

This section records non-obvious decisions and their reasoning, for thesis discussion and viva defense.

### Decision 1: Multi-source international data over waiting for local data

**Context**: No Sri Lankan HR attrition dataset exists. Options were: (a) wait for a partner company to contribute data, (b) use only synthetic data, (c) combine international real data with synthetic augmentation.

**Chosen**: Option (c).

**Reasoning**: Option (a) delays the project indefinitely. Option (b) means the model learns only from machine-generated patterns. Option (c) provides real attrition patterns from developing countries (Saudi Arabia, Russia) where workforce dynamics share characteristics with Sri Lanka (private sector, similar GDP per capita range, hierarchical management structures), while synthetic data adds Sri Lankan salary ranges and feature distributions.

### Decision 2: scikit-learn Random Forest over Vertex AI AutoML

**Context**: GCP offers Vertex AI AutoML for tabular prediction, which would automate model selection and training.

**Chosen**: scikit-learn locally.

**Reasoning**: AutoML costs USD 50+ per training run, produces an opaque model, and doesn't support exact SHAP computation. For a research project that must demonstrate understanding and provide explanations, a transparent model is essential. RF + SHAP gives equivalent accuracy at near-zero cost.

### Decision 3: Recompute intercept for synthetic generation

**Context**: The calibrated logistic regression has an intercept reflecting the Saudi/Russian combined baseline attrition rate (~44%). Using this directly would generate synthetic data with 44% attrition.

**Chosen**: Keep calibrated slopes, solve for a new intercept targeting 15% attrition.

**Reasoning**: The slopes tell us *which factors matter and how much* — these transfer across contexts. The intercept sets the baseline rate — this is country-specific. Sri Lankan SME attrition is ~15% per SLBFE 2023 and ILO reports, not 44%.

### Decision 4: IBM data excluded from training

**Context**: IBM HR Analytics is the most-cited HR attrition dataset in ML literature. Options: include in training, use as benchmark only, or ignore.

**Chosen**: Benchmark only.

**Reasoning**: IBM data is itself synthetic (generated by IBM researchers). Its income values are in fictional units incompatible with real salaries. Including it would contaminate income features even after normalisation (z-scoring a synthetic distribution doesn't make it real). Keeping it as a benchmark allows comparison against published results without compromising training integrity.

### Decision 5: Held-out Sri Lanka validation (not cross-validation)

**Context**: With only 230 Sri Lankan records, there was temptation to include them in training.

**Chosen**: Keep 100% held out.

**Reasoning**: These 230 records are the only real Sri Lankan data available. Using even a portion in training would make evaluation unreliable. A model that overfits to 230 records and reports Recall > 80% on a subset of the same data proves nothing. By holding them out completely, evaluation measures true generalization.

### Decision 6: NaN over zero for missing features

**Context**: Saudi and Russian datasets don't have attendance or leave columns. The merge creates NaN values for these features.

**Chosen**: Leave as NaN.

**Reasoning**: `Attendance_LateCount = 0` means "perfect attendance" (an employee signal). `Attendance_LateCount = NaN` means "not measured" (no information). Filling NaN with 0 would teach the model that all Saudi and Russian employees had perfect attendance — a false signal that could bias predictions. The CSV keeps NaN so the distinction survives to train time; `train_model.py` then imputes explicitly (sklearn's RandomForest cannot consume NaN directly — see the correction in §4).

### Decision 7: Within-source z-score normalisation for income

**Context**: Saudi salaries are in SAR (~3,750 SAR/month median), synthetic data uses LKR (~140,000 LKR/month median), IBM uses fictional units.

**Chosen**: Z-score within each source before merging.

**Reasoning**: The model should learn "this employee earns below their cohort average" not "this employee earns 3,750 units." Relative purchasing power within context is the semantically correct feature.

### Decision 8: cp1251 encoding fallback

**Context**: Russian dataset uses Windows Cyrillic encoding (cp1251), not UTF-8. This caused `UnicodeDecodeError` on byte 0xf1.

**Chosen**: Multi-encoding fallback loop (utf-8-sig → utf-8 → cp1251 → latin-1).

**Reasoning**: Rather than hard-coding cp1251, the fallback gracefully handles any CSV encoding encountered. This makes the pipeline robust to future datasets from any language/region.

---

## 15. References

### Datasets

| ID | Citation | Used For |
|---|---|---|
| D1 | Alqahtani, A. et al. (2025). Saudi Employee Attrition Dataset. Mendeley Data, V1. DOI: 10.17632/6z2hty8php.1. CC BY 4.0. | Training (1,191 records) |
| D2 | davinwijaya. Employee Turnover Dataset. Kaggle. (Real Russian company data.) | Training (1,129 records) |
| D3 | Kanchana, L. & Jayathilaka, R. (2023). Factors impacting employee turnover intentions among professionals in Sri Lankan startups. PLOS ONE, 18(2), e0281729. DOI: 10.1371/journal.pone.0281729. | Validation (230 records) |
| D4 | IBM. HR Employee Attrition and Performance Dataset. Kaggle. (Synthetic.) | Benchmark (1,470 records) |

### Research Papers

| ID | Citation | Relevance |
|---|---|---|
| R1 | Griffeth, R.W., Hom, P.W. & Gaertner, S. (2000). A meta-analysis of antecedents and correlates of employee turnover. Journal of Management, 26(3), 463–488. | Literature default coefficients for attrition predictors |
| R2 | Sarker, I.H. (2021). Machine learning: algorithms, real-world applications and research directions. SN Computer Science, 2(3), 1–21. | ML algorithms for attrition prediction; benchmark comparison |
| R3 | Hevner, A.R. et al. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105. | Research methodology (Design Science Research) |
| R4 | Brooke, J. (1996). SUS: A quick and dirty usability scale. Usability Evaluation in Industry, 189(194), 4–7. | System Usability Scale evaluation methodology |
| R5 | Angrave, D. et al. (2016). HR and analytics: why HR is set to fail the big data challenge. Human Resource Management Journal, 26(1), 1–11. | HR analytics adoption challenges in SMEs |
| R6 | Ribeiro, M.T. et al. (2016). "Why should I trust you?": Explaining the predictions of any classifier. KDD '16, 1135–1144. | Explainability in ML (motivates SHAP usage) |
| R7 | Allen, D.G. (2008). Retaining talent: A guide to analyzing and managing employee turnover. SHRM Foundation. | Turnover cost estimation (50–200% of annual salary) |
| R8 | Ajit, P. (2016). Prediction of employee turnover in organizations using machine learning algorithms. IJARAI, 5(9), 22–26. | ML approach comparison |
| R9 | Kodakandla, V. (2021). Ensuring fairness in machine learning to advance health equity. Annals of Internal Medicine. | Algorithmic fairness considerations |

### Standards and Reports

| ID | Citation | Relevance |
|---|---|---|
| S1 | Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022 | Compliance framework for all data handling |
| S2 | Sri Lanka Bureau of Foreign Employment (SLBFE) (2023). Annual Statistical Report. | Sri Lankan labour market attrition rates (~15% baseline) |
| S3 | Department of Census and Statistics, Sri Lanka (2023). Labour Force Survey. | Employment statistics and SME workforce size |
| S4 | ICTA (2023). National AI Strategy for Sri Lanka. | Policy context for AI adoption |
| S5 | Salary Explorer Sri Lanka (2023). | LKR salary ranges for synthetic data calibration |

---

## Appendix A: Repository Structure

```
HR-Analytics-Framework/
├── hr_base_system/                    # Production HR application
│   ├── backend/                       # Node.js/Express 5 REST API
│   │   ├── src/
│   │   │   ├── controllers/           # 16 endpoint handlers
│   │   │   ├── routes/                # 14 route definitions
│   │   │   ├── services/              # 28 business logic services
│   │   │   ├── middleware/            # 10 middleware (auth, RBAC, cache, etc.)
│   │   │   ├── schemas/              # Zod validation schemas
│   │   │   ├── config/               # Configuration and payroll constants
│   │   │   ├── utils/                # Logger, PAYE calculator, PDF generation
│   │   │   └── tests/                # 19 integration/unit test files
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 462-line database schema (20+ models)
│   │   │   ├── migrations/            # 21 versioned migrations
│   │   │   └── seeds/                 # Dev, test, and E2E seed data
│   │   └── docker-compose.yml         # PostgreSQL + backend
│   ├── frontend/                      # React 19 + Vite SPA
│   │   ├── src/
│   │   │   ├── pages/                 # 10 page directories
│   │   │   ├── components/            # 40+ components across 8 feature areas
│   │   │   ├── hooks/                 # useFeedback, useNetworkStatus, useWebAuthn
│   │   │   ├── app/                   # Layout, providers, error boundary
│   │   │   └── lib/                   # Shared utilities and API client
│   │   └── playwright.config.ts       # E2E test configuration
│   ├── packages/types/                # Shared TypeScript types (@simpala/types)
│   ├── ops/                           # Cloud Build, deploy, DB scripts
│   ├── docs/                          # 90+ documentation files
│   │   ├── technical/                 # Architecture, API reference, threat model
│   │   ├── product/                   # PRD, roadmap, user personas
│   │   ├── QA/                        # 12 testing guides and checklists
│   │   ├── ops/                       # 16 deployment and operations guides
│   │   └── planning/                  # Sprint reports and project plans
│   └── .github/workflows/            # CI/CD (deploy-dev.yml, deploy-prod.yml)
├── scripts/                           # Python ML pipeline
│   ├── download_datasets.py           # Fetch real-world datasets
│   ├── preprocess_raw.py              # xlsx → clean numeric CSV
│   ├── calibrate.py                   # Logistic regression on real data
│   ├── generate_synthetic_data.py     # 500 calibrated synthetic records
│   └── merge_and_clean_data.py        # Build master training file
├── data/                              # ML datasets
│   ├── nexus_hr_master_dataset.csv    # Training (2,820 records)
│   ├── validation_srilanka.csv        # Validation (230 records)
│   ├── benchmark_ibm.csv             # Benchmark (1,470 records)
│   ├── synthetic_hr_data.csv          # Generated synthetic (500 records)
│   ├── calibration_params.json        # Logistic regression coefficients
│   └── raw/                           # Raw downloaded datasets
│       ├── saudi_attrition.csv        # 1,191 real Saudi records
│       ├── russian_turnover.csv       # 1,129 real Russian records
│       └── srilanka_turnover_intent.csv # 230 real Sri Lankan records
├── references/                        # 17 research paper summaries
├── CLAUDE.md                          # Development guidance
├── README.md                          # Project overview
└── masters_plan.md                    # This document
```

## Appendix B: Database Schema (Key Models)

```
Company (multi-tenant root)
├── User (email, password_hash, role: OWNER|ADMIN|HR|EMPLOYEE)
│   ├── Employee (personal details, job, salary, department)
│   │   ├── Attendance (daily check-in/out, corrections)
│   │   ├── LeaveBalance (per leave type, annual/remaining)
│   │   ├── LeaveRequest (application → approval workflow)
│   │   ├── Payslip (monthly salary breakdown, EPF/ETF/PAYE)
│   │   ├── EmployeeDocument (contracts, certificates, expiry tracking)
│   │   └── RosterAssignment (shift assignments)
│   ├── RefreshToken (JWT token management)
│   └── Authenticator (WebAuthn credentials)
├── LeaveType (company-specific leave policies)
├── ShiftTemplate (shift definitions)
├── BankFileExport (CIPS/SLIPS file generation log)
└── AuditLog (compliance audit trail with correlation IDs)
```

## Appendix C: Python Dependencies

| Package | Version | Purpose |
|---|---|---|
| pandas | latest | DataFrame operations for all data processing |
| numpy | latest | Numerical operations, random number generation |
| scikit-learn | latest | LogisticRegression (calibration), RandomForestClassifier (training), StandardScaler |
| scipy | latest | `expit` (numerically stable sigmoid) for logistic attrition probability |
| openpyxl | latest | Reading xlsx files in preprocess_raw.py |

Future additions for Phase 3:
| Package | Purpose |
|---|---|
| imbalanced-learn | SMOTETOMEK resampling |
| shap | SHAP feature attributions |
| matplotlib/seaborn | Feature importance and SHAP plots |
| joblib | Model serialisation for deployment |

---

*Last updated: July 5, 2026*
*Current phase: Phase 5 complete — Interim Report submitted (June 2026) and full research audit done (July 5, 2026; `created_docs/Audit_and_FineTuning_Plan.md`). Everything is deployed and live on dev: both models served from the IAM-locked Cloud Run endpoint (`simpalahr-ml-dev` in `kpi-uat`) with GCS-stored models and a monthly retrain Job + Scheduler (§8, `ml_service/`); the production HR app (`Mad-marketing-git/HR`) calls the inference service and surfaces the Attrition Risk card (PRs #207/#208, cold-start fixed in #210); and the in-app **Pulse Check** (chosen over Dialogflow CX to keep the cost thesis) auto-produces the 8 constructs (PRs #211/#212), all verified end-to-end.*
*Next milestone: July 2026 evaluation hardening (audit P1–P7 — leakage/CMB audit of the 0.94, RQ3 synthetic ablation, baselines, threshold sensitivity, fairness audit, formal cost study, KIU ethics approval), then the August SUS study and final dissertation (due 31 Aug 2026). See §11.*
