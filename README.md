# NexusHR: Cost-Effective Predictive HR Analytics Framework

NexusHR is a Final Year Individual Research Project (COM 4901) for Kaatsu International University (KIU). The project focuses on developing a cost-effective, AI-driven predictive analytics framework specifically tailored for Sri Lankan Small and Medium Enterprises (SMEs).

---

## 🎯 Research Goal
To democratize enterprise-grade AI by reducing operational costs to under **LKR 10,000 per month** (approx. LKR 200/employee) using a cloud-native serverless architecture.

### Key Objectives
- **Predictive Attrition:** Identify at-risk employees before they resign using predictive modeling.
- **Cost Efficiency:** Achieve high performance (Recall > 80%) on a minimal budget with serverless architecture.
- **Privacy Compliance:** Ensure strict adherence to the Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022.

---

## 🚀 Technical Architecture
The system is built as a modular application with an integrated, pay-per-use AI pipeline.

### Tech Stack
#### Web Application (SME Interface)
- **Frontend:** React 19 (Vite), TypeScript, Material UI
- **Backend:** Node.js/Express 5, TypeScript, Prisma 6 ORM

#### Cloud-Native AI & Data Pipeline (GCP Serverless)
- **Data Storage & ETL:** Google Cloud Storage (GCS) and Serverless BigQuery
- **Machine Learning & XAI:** Vertex AI (Random Forest with SMOTETOMEK) and Vertex Explainable AI (for manager trust)
- **Conversational AI (Pulse Checks):** Dialogflow CX and Vertex AI Large Language Models (LLMs) for real-time employee sentiment analysis
- **Compliance Automation:** Google Cloud Data Loss Prevention (DLP) for automated PII masking

---

## 📅 Project Plan
The project is structured into six strategic phases:

### Phase 1: Foundation & Research (✅ Completed)
- Literature review on SME HR challenges and cloud pricing models.
- Project proposal and architecture design.
- Viva defense successfully completed.

### Phase 2: Data Preparation & Feature Engineering (🔄 In Progress)
- Integrate IBM HR Analytics Benchmark Data (Kaggle).
- Implement Google Cloud DLP for data anonymization.
- Engineer dynamic features in BigQuery (e.g., Sentiment Velocity, Burnout Spikes, Loyalty Ratio).

### Phase 3: Machine Learning & Explainable AI (XAI)
- Train Random Forest classifier with SMOTETOMEK on Vertex AI.
- Integrate Vertex Explainable AI to generate feature attributions (SHAP values).
- Evaluate model metrics (Accuracy, Precision, Recall, F1-Score).

### Phase 4: Conversational AI Integration
- Design weekly "Pulse Check" conversation flow in Dialogflow CX.
- Set up Vertex AI LLM to calculate continuous employee sentiment scores.
- Connect sentiment pipeline to BigQuery to update ML feature sets dynamically.

### Phase 5: Application Development & Serverless Deployment
- Develop React/Node.js web dashboard for HR Managers.
- Deploy backend services using Google Cloud Run / Cloud Functions.
- Implement automated early-warning email alerts for high flight-risk employees.

### Phase 6: Testing, Evaluation & Final Documentation
- Perform end-to-end system testing and cost evaluation (verify < LKR 10k/mo).
- User Acceptance Testing (UAT) simulation.
- Finalize thesis documentation and prepare for final defense.

---

## 📈 Current Progress (Phase 2)
We are currently in the **Data Preparation and Feature Engineering** phase:
- [x] Research Proposal Approved.
- [x] Viva Defense Successfully Completed.
- [x] Integrated IBM HR Analytics Benchmark Data.
- [x] Execute Statistical Data Augmentation (500 records generated).
- [x] Merge and Clean Hybrid Dataset (1,970 records total).
- [ ] Implement Data Extraction & Anonymization Script (Local Data via Cloud DLP).
- [ ] Design Conversational AI flow for weekly employee "Pulse Checks".
- [ ] Engineer dynamic features in BigQuery (e.g., Sentiment Velocity, Burnout Spikes).

---

## 🛡️ Privacy & Ethics
This project implements **Privacy by Design**, tailored specifically for the Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022.

- **Data Masking:** All Personally Identifiable Information (PII) such as Names, NICs, and Emails are stripped at the database layer.
- **Cloud DLP:** Before any data crosses borders to the GCP machine learning pipeline, Google Cloud Data Loss Prevention (DLP) is triggered to guarantee that no restricted personal data is used during model training or inference.

---

## ⚙️ Setup Instructions

### Clone the repository:
```bash
git clone https://github.com/Theekshana-Gimhan/HR-Analytics-Framework.git
cd HR-Analytics-Framework
```

### Install Dependencies:
```bash
cd hr_base_system
npm install
```

### Environment Configuration:
Copy `.env.example` to `.env` in both `backend` and `frontend` folders and fill in your local/cloud credentials.

### Run Locally:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

---
*This project is part of the requirements for the BSc (Hons) in Management Information Systems.*
