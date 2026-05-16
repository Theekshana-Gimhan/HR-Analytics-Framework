# NexusHR: Cost-Effective Predictive HR Analytics Framework

NexusHR is a Final Year Individual Research Project (COM 4901) for Kaatsu International University (KIU). The project focuses on developing a cost-effective, AI-driven predictive analytics framework specifically tailored for Sri Lankan Small and Medium Enterprises (SMEs).

---

## Research Goal

To democratize enterprise-grade AI by reducing operational costs to under **LKR 10,000 per month** (approx. LKR 200/employee) using a cloud-native serverless architecture.

### Key Objectives
- **Predictive Attrition:** Identify at-risk employees before they resign using predictive modeling.
- **Cost Efficiency:** Achieve high performance (Recall > 80%) on a minimal budget with serverless architecture.
- **Privacy Compliance:** Strict adherence to the Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022.

---

## Technical Architecture

The system is built as a monorepo with an integrated, pay-per-use AI pipeline.

### Web Application (SME Interface)
- **Frontend:** React 19 (Vite), TypeScript, Material UI
- **Backend:** Node.js/Express 5, TypeScript, Prisma 6 ORM, PostgreSQL

### Cloud-Native AI & Data Pipeline (GCP Serverless)
- **Data Storage & ETL:** Google Cloud Storage (GCS) and BigQuery
- **Machine Learning & XAI:** scikit-learn Random Forest with SMOTETOMEK + SHAP (Explainable AI)
- **Compliance Automation:** Google Cloud Data Loss Prevention (DLP) for automated PII masking
- **Deployment:** Cloud Run (serverless inference endpoint)

---

## Data Strategy

A hybrid training approach using three tiers of data, weighted by trust level:

| Source | Records | Type | Weight | Role |
|---|---|---|---|---|
| Saudi Employee Attrition (Mendeley, CC BY 4.0) | 1,191 | Real — developing-country private sector | 2.0 | Training |
| Russian Employee Turnover (Kaggle, davinwijaya) | 1,129 | Real — private sector with personality traits | 2.0 | Training |
| Local Synthetic (calibrated) | 500 | Simulated — Sri Lankan SME context | 0.5 | Training augmentation |
| Sri Lanka Startups Survey (PLoS ONE 2023) | 230 | Real — Sri Lankan workforce | — | Held-out validation only |
| IBM HR Analytics | 1,470 | Synthetic benchmark | — | Published comparison only |

Synthetic data is generated using a logistic function with coefficients calibrated from 2,550 real records (Saudi + Russian + Sri Lanka), not hand-coded rules. The calibration pipeline is reproducible: `download_datasets.py` → `preprocess_raw.py` → `calibrate.py` → `generate_synthetic_data.py` → `merge_and_clean_data.py`.

When real Sri Lankan company data is contributed later, it is added with weight 4.0 and the pipeline reruns without architectural changes.

---

## Project Plan

### Phase 1: Foundation & Research (Completed)
- Literature review on SME HR challenges and cloud pricing models.
- Project proposal and architecture design.
- Viva defense successfully completed.

### Phase 2: Data Preparation & Feature Engineering (In Progress)

- [x] Integrate IBM HR Analytics Benchmark Data (Kaggle) — benchmark only.
- [x] Audit and document absence of publicly available Sri Lankan individual-level HR data — confirmed research gap.
- [x] Download real international datasets: Saudi Employee Attrition (Mendeley, CC BY 4.0), Sri Lanka Startup Turnover Survey (PLoS ONE 2023).
- [x] Build preprocessing pipeline: encode categorical salary/tenure ranges, compute composite Likert scores.
- [x] Calibrate synthetic data generator from real datasets (logistic regression on 1,421 real records).
- [x] Replace hard-coded attrition rules with calibrated logistic function (scipy `expit`).
- [x] Fix cross-source income normalisation: z-score within each source, retain raw as `MonthlyIncome_raw`.
- [x] Build master training dataset: 2,820 records (Saudi Real + Russian Real + Synthetic), with `DataSource` and `SampleWeight` columns.
- [x] Create held-out validation set from Sri Lanka PLoS ONE survey (230 records, never in training).
- [x] Separate IBM data into benchmark-only file for published comparison.
- [ ] Configure Google Cloud DLP for automated PII detection and masking before GCP upload.
- [ ] Upload `nexus_hr_master_dataset.csv` to Google Cloud Storage.
- [ ] Load dataset into BigQuery for feature engineering.

### Phase 3: Machine Learning & Explainable AI (XAI)
- Train scikit-learn Random Forest classifier with SMOTETOMEK on weighted master dataset.
- Generate SHAP feature attributions for manager-facing explanations.
- Evaluate on held-out Sri Lanka validation set (primary) and IBM benchmark (comparison).
- Target: Recall > 80% on attrition class.

### Phase 4: Conversational AI Integration
- Design weekly "Pulse Check" conversation flow in Dialogflow CX.
- Run a monthly batch retraining job that incorporates new attendance/leave data from the HR system.
- Update BigQuery feature store with conversation sentiment scores.

### Phase 5: Application Development & Serverless Deployment
- Integrate attrition prediction endpoint into the React/Node.js dashboard.
- Deploy model inference via Cloud Run (pay-per-request, scales to zero).
- Implement automated early-warning email alerts for high flight-risk employees.

### Phase 6: Testing, Evaluation & Final Documentation
- End-to-end system testing and cost audit (verify < LKR 10k/month).
- User Acceptance Testing (UAT) with simulated SME users.
- System Usability Scale (SUS) evaluation — target > 80.
- Finalize thesis documentation and prepare for final defense.

---

## Privacy & Ethics

This project implements **Privacy by Design**, tailored specifically for the Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022.

- **Data Masking:** All PII (names, NICs, emails) stripped at the database layer before export.
- **Cloud DLP:** Automated PII masking triggered before any data movement to GCP.
- **Audit Trail:** Correlation IDs on all data operations for compliance logging.

---

## Setup Instructions

```bash
git clone https://github.com/Theekshana-Gimhan/HR-Analytics-Framework.git
cd HR-Analytics-Framework
```

### HR Application
```bash
cd hr_base_system
npm install
# See hr_base_system/backend/README.md for full local setup
```

### Data Pipeline (Python)
```bash
# 1. Download real datasets (follow printed instructions for manual steps)
python scripts/download_datasets.py

# 2. Convert xlsx to clean numeric CSVs
python scripts/preprocess_raw.py

# 3. Calibrate synthetic generator from real data
python scripts/calibrate.py

# 4. Regenerate synthetic data with calibrated coefficients
python scripts/generate_synthetic_data.py

# 5. Build master training dataset
python scripts/merge_and_clean_data.py
```

Python dependencies: `pandas`, `numpy`, `scikit-learn`, `scipy`, `openpyxl`

---

*This project is part of the requirements for the BSc (Hons) in Management Information Systems.*
