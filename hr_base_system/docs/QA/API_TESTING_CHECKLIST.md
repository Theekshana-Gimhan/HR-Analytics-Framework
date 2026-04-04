# API Testing Checklist

**Version:** 1.0
**Last Updated:** February 13, 2026
**Environment:** Cloud Dev / Local

---

## Overview
This checklist allows developers and QA to verify backend functionality directly via API endpoints, bypassing the UI. This is critical for catching logic errors, validation issues, and edge cases before they reach the frontend.

## Prerequisites
- **VS Code** with [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension (Recommended).
- OR **Postman** / **Insomnia**.
- **Base URL**:
    - Local: `http://localhost:3001`
    - Cloud Dev: `https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app`

## Quick Start (Smoke Tests)
We have provided a ready-to-use smoke test file.
1. Open `docs/QA/resources/smoke_tests.http` in VS Code.
2. Update the `@baseUrl` variable if needed.
3. Click "Send Request" above each URL.

---

## 1. Authentication module

| # | Test Case | Endpoint | Method | Expected Result | Status |
|---|-----------|----------|--------|-----------------|--------|
| 1.1 | Login (Owner) | `/auth/login` | POST | 200 OK, returns `token`, `user` object | ⬜ |
| 1.2 | Login (Invalid) | `/auth/login` | POST | 401 Unauthorized, `message` | ⬜ |
| 1.3 | Get Profile | `/auth/me` | GET | 200 OK, returns current user details | ⬜ |
| 1.4 | Refresh Token | `/auth/refresh` | POST | 200 OK, returns new `accessToken` | ⬜ |
| 1.5 | Logout | `/auth/logout` | POST | 200 OK, clears cookies | ⬜ |

## 2. Employee Module

| # | Test Case | Endpoint | Method | Expected Result | Status |
|---|-----------|----------|--------|-----------------|--------|
| 2.1 | List Employees | `/employees` | GET | 200 OK, array of employees, pagination meta | ⬜ |
| 2.2 | Get Employee | `/employees/:id` | GET | 200 OK, employee object with `jobDetails` | ⬜ |
| 2.3 | Create Employee | `/employees` | POST | 201 Created, returns new ID | ⬜ |
| 2.4 | Validate NIC | `/employees` | POST | 400 Bad Request if NIC invalid | ⬜ |

## 3. Leave Module

| # | Test Case | Endpoint | Method | Expected Result | Status |
|---|-----------|----------|--------|-----------------|--------|
| 3.1 | Get Leave Types | `/leave/types` | GET | 200 OK, list (Annual, Casual, Medical) | ⬜ |
| 3.2 | Apply Leave | `/leave/request` | POST | 201 Created, status `PENDING` | ⬜ |
| 3.3 | Check Balance | `/leave/balance/:id` | GET | 200 OK, remaining days per type | ⬜ |
| 3.4 | Approve Leave | `/leave/:id/approve` | PATCH | 200 OK, status `APPROVED` | ⬜ |

## 4. Payroll Module

| # | Test Case | Endpoint | Method | Expected Result | Status |
|---|-----------|----------|--------|-----------------|--------|
| 4.1 | Process Payroll | `/payroll/generate` | POST | 201 Created, returns payslip ID | ⬜ |
| 4.2 | Get Payslip | `/payroll/:id` | GET | 200 OK, calculations (EPF/ETF/PAYE) correct | ⬜ |

## 5. Security Checks

| # | Test Case | Endpoint | Method | Expected Result | Status |
|---|-----------|----------|--------|-----------------|--------|
| 5.1 | No Token | `/employees` | GET | 401 Unauthorized | ⬜ |
| 5.2 | SQL Injection | `/auth/login` | POST | 400 Bad Request (Validation blocked) | ⬜ |

---

*Verified by:* ____________________  
*Date:* ____________________
