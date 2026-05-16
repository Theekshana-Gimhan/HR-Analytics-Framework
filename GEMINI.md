# GEMINI.md - NexusHR Project Context

## Current Status (Updated: May 2026)
- **Proposal Status:** Submitted and Approved.
- **Viva Status:** Successfully Completed.
- **Current Phase:** Phase 2 - Data Preparation & Feature Engineering (Pipeline Complete, GCP upload pending).

## Project Overview
**NexusHR** is a Final Year Individual Research Project (COM 4901) for Kaatsu International University. It develops a **Cost-Effective Predictive HR Analytics Framework** for Sri Lankan SMEs (20-50 employees).

### Core Research Goal
Democratize enterprise-grade AI for Sri Lankan SMEs at under **LKR 10,000/month** using a cloud-native serverless architecture.

### Key Research Metrics
- **Recall > 80%** on attrition prediction (minimise false negatives = missed at-risk employees)
- **SUS > 80** on the HR manager dashboard
- **Cost < LKR 10,000/month** for end-to-end inference

---

## Technical Architecture

### Application (hr_base_system/)
- **Frontend:** React 19, Vite, TypeScript, Material UI
- **Backend:** Node.js/Express 5, TypeScript, Prisma 6, PostgreSQL
- **Auth:** JWT (15-min access / 7-day refresh), WebAuthn, RBAC (OWNER/ADMIN/HR/EMPLOYEE)
- **Sri Lankan compliance:** EPF (8%/12%), ETF (3%), PAYE, CIPS/SLIPS bank file export

### ML Pipeline (scripts/)
- **Model:** scikit-learn Random Forest + SMOTETOMEK (NOT Vertex AI AutoML — too costly, too opaque)
- **Explainability:** SHAP feature attributions (exact, not approximated)
- **Training data:** Weighted multi-source dataset (see Data Strategy below)
- **Deployment:** Cloud Run inference endpoint (pay-per-request, scales to zero)

### GCP Services
| Service | Purpose |
|---|---|
| Cloud Storage (GCS) | Dataset and model artifact storage |
| BigQuery | Feature engineering and analytics |
| Cloud DLP | Automated PII masking before model training |
| Cloud Run | Serverless model inference endpoint |
| Cloud Scheduler | Monthly retraining triggers |

---

## Data Strategy

No public individual-level HR attrition dataset exists for Sri Lankan companies — confirmed research gap, documented as motivation.

### Training Data (nexus_hr_master_dataset.csv — 2,820 records)
| Source | Records | Type | Weight |
|---|---|---|---|
| Saudi Employee Attrition (Mendeley, CC BY 4.0) | 1,191 | Real — developing country private sector | 2.0 |
| Russian Employee Turnover (Kaggle, davinwijaya) | 1,129 | Real — private sector turnover with personality traits | 2.0 |
| Local Synthetic (calibrated logistic model) | 500 | Simulated — Sri Lankan SME context | 0.5 |

### Validation & Benchmark (held out, never trained on)
| File | Source | Purpose |
|---|---|---|
| validation_srilanka.csv | Sri Lanka Startups Survey (PLoS ONE 2023), 230 records | Primary validation — real Sri Lankan workforce |
| benchmark_ibm.csv | IBM HR Analytics, 1,470 records | Comparison against published literature |

### Calibration Pipeline
Synthetic data parameters are NOT hard-coded. They are derived from a logistic regression fit on 2,550 real records (Saudi + Russian + Sri Lanka):

**Calibrated coefficients (from real data):**
- `age_norm`: -0.297 — older employees less likely to leave
- `tenure_years_norm`: +0.396 — experienced workers more mobile (Saudi context)
- `salary_ratio_norm`: +0.051 — salary alone is a weak predictor
- `satisfaction_norm`: -0.514 — job satisfaction is the dominant driver

**Literature defaults (features not in real datasets):**
- `late_count_norm`: +0.18
- `absent_count_norm`: +0.22
- `career_stagnation`: +0.48

The intercept is not taken from calibration (Saudi baseline rate 43% is too high for SL context). It is computed to target 15% base attrition rate — consistent with SLBFE 2023 and ILO LKA reports.

### Future-Proof Design
When real Sri Lankan company data is contributed:
1. Add CSV to `data/raw/` with appropriate column mapping
2. Add loader in `merge_and_clean_data.py` with `SampleWeight=4.0`
3. Rerun `calibrate.py` → `generate_synthetic_data.py` → `merge_and_clean_data.py`
4. Retrain model — no architectural changes needed

---

## Script Pipeline

```
scripts/download_datasets.py    # Downloads real datasets; prints manual steps for Kaggle
scripts/preprocess_raw.py       # Converts xlsx to clean numeric CSVs (Saudi + Sri Lanka)
scripts/calibrate.py            # Fits logistic regression on real data → calibration_params.json
scripts/generate_synthetic_data.py  # Generates 500 synthetic LKR-context records
scripts/merge_and_clean_data.py     # Builds master + validation + benchmark files
```

Run in order. If a dataset is missing, the pipeline degrades gracefully to literature defaults.
The Russian dataset (Kaggle CSV) is read directly by calibrate.py and merge_and_clean_data.py —
it does not need preprocess_raw.py. Both scripts handle cp1251 (Cyrillic) encoding automatically.

---

## Phase 2 Remaining Tasks

- [ ] Configure Cloud DLP job for automated PII detection/masking
- [ ] Upload `data/nexus_hr_master_dataset.csv` to GCS bucket
- [ ] Create BigQuery dataset and load master file
- [ ] Engineer additional BigQuery features (tenure bands, salary percentile vs. cohort)

## Phase 3 Next Steps

1. Write `scripts/train_model.py`:
   - Load master dataset with `SampleWeight`
   - Apply SMOTETOMEK on training split only (not validation)
   - Train `RandomForestClassifier` with `sample_weight` parameter
   - Evaluate on `validation_srilanka.csv` (primary) and IBM benchmark (comparison)
   - Compute SHAP values and save feature importance plot
2. Deploy trained model to Cloud Run
3. Wire prediction endpoint into HR dashboard

---

## Building and Running

Refer to `CLAUDE.md` for full command reference.

### Local Development (HR Application)
```bash
cd hr_base_system/backend && npm run dev
cd hr_base_system/frontend && npm run dev
```

### Data Pipeline
```bash
python scripts/preprocess_raw.py
python scripts/calibrate.py
python scripts/generate_synthetic_data.py
python scripts/merge_and_clean_data.py
```

---

## Research References
- **Griffeth et al. (2000):** Meta-analysis of employee turnover antecedents — coefficient defaults
- **Sarker (2021):** ML algorithms for attrition prediction
- **Alqahtani et al. (2025):** Saudi Employee Attrition Dataset (Mendeley DOI: 10.17632/6z2hty8php.1)
- **Senarathna et al. (2023):** Sri Lankan startup turnover intention survey (PLoS ONE DOI: 10.1371/journal.pone.0281729)
- **SL PDPA (2022):** Sri Lanka Personal Data Protection Act No. 9 of 2022
- **SLBFE (2023):** Brain drain impact data and Sri Lankan labour market attrition rates
- **Brooke (1996):** System Usability Scale (SUS)
