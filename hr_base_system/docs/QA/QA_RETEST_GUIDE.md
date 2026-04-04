# Simpala HR - QA Re-Test Guide (Junior Friendly)

**Version:** 1.4  
**Date:** December 23, 2025  
**Purpose:** Step-by-step guide for QA testers to manually verify all system functionality

> **âš ï¸ IMPORTANT: QA VERIFICATION REQUIRED**  
> Developers have fixed all 31 QA issues and 151 automated tests are passing.  
> **YOUR JOB:** Manually verify everything works before signing off.  
> See `QA_RETEST_CHECKLIST_2025-12-22.md` to record your verification results.

---

## ðŸŽ¯ Your Mission

You need to:
1. **Test all features** following this guide step-by-step
2. **Record results** in QA_RETEST_CHECKLIST_2025-12-22.md
3. **Report any bugs** you find (create new issues)
4. **Sign off** when everything passes
5. **DO NOT approve** production deployment until all tests pass

**Estimated Time:** 4-6 hours of focused testing

---

## âœ… QA Checklist Integration

As you complete each test section:
1. Mark the corresponding item in `QA_RETEST_CHECKLIST_2025-12-22.md`
2. Write your name and date tested
3. Check "Pass" or "Fail" for that module
4. If you find bugs, document them before marking as "Fail"

**Sections to verify:**
- [ ] Documents Module (4 tests)
- [ ] Leave Module (12 tests)
- [ ] Attendance Module (4 tests)
- [ ] Payroll Module (4 tests)
- [ ] Auth/Security (3 tests)
- [ ] Frontend Build (4 tests)

---

## Before You Start

### Important Information

| Item | Value |
|------|-------|
| **Frontend URL** | https://simpalahr-frontend-dev-85939737092.us-central1.run.app |
| **Backend API URL** | https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app |
| **API Documentation** | https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api-docs |

### Test User Credentials (IMPORTANT!)

| Role | Email | Password | What they can do |
|------|-------|----------|------------------|
| **Owner** | owner@simpala.lk | `password123` | Full access to everything |
| **Admin** | admin@simpala.lk | `password123` | Manage employees, approve leaves, run payroll |
| *ðŸ” 1. Authentication & Security Tests

**QA Checklist Reference:** Auth/Security Module (3 issues)  
**Your Sign-Off:** After completing all tests below, update QA_RETEST_CHECKLIST_2025-12-22.mdsimpala.lk | `Employee123!` | View own data, apply for leave |

> **Note:** The Employee password is different! It uses `Employee123!` (with capital E and exclamation mark)

### Test Data Available

The following test data has been seeded for testing (verified via automated tests Dec 22, 2025):

| Data Type | Count | Notes |
|-----------|-------|-------|
| Employees | 24 | Various roles and salaries (verified) |
| Leave Types | 3 | Annual (14 days cap), Casual (7 days cap), Medical (7 days cap) |
| Leave Requests | 20 | PENDING requests available for testing |
| Attendance Records | Active | For November-December 2025 |
| Payslips | Available | For November 2025 |

---

## 1. Authentication Tests

### Test 1.1.1: Owner Login
**Steps:**
1. Open https://simpalahr-frontend-dev-85939737092.us-central1.run.app in your browser
2. You should see the login page
3. In the Email field, type: `owner@simpala.lk`
4. In the Password field, type: `password123`
5. Click the "Sign In" button

**Expected Result:**
- âœ… You are redirected to the Dashboard
- âœ… You see "Dashboard" at the top
- âœ… The sidebar shows all menu items (Employees, Leave, Attendance, Payroll, etc.)

**Screenshot Example:**
- Take a screenshot showing the dashboard with all menu items visible

---

### Test 1.1.2: Admin Login
**Steps:**
1. If you're logged in, click your profile icon in the top right and click "Logout"
2. On the login page, enter: `admin@simpala.lk`
3. Enter password: `password123`
4. Click "Sign In"

