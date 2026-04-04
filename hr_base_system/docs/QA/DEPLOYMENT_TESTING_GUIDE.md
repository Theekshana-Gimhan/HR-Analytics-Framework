# Deployment & Testing Guide - Manual Testing Fixes

**Date**: February 28, 2026  
**Status**: Code committed and pushed to GitHub  
**Commit**: `fix: resolve manual testing failures and add comprehensive test APIs`

---

## 📋 Quick Summary

We've created comprehensive test APIs to validate all 10 manual testing fixes in a deployed environment. The changes have been committed and pushed to the `dev` branch, which will trigger your GitHub Actions CI/CD pipeline.

### What We Fixed:
1. ✅ Bank file export encoding (CRLF + UTF-8)
2. ✅ Frontend environment variable validation
3. ✅ Created 8 test endpoints (all other issues verified as working)

---

## 🚀 Deployment Steps

### Step 1: Monitor GitHub Actions CI/CD Pipeline

1. Go to your GitHub repository: https://github.com/Mad-marketing-git/HR
2. Click on **Actions** tab
3. Look for the latest workflow run triggered by the `dev` branch push
4. Wait for all checks to pass (indicated by ✅ green checkmarks):
   - **Linting** - Code style checks
   - **Type Checking** - TypeScript compilation
   - **Tests** - Unit and integration tests
   - **Build** - Application builds
   - **Deploy** - Cloud deployment (Cloud Run)

### Step 2: Monitor Deployment Progress

Once the workflow passes:

- **Backend Dev URL** (given in deployment logs):
  ```
  https://simpalahr-backend-dev-[hash]-[region].a.run.app
  ```

- **Frontend Dev URL** (given in deployment logs):
  ```
  https://simpalahr-frontend-dev-[hash]-[region].a.run.app
  ```

**To find your URLs:**
1. Go to GitHub Actions → Latest workflow run
2. Scroll to the `deploy` job output
3. Look for Cloud Run URLs in the logs

---

## 🧪 Testing Your Fixes

### Step 1: Get Authentication Token

First, authenticate to get an access token:

**Using cURL:**
```bash
curl -X POST https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simpala.com",
    "password": "your_admin_password"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": 1,
    "email": "admin@simpala.com",
    "role": "OWNER",
    "companyId": 1
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "..."
}
```

Save the `accessToken` for use in test requests.

### Step 2: Run Test Suite

#### Option A: Using PowerShell (Windows)
```powershell
# Navigate to project root
cd D:\dev\HR

# Run with your token
.\test-apis.ps1 -BaseUrl "https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1" `
  -Token "your-access-token-here" `
  -CompanyId 1 `
  -EmployeeId 1
```

#### Option B: Using Bash (Linux/Mac)
```bash
cd ~/path/to/HR

chmod +x test-apis.sh

./test-apis.sh \
  "https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1" \
  "your-access-token-here" \
  "1" \
  "1"
```

#### Option C: Manual API Calls with cURL

**Test 1: Health Check**
```bash
curl -X GET https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/health
```

**Test 2: Employee Creation Validation**
```bash
curl -X POST https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/employee-creation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"scenario":"valid"}'
```

**Test 3: Leave Application Error Handling**
```bash
curl -X POST https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/leave-application \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"scenario":"valid"}'
```

**Test 4: Payroll EPF Calculation**
```bash
curl -X POST https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/payroll-calculation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"employeeId":1}'
```

**Test 5: Attendance Import Validation**
```bash
curl -X POST https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/attendance-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"scenario":"valid"}'
```

**Test 6: Bank File Export (CRLF + UTF-8)**
```bash
curl -X POST https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/bank-file-export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"month":2,"year":2026,"fileType":"SLIPS"}'
```

**Test 7: Leave Anniversary Accrual**
```bash
curl -X POST https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/leave-accrual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"employeeId":1}'
```

**Test 8: Multi-Tenancy Isolation**
```bash
curl -X GET https://simpalahr-backend-dev-[hash]-[region].a.run.app/api/v1/test/multi-tenancy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Expected Test Results

### Test 1: Employee Creation
```json
{
  "test": "Employee Creation Validation",
  "results": {
    "valid": {
      "success": true,
      "employeeId": 123
    }
  }
}
```
**Pass Criteria**: `success: true`

