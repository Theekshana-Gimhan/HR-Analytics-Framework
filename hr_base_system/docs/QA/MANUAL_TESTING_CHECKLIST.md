# Simpala HR - Manual Testing Checklist

**Version:** 1.3
**Last Updated:** February 18, 2026
**Environment:** Local / Cloud Run (Dev)

---

## Overview

This checklist provides comprehensive manual testing scenarios for QA testers to validate the Simpala HR application. It reflects the current codebase state, including new modules for Documents, Profile, and Security.

**Deployed Environment URLs:**
- **Frontend:** https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app
- **Backend API:** https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app
- **API Documentation:** https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api-docs

**Test User Credentials (Default Seeds):**
| Role     | Email               | Password     |
| -------- | ------------------- | ------------ |
| Owner    | owner@simpala.lk    | password123  |
| Admin    | admin@simpala.lk    | password123  |
| Employee | john.doe@simpala.lk | Employee123! |

---

## 1. Authentication & Security Module

### 1.1 Login Flow

| #     | Test Case              | Steps                                                                                | Expected Result                             | Status |
| ----- | ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- | ------ |
| 1.1.1 | Valid login (Owner)    | 1. Go to login page<br>2. Enter owner@simpala.lk / password123<br>3. Click "Sign In" | Redirect to dashboard, shows user name/role | ⬜      |
| 1.1.2 | Valid login (Admin)    | 1. Enter admin@simpala.lk / password123<br>2. Click "Sign In"                        | Redirect to dashboard, admin menu visible   | ⬜      |
| 1.1.3 | Valid login (Employee) | 1. Enter john.doe@simpala.lk / Employee123!<br>2. Click "Sign In"                    | Redirect to dashboard, limited menu         | ⬜      |
| 1.1.4 | Invalid credentials    | 1. Enter wrong email/password<br>2. Click "Sign In"                                  | Error message displayed, stays on login     | ⬜      |
| 1.1.5 | Empty fields           | 1. Leave fields empty<br>2. Click "Sign In"                                          | Validation error messages                   | ⬜      |

### 1.2 Session Management

| #     | Test Case           | Steps                                       | Expected Result                  | Status |
| ----- | ------------------- | ------------------------------------------- | -------------------------------- | ------ |
| 1.2.1 | Session persistence | 1. Login<br>2. Close and reopen browser tab | Stays logged in                  | ⬜      |
| 1.2.2 | Logout              | 1. Click user menu<br>2. Click "Logout"     | Redirect to login, token cleared | ⬜      |

### 1.3 Security Settings (NEW)

| #     | Test Case          | Steps                                                                           | Expected Result                              | Status |
| ----- | ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| 1.3.1 | View Security Page | 1. Navigate to Profile > Security                                               | "Secure Your Account" page loads             | ⬜      |
| 1.3.2 | Register Passkey   | 1. Click "Add New Passkey"<br>2. Enter Device Name<br>3. Complete WebAuthn flow | Passkey added to list                        | ⬜      |
| 1.3.3 | Delete Passkey     | 1. Click default delete icon on a passkey<br>2. Confirm                         | Passkey removed from list                    | ⬜      |
| 1.3.4 | 2FA Status         | 1. Check "Two-Factor Auth" section                                              | Switch is present but DISABLED (Placeholder) | ⬜      |

---

## 2. Dashboard & Widgets

| #   | Test Case        | Steps                                              | Expected Result                               | Status |
| --- | ---------------- | -------------------------------------------------- | --------------------------------------------- | ------ |
| 2.1 | Stats display    | 1. Login<br>2. View Dashboard                      | Shows total employees, active, pending leaves | ⬜      |
| 2.2 | Liquidity Widget | 1. View "Estimated Payroll Cost"<br>2. Check total | Shows calculated cost (Basic + Statutory)     | ⬜      |
| 2.3 | Recent Activity  | 1. Check activity feed                             | Shows recent leaves/hires                     | ⬜      |

---

## 3. Employee Management Module

### 3.1 Employee List

| #     | Test Case            | Steps                                           | Expected Result                                   | Status |
| ----- | -------------------- | ----------------------------------------------- | ------------------------------------------------- | ------ |
| 3.1.1 | View employee list   | 1. Navigate to Employees                        | List shows all employees with pagination          | ⬜      |
| 3.1.2 | Search by name       | 1. Type "John" in search<br>2. Wait for results | Filtered to matching employees                    | ⬜      |
| 3.1.3 | Filter by department | 1. Select department filter                     | Only department employees shown                   | ⬜      |
| 3.1.4 | Employee details     | 1. Click on employee row                        | Detail view opens with tabs (Overview, Documents) | ⬜      |

### 3.2 Create Employee

| #     | Test Case            | Steps                                                           | Expected Result                   | Status |
| ----- | -------------------- | --------------------------------------------------------------- | --------------------------------- | ------ |
| 3.2.1 | Add employee (valid) | 1. Click "Add Employee"<br>2. Fill required fields<br>3. Submit | Employee created, success message | ⬜      |
| 3.2.2 | NIC validation       | 1. Enter invalid NIC<br>2. Submit                               | NIC validation error shown        | ⬜      |
| 3.2.3 | Salary validation    | 1. Enter salary < 10,000<br>2. Submit                           | Salary validation error           | ⬜      |

---

## 4. Profile Management (NEW)