**Expected Result:**
- âœ… Dashboard loads successfully
- âœ… All admin features are accessible

---

### Test 1.1.3: Employee Login
**Steps:**
1. Logout if logged in
2. Enter email: `john.doe@simpala.lk`
3. Enter password: `Employee123!` (note the capital E and !)
4. Click "Sign In"

**Expected Result:**
- âœ… Dashboard loads
- âœ… Limited menu items (cannot see admin features like "Manage Employees")
- âœ… Can see own attendance and leave balance

---

### Test 1.1.4: Invalid Login
**Steps:**
1. Logout if logged in
2. Enter email: `wrong@email.com`
3. Enter password: `wrongpassword`
4. Click "Sign In"

**Expected Result:**
- âœ… Error message appears (e.g., "Invalid credentials")
- âœ… You stay on the login page

---

### Test 1.1.5: Empty Fields
**âœ… After completing all authentication tests above:**
- [ ] Go to QA_RETEST_CHECKLIST_2025-12-22.md
- [ ] Find "Auth/Security (3 issues)" section
- [ ] Write your name, date, and mark Pass/Fail
- [ ] If any test failed, create bug report first

---

## ðŸ‘¥ 2. Employee Management Tests

**QA Checklist Reference:** Part of general functionality verification  
**Your Sign-Off:** Update checklist after completing this section

**Expected Result:**
- âœ… Validation errors appear under the empty fields
- âœ… Form does not submit

---

### Test 1.2.2: Logout
**Steps:**
1. Login as any user
2. Look for your profile icon/name in the top right corner
3. Click on it
4. Click "Logout"

**Expected Result:**
- âœ… You are redirected to the login page
- âœ… Trying to go back to dashboard redirects to login

---

## ðŸ‘¥ 2. Employee Management Tests

> **Note:** You must be logged in as **Admin** or **Owner** for these tests

### Test 2.1.1: View Employee List
**Steps:**
1. Login as Admin (`admin@simpala.lk` / `password123`)
2. Click "Employees" in the sidebar menu
3. Wait for the page to load

**Expected Result:**
- âœ… List of employees appears
- âœ… Each row shows: Name, Email, Job Title, Salary
- âœ… Pagination is visible if there are many employees

---

### Test 2.1.2: Search Employee
**Steps:**
1. On the Employees page
2. Find the search box at the top
3. Type "John" and press Enter or wait

**Expected Result:**
- âœ… Only employees with "John" in their name appear
- âœ… John Doe should be visible in the results

---

### Test 2.2.1: Add New Employee (Valid)
**Steps:**
1. Click "Add Employee" button
2. Fill in the form:
   - First Name: `Test`
   - Last Name: `Employee`
   - Email: `test.employee@simpala.lk`
   - Password: `TestPass123`
   - NIC: `199912345678` (12 digits)
   - Job Title: `QA Tester`
   - Salary: `75000`
   - Bank Name: `Bank of Ceylon`
   - Account Number: `1234567890`
3. Click "Save" or "Create"

**Expected Result:**
- âœ… Success message appears
- âœ… New employee appears in the list
- âœ… You can try logging in with the new employee credentials

---

### Test 2.2.2: Add Employee with Invalid NIC
**Steps:**
1. Click "Add Employee"
2. In the NIC field, enter: `ABC123` (invalid format)
3. Try to submit the form

**Expected Result:**
- âœ… Validation error appears for NIC field
- âœ… Form does not submit

