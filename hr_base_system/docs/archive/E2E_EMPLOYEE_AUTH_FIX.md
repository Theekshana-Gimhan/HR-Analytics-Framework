# E2E Testing - Employee Authorization Fix

## Date: 2025-01-13

## Problem Discovered

While testing the leave request form E2E tests against the deployed environment, we discovered a critical authorization bug that prevented employees from requesting leave:

### Issue 1: LeaveRequestForm Not Rendering for Owner Users
- Initial E2E tests used `owner@simpala.lk` credentials
- The LeaveRequestForm component was not rendering despite API calls succeeding
- Debug logging showed page headings but no "Request time off" card
- Hypothesis: Owner users may not have proper employee profiles for leave requests

### Issue 2: Employees Cannot Access Leave Types
- Created test employee: `john.doe@simpala.lk` (Role: EMPLOYEE)
- Employee login successful (ID: 4, Company: 1)
- **Critical Bug**: GET `/leave/types` returned **403 Forbidden** for EMPLOYEE role
- This endpoint was restricted to only ADMIN and OWNER roles
- **Result**: Employees couldn't see available leave types, preventing them from submitting leave requests

## Root Cause

File: `SimpalaHR/backend/src/routes/leave.routes.ts` (Line 31)

```typescript
// BEFORE (BUG):
router.get('/types', authorize(['ADMIN', 'OWNER']), leaveController.getAllLeaveTypes);

// AFTER (FIXED):
router.get('/types', authorize(['ADMIN', 'OWNER', 'EMPLOYEE']), leaveController.getAllLeaveTypes);
```

## Business Logic Error

The authorization logic was fundamentally flawed:
- Only admins and owners could view leave types
- Employees need to see available leave types to:
  - Know what leave they can request
  - Understand their leave balances
  - Submit leave requests with the correct leave type
- **This made the leave request feature completely unusable for employees**

## Fix Applied

### 1. Backend Authorization Update
- Added `'EMPLOYEE'` role to the authorization middleware for `/leave/types` endpoint
- Employees can now view leave types without admin privileges

### 2. E2E Test User Setup
- Created test employee account:
  - **Email**: john.doe@simpala.lk
  - **Password**: Employee123!
  - **Role**: EMPLOYEE
  - **Employee ID**: 4
  - **Company ID**: 1
- Updated E2E tests to use employee credentials instead of owner credentials

### 3. Test File Changes
File: `SimpalaHR/frontend/tests/e2e/leave-request-form-deployed.spec.ts`

```typescript
// BEFORE:
await page.getByLabel(/work email/i).fill('owner@simpala.lk');
await page.getByLabel(/password/i).fill('password123');

// AFTER:
await page.getByLabel(/work email/i).fill('john.doe@simpala.lk');
await page.getByLabel(/password/i).fill('Employee123!');
```

## Employee Test Data

### User Account
- **User ID**: 4
- **Email**: john.doe@simpala.lk
- **Password**: Employee123!
- **Role**: EMPLOYEE
- **Company ID**: 1

### Employee Profile
- **Employee ID**: 4
- **First Name**: John
- **Last Name**: Doe
- **NIC**: 199012345678
- **Job Title**: Software Engineer
- **Salary**: 150,000 LKR
- **Bank**: Bank of Ceylon - 0123456789
- **Phone**: +94771234567
- **Address**: 123 Main Street, Colombo 03
- **Employment Start**: 2024-01-01

### Leave Balances
Leave balances should be automatically created when leave types are configured. The system currently has these leave types:
1. Annual Leave (ID: 54)
2. Casual Leave (ID: 55)
3. Final Test Leave (ID: 49)
4. Prisma Test (ID: 50)
5. Authenticated Leave (ID: 51)
6. nikan leave (ID: 52)
7. hora leave (ID: 53)

## Deployment

### Commit
- **Commit**: 1b2fbd7
- **Message**: "fix: allow EMPLOYEE role to access leave types endpoint"
- **Branch**: dev

### Deployment Method
Used quick-deploy script for faster deployment:
```powershell
.\quick-deploy.ps1 -Service backend
```

## Testing Plan

### After Deployment
1. Wait for backend deployment to complete (5-7 minutes)
2. Run E2E tests with employee credentials:
   ```powershell
   cd SimpalaHR/frontend
   npx playwright test leave-request-form-deployed.spec.ts --reporter=list
   ```
3. Expected outcome: All 5 tests should pass
4. Verify:
   - âœ… Employee can login successfully
   - âœ… GET /leave/types returns 200 (not 403)
   - âœ… Leave types count: 7 types
   - âœ… "Request time off" heading visible
   - âœ… Leave request form renders
   - âœ… All form validations work

## Lessons Learned

### Authorization Design Principle
**"Features should be accessible to the users who need them, not just admins"**

1. **Read-Only Access**: Employees should always be able to VIEW leave types
   - This is reference data they need to do their job
   - Viewing doesn't modify anything, so it's low-risk

2. **Modify Access**: Only ADMIN/OWNER should CREATE/UPDATE/DELETE leave types
   - This is administrative configuration
   - Requires elevated privileges

3. **Apply to Other Endpoints**: Review other endpoints for similar issues
   - Employees should view their own data
   - Employees should submit requests (leave, attendance)
   - Only admins should modify company-wide settings

### E2E Test User Strategy
1. **Use appropriate user roles** for each test scenario
2. **Owner/Admin tests**: Testing administrative features
3. **Employee tests**: Testing day-to-day employee features
4. **Document test users** in repo for other developers

### API Error Handling in E2E Tests
The API logging we added was crucial:
```typescript
page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('/api/v1/')) {
    const endpoint = url.split('/api/v1')[1] || url;
    console.log(`[API] ${endpoint} - Status: ${response.status()}`);
    if (!response.ok()) {
      const text = await response.text();
      console.log(`[API] Error: ${text}`);
    }
  }
});
```

This immediately showed the 403 error, making the root cause obvious.

## Related Issues

### Potential Similar Bugs to Check
1. Can employees view their own attendance records?
2. Can employees view their payslips?
3. Can employees view company holidays?
4. Can employees update their own profile information?

### Authorization Audit Needed
Review all routes in:
- `leave.routes.ts` âœ… Fixed
- `attendance.routes.ts` - Check needed
- `payroll.routes.ts` - Check needed
- `employee.routes.ts` - Check needed

## Next Steps

1. âœ… Deploy backend fix
2. â³ Run E2E tests with employee user
3. â³ Verify all tests pass
4. â³ Audit other routes for similar authorization issues
5. â³ Add authorization tests to unit test suite
6. â³ Document employee test credentials in README

## References

- **Backend Route**: `SimpalaHR/backend/src/routes/leave.routes.ts`
- **E2E Test**: `SimpalaHR/frontend/tests/e2e/leave-request-form-deployed.spec.ts`
- **Auth Middleware**: `SimpalaHR/backend/src/middleware/auth.middleware.ts`
- **Employee Creation**: Via POST `/api/v1/employees` with owner credentials