| #   | Test Case       | Steps                                                                      | Expected Result                                   | Status |
| --- | --------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| 4.1 | View My Profile | 1. Navigate to Profile                                                     | Shows correct Name, Role, Job Title, Bank Details | ⬜      |
| 4.2 | Edit Profile    | 1. Click "Edit Profile"<br>2. Update Phone/Address<br>3. Save              | Profile updated, success message                  | ⬜      |
| 4.3 | Change Password | 1. Click "Change Password"<br>2. Enter Current & New Password<br>3. Submit | Password updated, can login with new password     | ⬜      |

---

## 5. Documents Module (NEW)

### 5.1 Document Management (Admin/Owner)

| #     | Test Case         | Steps                                                                                     | Expected Result                           | Status |
| ----- | ----------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- | ------ |
| 5.1.1 | Upload Document   | 1. Navigate to Documents<br>2. Select Employee & File (PDF/IMG, <10MB)<br>3. Click Upload | Document appears in list, success message | ⬜      |
| 5.1.2 | Invalid File Type | 1. Try uploading .txt or .exe file                                                        | Error: "Invalid file type"                | ⬜      |
| 5.1.3 | File Size Limit   | 1. Try uploading file > 10MB                                                              | Error: "File too large"                   | ⬜      |
| 5.1.4 | Delete Document   | 1. Click Delete icon on a document<br>2. Confirm                                          | Document removed from list                | ⬜      |
| 5.1.5 | Search Documents  | 1. Type filename or employee name in search                                               | List filters to matches                   | ⬜      |

### 5.2 Employee View

| #     | Test Case          | Steps                                            | Expected Result             | Status |
| ----- | ------------------ | ------------------------------------------------ | --------------------------- | ------ |
| 5.2.1 | View Own Documents | 1. Login as Employee<br>2. Navigate to Documents | Shows only own documents    | ⬜      |
| 5.2.2 | No Upload Access   | 1. Check Document page as Employee               | "Upload" section is HIDDEN  | ⬜      |
| 5.2.3 | Download           | 1. Click Download icon                           | File downloads successfully | ⬜      |

---

## 6. Leave Management Module

### 6.1 Leave Requests

| #     | Test Case            | Steps                                                           | Expected Result                 | Status |
| ----- | -------------------- | --------------------------------------------------------------- | ------------------------------- | ------ |
| 6.1.1 | Submit leave request | 1. Login as Employee<br>2. Go to Leave<br>3. Submit valid dates | Request created, status PENDING | ⬜      |
| 6.1.2 | Insufficient balance | 1. Request > available balance                                  | Error: Insufficient balance     | ⬜      |
| 6.1.3 | Overlapping leave    | 1. Request dates overlapping existing leave                     | Error: Overlapping request      | ⬜      |

### 6.2 Leave Approval

| #     | Test Case       | Steps                                                       | Expected Result                   | Status |
| ----- | --------------- | ----------------------------------------------------------- | --------------------------------- | ------ |
| 6.2.1 | Approve request | 1. Login as Admin<br>2. Click pending request<br>3. Approve | Status APPROVED, balance deducted | ⬜      |
| 6.2.2 | Reject request  | 1. Click pending request<br>2. Reject                       | Status REJECTED, balance restored | ⬜      |

---

## 7. Attendance & Roster

### 7.1 Roster Management

| #     | Test Case          | Steps                                  | Expected Result                     | Status |
| ----- | ------------------ | -------------------------------------- | ----------------------------------- | ------ |
| 7.1.1 | View Roster        | 1. Navigate to "Roster"                | Weekly view of shifts displayed     | ⬜      |
| 7.1.2 | Assign Shift       | 1. Drag shift template to employee/day | Shift assigned, saved automatically | ⬜      |
| 7.1.3 | Violation Warning  | 1. Assign shift < 12h after previous   | Warning: "Rest period violation"    | ⬜      |
| 7.1.4 | View Shift Details | 1. Click assigned shift                | Details modal opens (Time, Role)    | ⬜      |

### 7.2 Attendance Tracking

| #     | Test Case    | Steps                                            | Expected Result               | Status |
| ----- | ------------ | ------------------------------------------------ | ----------------------------- | ------ |
| 7.2.1 | Manual Entry | 1. Go to Attendance<br>2. Add entry for employee | Record saved                  | ⬜      |
| 7.2.2 | Bulk Upload  | 1. Upload valid CSV                              | Records imported successfully | ⬜      |

---

## 8. Payroll Module

### 8.1 Processing

| #     | Test Case        | Steps                                     | Expected Result                             | Status |
| ----- | ---------------- | ----------------------------------------- | ------------------------------------------- | ------ |
| 8.1.1 | Generate Payslip | 1. Select employee & month<br>2. Generate | Payslip created                             | ⬜      |
| 8.1.2 | Statutory Checks | 1. View Payslip                           | EPF (8%/12%), ETF (3%) calculated correctly | ⬜      |
| 8.1.3 | Bank Export      | 1. Select payslips<br>2. Export SLIPS     | CSV file downloaded with correct format     | ⬜      |

---

## 9. Company Settings

| #   | Test Case           | Steps                                                            | Expected Result                      | Status |
| --- | ------------------- | ---------------------------------------------------------------- | ------------------------------------ | ------ |
| 9.1 | Update Company Info | 1. Go to Settings > Company<br>2. Update Name/Address<br>3. Save | details updated                      | ⬜      |
| 9.2 | Configure EPF/ETF   | 1. Update statutory rates (if enabled)<br>2. Save                | New rates applied to future payrolls | ⬜      |

---

## 10. Defect Log

| ID  | Severity | Description | Steps | Status |
| --- | -------- | ----------- | ----- | ------ |
|     |          |             |       |        |

---

*Document maintained by: QA Team*
*Last review: February 18, 2026*
