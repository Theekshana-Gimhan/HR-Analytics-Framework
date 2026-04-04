# QA Strategy & Execution Guide

**Version:** 2.0
**Last Updated:** February 13, 2026
**Status:** Active

## 1. Executive Summary
This document serves as the single source of truth for Quality Assurance (QA) at Simpala HR. It consolidates testing principles, execution guides, and environment management into an actionable strategy. 

**Core Principals:**
1.  **Shift Left:** Testing begins at the requirements phase.
2.  **Zero Defects in Payroll:** 100% accuracy required for all financial calculations.
3.  **Automated First:** Manual testing is reserved for exploratory and usability sessions.

---

## 2. Testing Pyramid & Tools

| Level | Scope | Tools | Responsibility | Coverage Target |
| :--- | :--- | :--- | :--- | :--- |
| **E2E** | Critical User Flows (Login, Payroll Run) | Playwright | QA / Senior Devs | Critical Paths Only |
| **Integration** | API Endpoints, Database Interactions | Jest (Backend), Vitest (Frontend) | Developers | 70% |
| **Unit** | Business Logic, Components, Utils | Jest, Vitest | Developers | > 80% |
| **Static** | Linting, Type Checking, Security Scans | ESLint, TSC, CodeQL, Trivy | CI Pipeline | 100% |

---

## 3. Test Environments

### 3.1 Local Development (Unit/Integration)
- **Database:** Dockerized PostgreSQL (recommended) or Local Postgres.
- **Seeding:** `npm run seed:test` (Minimal dataset for speed).
- **Execution:** `npm test` runs in isolation.

### 3.2 Cloud Dev Environment (Integration/E2E)
- **URL:** `https://simpalahr-backend-dev-[id].a.run.app`
- **Purpose:** Verification of deployment configuration and cloud-specific integrations (GCP Storage, Pub/Sub).
- **Update Frequency:** Automatic deploy on merge to `main`.
- **Testing Strategy:**
    - **Smoke Tests:** Run automatically post-deploy to verify health (`/health`, `/api/v1/auth/status`).
    - **Manual Verification:** Developers verify their feature on Cloud Dev before resolving tickets.

---

## 4. Execution Guides

### 4.1 Running Tests Locally
```bash
# Backend Unit & Integration
npm run test -w SimpalaHR/backend

# Frontend Unit
npm run test -w SimpalaHR/frontend

# End-to-End (Requires local backend running)
npm run e2e -w SimpalaHR/frontend
```

### 4.2 Testing Against Cloud Dev
To run E2E tests against the deployed dev environment:
```bash
E2E_BASE_URL=https://simpalahr-frontend-dev-[id].a.run.app npm run e2e -w SimpalaHR/frontend
```

---

## 5. Defect Management

### 5.1 Reporting Bugs
All bugs must be reported using the [standard template](./BUG_REPORT_TEMPLATE.md).

### 5.2 Severity Levels
- **Critical (P0):** System down, Data loss, Payroll Calculation Error. *Action: Immediate fix.*
- **High (P1):** Core feature broken, no workaround. *Action: Fix in current sprint.*
- **Medium (P2):** Feature broken, workaround exists. *Action: Prioritize in backlog.*
- **Low (P3):** Cosmetic, Typo, Minor Usability. *Action: Fix when convenient.*

---

## 6. Quality Gates (CI/CD)

A Pull Request (PR) can only be merged if:
1.  **Build Passes:** Backend and Frontend build successfully.
2.  **Tests Pass:** All Unit and Integration tests pass.
3.  **Linting Passes:** No ESLint or Prettier errors.
4.  **No Critical Vulnerabilities:** Trivy/CodeQL scan is clean.