### Test 2: Leave Application
```json
{
  "test": "Leave Application Error Handling",
  "results": {
    "valid": {
      "success": true,
      "leaveRequestId": 456
    },
    "past-date": {
      "success": true,
      "validationCaught": true
    }
  }
}
```
**Pass Criteria**: Validation errors caught, user-friendly messages

### Test 3: Payroll Calculation
```json
{
  "results": {
    "epfEmployee": {
      "rate": "8.00%",
      "correct": true
    },
    "epfEmployer": {
      "rate": "12.00%",
      "correct": true
    },
    "etf": {
      "rate": "3.00%",
      "correct": true
    },
    "allCorrect": true
  }
}
```
**Pass Criteria**: `allCorrect: true`

### Test 4: Attendance Import
```json
{
  "results": {
    "valid": {
      "success": true,
      "imported": 2,
      "skipped": 0
    }
  }
}
```
**Pass Criteria**: `success: true`, no errors on valid CSV

### Test 5: Bank File Export
```json
{
  "results": {
    "lineEndings": {
      "hasCRLF": true,
      "correct": true
    },
    "encoding": "UTF-8"
  }
}
```
**Pass Criteria**: `hasCRLF: true`, `correct: true`

### Test 6: Leave Accrual
```json
{
  "results": {
    "shouldAccrue": true,
    "accrualCorrect": true,
    "completedYears": 2
  }
}
```
**Pass Criteria**: `accrualCorrect: true` for employees with >1 year service

### Test 7: Multi-Tenancy
```json
{
  "results": {
    "isolationTest": {
      "allEmployeesInCompany": true,
      "isolationCorrect": true
    }
  }
}
```
**Pass Criteria**: `isolationCorrect: true`

---

## 🔍 Troubleshooting

### Issue: Test endpoints return 403 Forbidden
**Cause**: Test endpoints only enabled in `dev` and `staging` environments  
**Solution**: Ensure deployment is to dev/staging, not production

### Issue: "No payslips found" error in bank file test
**Cause**: Need to generate payslips first  
**Solution**: 
1. Generate payslips using `/test/payroll-calculation`
2. Then run `/test/bank-file-export`

### Issue: Leave application test fails with "Employee not found"
**Cause**: Test user not linked to employee record  
**Solution**: Create an employee record for the test user first via `/api/v1/employees`

### Issue: GitHub Actions workflow failed
**Cause**: Check workflow logs for error details  
**Solution**: 
1. Go to GitHub Actions → Failed workflow
2. Click on failed job to see logs
3. Common issues:
   - Missing environment variables
   - TypeScript compilation errors
   - Database migration issues

---

## 📊 CI/CD Pipeline Details

Your repository uses GitHub Actions with these key jobs:

| Job | Purpose | Expected Duration |
|-----|---------|------------------|
| **Lint** | Check code style (ESLint) | 30-60s |
| **TypeScript** | Type checking | 1-2m |
| **Tests** | Run unit & integration tests | 2-5m |
| **Build** | Build Docker images | 3-5m |
| **Deploy** | Deploy to Cloud Run | 2-3m |

**Total Pipeline Time**: ~10-20 minutes

To view in detail:
1. GitHub repo → Actions
2. Click latest workflow
3. Expand "deploy" job to see Cloud Run URLs

---

## 🎯 Next Steps

1. ✅ Push to dev branch (already done)
2. ⏳ Wait for GitHub Actions to complete (10-20 min)
3. 🧪 Run test APIs using provided scripts
4. ✓ Verify all tests pass
5. 📋 Document results in test report
6. 🚀 Merge to main and deploy to production (when ready)

---

## 📝 Documentation References

- **Test Analysis**: [docs/QA/TESTING_FAILURES_ANALYSIS_AND_FIXES.md](../docs/QA/TESTING_FAILURES_ANALYSIS_AND_FIXES.md)
- **Original Test Failures**: [docs/QA/manual-testing-failures-2026-02-28.md](../docs/QA/manual-testing-failures-2026-02-28.md)
- **API Routes**: [backend/src/routes/test.routes.ts](../backend/src/routes/test.routes.ts)
- **Test Scripts**: 
  - [test-apis.ps1](../test-apis.ps1) - PowerShell version
  - [test-apis.sh](../test-apis.sh) - Bash version

---

**Questions?** Check the relevant documentation or review the test routes code for detailed validation logic.
