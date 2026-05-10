# GEMINI.md - NexusHR Project Context

## 🚀 Current Status (Updated: May 2026)
- **Proposal Status:** ✅ Submitted and Approved.
- **Viva Status:** ✅ Successfully Completed.
- **Current Phase:** Phase 2 - Data Preparation and Feature Engineering (Dataset Ready).

## Project Overview
**NexusHR** is a Final Year Individual Research Project (COM 4901) for Kaatsu International University. It aims to develop a **Cost-Effective Predictive HR Analytics Framework** specifically for Sri Lankan SMEs (20-50 employees).

### Core Research Goal
To democratize enterprise-grade AI by reducing operational costs to under **LKR 10,000 per month** (approx. LKR 200/employee) using a cloud-native serverless architecture.

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
- **AI Layer:** Vertex AI (AutoML), Dialogflow CX (Pulse Checks), Cloud DLP (Compliance).
- **Cloud Infrastructure:** Serverless (Cloud Run, Cloud Functions, Cloud Scheduler).

---

## Next Steps (Phase 2 & 3)
1.  **GCP Integration:** Upload `nexus_hr_master_dataset.csv` to Google Cloud Storage (GCS).
2.  **BigQuery Setup:** Load dataset into BigQuery for serverless feature engineering.
3.  **Privacy Automation:** Configure Cloud DLP for automated PII detection and masking.
4.  **Model Training:** Initiate Vertex AI AutoML Tabular training on the master dataset.
5.  **Conversational Flow:** Design the Dialogflow CX "Pulse Check" agent.


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
