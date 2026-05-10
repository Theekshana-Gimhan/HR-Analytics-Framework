# NexusHR: Cost-Effective Predictive HR Analytics Framework

[![Research Phase](https://img.shields.io/badge/Research%20Phase-Phase%202%3A%20Data%20Preparation-blue)](https://github.com/Theekshana-Gimhan/HR-Analytics-Framework)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**NexusHR** is a Final Year Individual Research Project (COM 4901) for Kaatsu International University (KIU). The project focuses on developing a cost-effective, AI-driven predictive analytics framework specifically tailored for Sri Lankan Small and Medium Enterprises (SMEs).

---

## 🎯 Research Goal
To democratize enterprise-grade AI by reducing operational costs to under **LKR 10,000 per month** (approx. LKR 200/employee) using a cloud-native serverless architecture.

### Key Objectives
- **Predictive Attrition:** Identify at-risk employees before they resign.
- **Cost Efficiency:** Achieve high performance (Recall > 80%) on a minimal budget.
- **Privacy Compliance:** Adhere to the Sri Lanka Personal Data Protection Act (PDPA) No. 9 of 2022.

---

## 🚀 Technical Architecture
The system is built as a modular application with a integrated AI pipeline.

### Tech Stack
- **Frontend:** React 19 (Vite), TypeScript, Material UI.
- **Backend:** Node.js/Express 5, TypeScript, Prisma 6 ORM.
- **Database:** PostgreSQL (Google Cloud SQL).
- **AI/ML:** Google Vertex AI (AutoML Tabular), Python (Data Augmentation).
- **Cloud Infrastructure:** Google Cloud Platform (Serverless Cloud Run & Functions).

---

## 📂 Project Structure
```text
├── data/                  # Datasets (IBM Benchmark + Local Anonymized)
├── hr_base_system/        # The Core HRMS (Artifact)
│   ├── backend/           # Node.js API
│   ├── frontend/          # React Dashboard
│   └── ops/               # Deployment scripts (GCP)
├── references/            # Academic literature summaries
└── docs/                  # Research guidelines and timelines
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Google Cloud SDK (for deployment)

### Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Theekshana-Gimhan/HR-Analytics-Framework.git
   cd HR-Analytics-Framework
   ```

2. **Install Dependencies:**
   ```bash
   cd hr_base_system
   npm install
   ```

3. **Environment Configuration:**
   Copy `.env.example` to `.env` in both `backend` and `frontend` folders and fill in your local/cloud credentials.

4. **Run Locally:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

---

## 📈 Current Progress (Phase 2)
We are currently in the **Data Preparation and Feature Engineering** phase:
- [x] Research Proposal Approved.
- [x] Viva Defense Successfully Completed.
- [x] Integrated IBM HR Analytics Benchmark Data.
- [ ] Implement Data Extraction & Anonymization Script (Local Data).
- [ ] Execute Statistical Data Augmentation (Target: 500 records).

---

## 🛡️ Privacy & Ethics
This project implements **Privacy by Design**. All Personally Identifiable Information (PII) such as Names, NICs, and Emails are stripped at the database layer before data is processed by the AI model, ensuring full compliance with the **SL PDPA No. 9 of 2022**.

---

## 👨‍💻 Author
**Theekshana Gimhan**  
Final Year Student - KIU  
[GitHub Profile](https://github.com/Theekshana-Gimhan)

---
*This project is part of the requirements for the BSc (Hons) in Management Information Systems.*