---
**âœ… After completing employee tests:**
- [ ] Update QA_RETEST_CHECKLIST_2025-12-22.md
- [ ] Note any issues with employee CRUD operations
- [ ] Verify documents module if you tested uploads (QA# 8.1-8.4)

---

## ðŸ–ï¸ 3. Leave Management Tests

**QA Checklist Reference:** Leave Module (12 issues - largest module!)  
**Your Sign-Off:** Update checklist after ALL leave tests pass  
**Critical Issues:** QA# 3.1.1, 3.1.4, 3.2.2, 3.2.6, 3.5.1, 3.5.3
1. Find an employee in the list (e.g., John Doe)
2. Click on their row or click an "Edit" button
3. Change their salary from current value to `160000`
4. Click "Save" or "Update"

**Expected Result:**
- âœ… Success message appears
- âœ… Updated salary shows in the employee list

---

## 3. Leave Management Tests

### Test 3.1.1: View Leave Types (Admin)
**Steps:**
1. Login as Admin
2. Go to "Leave" in the sidebar
3. Look for "Leave Types" or a tab showing leave types

**Expected Result:**
- âœ… You see three leave types:
  - Annual Leave (14 days)
  - Casual Leave (7 days)
  - Medical Leave (7 days)

---

### Test 3.2.1: Submit Leave Request (Employee)
**Steps:**
1. Logout and login as Employee (`john.doe@simpala.lk` / `Employee123!`)
2. Click "Leave" in the sidebar
3. Click "Apply for Leave" or "New Request"
4. Fill the form:
   - Leave Type: Select "Annual Leave"
   - Start Date: Pick a future date (e.g., December 20, 2025)
   - End Date: Pick a date 2 days after start date (e.g., December 22, 2025)
   - Reason: `Year-end vacation`
5. Click "Submit"

**Expected Result:**
- âœ… Success message appears
- âœ… Leave request shows in your list with "PENDING" status
- âœ… Your leave balance is NOT reduced yet (only after approval)

---

### Test 3.2.5: View Leave Balance
**Steps:**
1. As Employee, go to the Leave page
2. Look for a section showing your leave balance

**Expected Result:**
- âœ… You see balance for each leave type:
  - Annual: Shows available days
  - Casual: Shows available days
  - Medical: Shows available days

---

### Test 3.3.2: Approve Leave Request (Admin)
**Steps:**
1. Logout and login as Admin
2. Go to "Leave" in the sidebar
3. Find a leave request with "PENDING" status
4. Click on it or click "Approve"
5. Confirm the approval

**Expected Result:**
- âœ… Status changes to "APPROVED"
- âœ… If you check the employee's balance, it should be reduced

---

### Test 3.3.3: Reject Leave Request
**Steps:**
1. As Admin, find another PENDING leave request
2. Click "Reject"
3. Optionally enter a reason
4. Confirm

**Expected Result:**
- âœ… Status changes to "REJECTED"
- âœ… Employee's balance is NOT reduced

---

## 4. Attendance Tests

### Test 4.1.1: View Own Attendance (Employee)
**Steps:**
1. Login as Employee (`john.doe@simpala.lk` / `Employee123!`)
2. Click "Attendance" in the sidebar

**Expected Result:**
- âœ… You see your attendance records
- âœ… Records show date and status (PRESENT/ABSENT)
- âœ… You should see ~23 attendance records for November 2025

---

### Test 4.2.1: Mark Attendance (Admin)
**Steps:**
1. Login as Admin
2. Go to "Attendance"
3. Look for "Mark Attendance" or a form to add attendance
4. Fill in:
   - Select an employee (e.g., Employee ID 11 - Kasun Fernando)
   - Date: Today's date
   - Status: PRESENT
5. Click Save

**Expected Result:**
- âœ… Success message appears
- âœ… Attendance record is created

---

### Test 4.3.1: Bulk Upload Attendance
**Steps:**
1. As Admin, go to Attendance
2. Look for "Bulk Upload" or "CSV Upload" button
3. Download the sample CSV template if available, or create a CSV file with:
   ```
   employeeId,date,status
   10,2025-12-04,PRESENT
   11,2025-12-04,PRESENT
   12,2025-12-04,ABSENT
   ```
4. Upload the file

**Expected Result:**
- âœ… Success message with count of records created
- âœ… Attendance records appear for those employees/dates

---

## 5. Payroll Tests

### Test 5.1.1: Generate Single Payslip
**Steps:**
1. Login as Admin
2. Go to "Payroll" in the sidebar
3. Find "Generate Payslip" or similar
4. Select:
   - Employee: John Doe (ID 10)
   - Month: December
   - Year: 2025
5. Click Generate

**Expected Result:**
- âœ… Payslip is created
- âœ… Shows:
  - Gross Pay: â‚¨150,000
  - EPF Employee (8%): â‚¨12,000
  - EPF Employer (12%): â‚¨18,000
  - ETF (3%): â‚¨4,500
  - Net Pay: After deductions

---

### Test 5.1.2: Duplicate Payslip Prevention
**Steps:**
1. Try to generate another payslip for the same employee/month/year

**Expected Result:**
- âœ… Error message: "Payslip already exists" or similar
- âœ… Duplicate is not created

---

### Test 5.2.1: Verify EPF Calculation
**Steps:**
1. Look at any generated payslip
2. Calculate manually:
   - For salary â‚¨150,000
   - EPF Employee = 150,000 Ã— 8% = â‚¨12,000
   - EPF Employer = 150,000 Ã— 12% = â‚¨18,000

**Expected Result:**
- âœ… The payslip shows correct EPF amounts

---

### Test 5.2.2: Verify ETF Calculation
**Steps:**
1. On the same payslip
2. Calculate: ETF = 150,000 Ã— 3% = â‚¨4,500

**Expected Result:**
- âœ… ETF amount matches the calculation

---

### Test 5.4.1: Export Bank File (CIPS)
**Steps:**
1. Go to Payroll
2. Look for "Bank File Export" or "Export" button
3. Select payslips to export (check boxes)
4. Choose "CIPS" format
5. Click Export/Download

**Expected Result:**
- âœ… CSV file downloads
- âœ… File contains bank payment data

---

### Test 5.5.1: Employee View Own Payslip
**Steps:**
1. Logout and login as Employee
2. Go to Payroll
3. Look for your payslips

**Expected Result:**
- âœ… Only your own payslips are visible
- âœ… Cannot see other employees' payslips

---

## 6. Dashboard Tests

### Test 6.1: Dashboard Statistics
**Steps:**
1. Login as Admin
2. You should land on the Dashboard
3. Look at the statistics cards

**Expected Result:**
- âœ… Total Employees: ~25
- âœ… Active Employees: ~25
- âœ… Pending Leaves: Shows count of pending requests

---

## 7. Security & Authorization Tests

### Test 7.1.1: Employee Cannot Access Admin Features
**Steps:**
1. Login as Employee (`john.doe@simpala.lk` / `Employee123!`)
2. Try to access the employee list by:
   - Clicking on "Employees" menu (if visible)
   - OR typing URL: https://simpalahr-frontend-dev-85939737092.us-central1.run.app/employees

**Expected Result:**
- âœ… Either menu item is not visible
- âœ… OR you are redirected/shown "Access Denied"
- âœ… You cannot see the full employee list

---

### Test 7.2.1: Company Isolation (Advanced)

> Goal: prove data from another company cannot be read, even if someone tampers with URLs.

**How to understand this test:**
- The backend always filters by `companyId` from your JWT. Frontend filtering alone is NOT trusted.
- A broken isolation would let you view or download another company's employees, attendance, or payslips.

**Steps (UI check):**
1. Login as Admin (`admin@simpala.lk`).
2. Go to **Employees**. Confirm the company name in the header (e.g., "Simpala Tech Pvt Ltd").
3. Open DevTools â†’ **Network** â†’ refresh the page.
4. Click the `/employees` request â†’ **Response** tab.
5. Verify every employee has the **same `companyId`** and matches your company.

**Steps (tamper check via URL):**
6. Copy any employee id you do **not** own (e.g., from seed notes if available) and try to open `/employees/99999` in the browser bar.
7. Expected: you get **404/Forbidden** (never see another company's employee data).
8. Do the same with `/api/v1/payroll/payslips/99999` in a new tab while logged in. Expected: **404**.

**Expected Result:**
- âœ… All listed records share your `companyId`.
- âœ… Direct deep-links to other-company IDs return 404/Forbidden; no data is shown or downloaded.
- âœ… Bank files and payslip PDFs only include your company data.

**Why this is important:**
- Cross-company leaks are a security incident. Isolation must hold even when users manipulate URLs or IDs.

---

### Test 7.3.1: API Without Token
**Steps:**
1. Open a new browser tab
2. Go to: https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1/employees
3. This calls the API directly without logging in

**Expected Result:**
- âœ… You see an error like: `{"message": "Unauthorized"}` or `{"message": "No token provided"}`
- âœ… No employee data is shown

---

## 8. Document Management Tests

### Test 8.1: Upload Document
**Steps:**
1. Login as Admin
2. Go to Employees
3. Click on an employee (e.g., John Doe)
4. Look for "Documents" tab or section
5. Click "Upload Document"
6. Select a PDF or image file (less than 5MB)
7. Click Upload

**Expected Result:**
- âœ… Document appears in the list
- âœ… Shows filename, size, upload date

---

### Test 8.2: Download Document
**Steps:**
1. After uploading, find the document in the list
2. Click "Download" button

**Expected Result:**
- âœ… File downloads to your computer
- âœ… File opens correctly

---

### Test 8.4: File Type Restriction
**Steps:**
1. Try to upload an .exe or .bat file

**Expected Result:**
- âœ… Error message: "File type not allowed" or similar
- âœ… File is rejected

---

## Common Issues & Solutions

### Issue: "Login failed" even with correct password
**Solution:**
- Make sure you're using the correct password:
  - Owner/Admin: `password123`
  - Employee: `Employee123!` (capital E, ends with !)
- Clear browser cache and try again

### Issue: "No attendance records found"
**Solution:**
- Attendance data has been seeded for November-December 2025
- Make sure you're looking at the correct date range
- Employee John Doe (ID 10) has attendance records

### Issue: "Cannot submit leave request"
**Solution:**
- Make sure you selected valid dates (future dates)
- End date must be after or equal to start date
- Check your leave balance isn't zero

### Issue: "Page not loading"
**Solution:**
- Check your internet connection
- Try refreshing the page (F5)
- Clear browser cache (Ctrl+Shift+Delete)
- Try a different browser (Chrome recommended)

---

## Test Result Recording

### How to Record Results

For each test:
1. **PASS** âœ… - Everything worked as expected
2. **FAIL** âŒ - Something didn't work correctly
3. **BLOCKED** ðŸš« - Cannot test due to another issue

### If a Test Fails:
1. Take a screenshot
2. Note the exact error message
3. Write down the steps you took
4. Record the browser and time
5. Report to the development team

### Test Result Template

```
Test ID: [e.g., 3.2.1]
Test Name: [e.g., Submit Leave Request]
Date: [Today's date]
Tester: [Your name]
Result: PASS / FAIL / BLOCKED

Browser: [Your browser]
Error Message: [If any]
Screenshot: [Attach if needed]
```

---

## Developer vs QA Verification Status

| What Developer Claims | QA Status |
|------------------------|-----------|
| **Leave Balance** - Statutory caps enforced (Annual 14, Casual 7, Medical 7) | â¬œ Pending Manual QA |
| **Anniversary Gating** - Medical leave blocked before 1st work anniversary | â¬œ Pending Manual QA |
| **Attendance Filter** - Reversed date range shows warning, allows clearing | â¬œ Pending Manual QA |
| **Weekend/Holiday** - Day type (weekday/weekend/holiday) shown in records | â¬œ Pending Manual QA |
| **Payroll** - EPF/ETF/PAYE calculations verified | â¬œ Pending Manual QA |
| **Payslip PDF** - PDF structure correct with all required fields | â¬œ Pending Manual QA |
| **Error Pages** - Friendly 404/500 pages with gradient styling | â¬œ Pending Manual QA |
| **Cross-Company** - All queries scoped by companyId | â¬œ Pending Manual QA |
| **Documents** - .exe file rejection, upload/download/delete working | â¬œ Pending Manual QA |
| **Auth** - Rate limiting (100 req/15 min), expired token handling | â¬œ Pending Manual QA |
| **Frontend Build** - All TypeScript errors fixed, components building | â¬œ Pending Manual QA |

---

## ðŸš¨ FINAL QA SIGN-OFF REQUIREMENTS

After completing ALL tests in this guide:

### 1. Complete the QA Checklist
- [ ] Open `QA_RETEST_CHECKLIST_2025-12-22.md`
- [ ] Fill in your name, date, and Pass/Fail for each module
- [ ] Ensure all 6 module categories are marked

### 2. Complete Manual Verification Checklist
- [ ] Check all 12 items in "Manual Verification Checklist" section
- [ ] Verify automated tests (151 backend tests)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Performance check (pages < 5 seconds)
- [ ] Security basics working

### 3. Get QA Team Sign-Off
- [ ] QA Lead reviews your results
- [ ] QA Manager approves checklist
- [ ] All signatures obtained

### 4. Final Decision
- **If ALL tests PASS:** Sign QA approval, development phase complete âœ…
- **If ANY tests FAIL:** Create bug reports, DO NOT sign off âŒ

### 5. Communication
- [ ] Email results to development team
- [ ] Email results to project manager
- [ ] Update project status: "QA Approved" or "QA Blocked"

---

## ðŸ“‹ Bug Reporting Template

If you find issues during testing, use this format:

**Bug ID:** QA-2025-12-23-[NUMBER]  
**Severity:** Critical / High / Medium / Low  
**Module:** Documents / Leave / Attendance / Payroll / Auth / Frontend  
**Test Case:** [Test number from this guide]  
**Description:** [What went wrong]  
**Steps to Reproduce:**  
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]  
**Actual Result:** [What actually happened]  
**Screenshot:** [Attach screenshot]  
**Browser:** [Chrome/Firefox/Safari]  
**Tested By:** [Your name]  
**Date:** [Date tested]

---

## ðŸ“ž Who to Contact

| Issue Type | Contact |
|------------|---------|
| Cannot access dev environment | DevOps Team |
| Test data issues | Development Team |
| Questions about expected behavior | Product Manager |
| Blocker preventing testing | QA Manager |
| Ready to sign off | QA Manager + Project Manager |

---

*Last Updated: December 23, 2025*  
*Version: 1.4 - Added QA verification requirements and sign-off process
## Recent Fixes (December 22, 2025)

The following issues from previous QA testing have been fixed and verified:

| Category | Fixes Applied | Verification |
|----------|---------------|---------------|
| **Leave Balance** | Statutory caps enforced (Annual 14, Casual 7, Medical 7) | 35 integration tests |
| **Anniversary Gating** | Medical leave blocked before 1st work anniversary | Integration tests |
| **Attendance Filter** | Reversed date range shows warning, allows clearing | Frontend deployed |
| **Weekend/Holiday** | Day type (weekday/weekend/holiday) shown in records | Backend + Frontend |
| **Payroll** | EPF/ETF/PAYE calculations verified | 21 integration tests |
| **Payslip PDF** | PDF structure correct with all required fields | Integration tests |
| **Error Pages** | Friendly 404/500 pages with gradient styling | Deployed & verified |
| **Cross-Company** | All queries scoped by companyId | 13 isolation tests |
| **Documents** | .exe file rejection, upload/download/delete working | Integration tests |
| **Auth** | Rate limiting (100 req/15 min), expired token handling | Integration tests |
| **Frontend Build** | All TypeScript errors fixed, components building | Build successful |

---

*Last Updated: December 22, 2025*

