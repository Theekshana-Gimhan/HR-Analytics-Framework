# GEMINI.md - NexusHR Project Context

## 🚀 Current Status (Updated: March 2026)
- **Proposal Status:** ✅ Submitted and Approved.
- **Viva Status:** ✅ Successfully Completed.
- **Current Phase:** Phase 2 - Data Preparation and Feature Engineering.

## Project Overview
**NexusHR** is a Final Year Individual Research Project (COM 4901) for Kaatsu International University. It aims to develop a **Cost-Effective Predictive HR Analytics Framework** specifically for Sri Lankan SMEs (20-50 employees).

### Core Research Goal
To democratize enterprise-grade AI by reducing operational costs to under **LKR 10,000 per month** (approx. LKR 200/employee) using a serverless cloud architecture.

### Key Research Components
- **Domain:** Human Resource Management (HRM) & Machine Learning (ML).
- **Target:** Employee Attrition Prediction.
- **Methodology:** Design Science Research (DSR).
- **Data Strategy:** Hybrid approach using real anonymized company data, statistical data augmentation (target: 500 records), and the IBM HR Analytics benchmark dataset.
- **Key Metrics:** Recall (>80%), System Usability Scale (SUS > 80), and Cost-Efficiency Audit (< LKR 10,000/mo).

---

## Technical Architecture (The "Artifact")
The system is built as a monorepo located in the `hr_base_system` directory.

### Tech Stack
- **Frontend:** React 19 (Vite), TypeScript, Material UI.
- **Backend:** Node.js/Express 5, TypeScript, Prisma 6 ORM.
- **Database:** PostgreSQL (deployed on GCP).
- **AI Layer:** Google Vertex AI (AutoML Tabular & Batch Prediction).
- **Cloud Infrastructure:** Serverless (Cloud Run, Cloud Functions, Cloud Scheduler).

### Key Features for AI Training
- **Tenure:** Joining date vs. current date.
- **Attendance:** Aggregated patterns (Late, Absent, Half-Day).
- **Leave:** Frequency and duration of leave requests.
- **Finance:** Salary positioning and allowances.
- **Contextual:** Job title, department, and commute distance.

---

## Next Steps (Phase 2)
1.  **Data Extraction:** Implement Node.js script to extract anonymized HR records from PostgreSQL.
2.  **Privacy Scrubbing:** Ensure full compliance with SL PDPA No. 9 of 2022 by stripping all PII (Names, NICs, Emails).
3.  **Data Augmentation:** Python script to generate ~500 synthetic records based on local SME distributions.
4.  **Vertex AI Setup:** Initial dataset upload and AutoML Tabular training.

---

## Building and Running
*Refer to `hr_base_system/README.md` for full instructions.*

### Local Development
```bash
# Start Backend
cd hr_base_system/backend
npm run dev

# Start Frontend
cd hr_base_system/frontend
npm run dev
```

---

## Research References
Complete summaries are available in the `references/` directory, including:
- **Sarker (2021):** ML algorithms for attrition.
- **Kodakandla (2021):** Serverless cost-efficiency.
- **SL PDPA (2022):** Sri Lanka Personal Data Protection Act.
- **Brooke (1996):** System Usability Scale (SUS).
- **SLBFE (2023):** Brain Drain impact data.
