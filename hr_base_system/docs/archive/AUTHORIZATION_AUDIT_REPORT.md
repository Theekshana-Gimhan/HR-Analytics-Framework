# Authorization Audit Report

**Date**: December 2024  
**Scope**: Employee, Attendance, Payroll, and Leave routes  
**Objective**: Ensure EMPLOYEE role has proper read-only access to their own data

## Summary

The authorization audit reveals a **well-structured middleware-based system** with mostly appropriate role restrictions. However, there are **critical gaps** preventing employees from viewing their own basic data (profile, attendance).

### Overall Authorization Pattern

- **Authentication**: All routes use `router.use(authenticate)` at the router level
- **Authorization**: Route-specific `authorize(['ROLE1', 'ROLE2'])` middleware OR controller-level logic
- **Roles**: OWNER, ADMIN, EMPLOYEE

---

## Detailed Findings by Route

### 1. Employee Routes (`employee.routes.ts`)

| Endpoint | Method | Authorization | Status | Notes |
|----------|--------|---------------|--------|-------|
| `/` | GET | ADMIN, OWNER | âœ… Correct | List all employees - admin function |
| `/` | POST | ADMIN, OWNER | âœ… Correct | Create employee - admin function |
| `/:id` | GET | ADMIN, OWNER | âš ï¸ **GAP** | **Employees can't view their own profile** |
| `/:id` | PUT | ADMIN, OWNER | âœ… Correct | Update employee - admin function |
| `/:id` | DELETE | ADMIN, OWNER | âœ… Correct | Delete employee - admin function |
| `/:id/leave-balance` | GET | ADMIN, OWNER, EMPLOYEE | âœ… Correct | Employees can view their leave balance |
| `/:id/documents` | GET | ADMIN, OWNER, EMPLOYEE | âœ… Correct | Employees can list their documents |
| `/:id/documents` | POST | ADMIN, OWNER, EMPLOYEE | âœ… Correct | Employees can upload documents |
| `/:id/documents/:documentId` | GET | ADMIN, OWNER, EMPLOYEE | âœ… Correct | Employees can download documents |
| `/:id/documents/:documentId` | DELETE | ADMIN, OWNER | âœ… Correct | Only admins can delete documents |

**Critical Issue**: `GET /employees/:id` should allow EMPLOYEE role to view their own profile data (name, email, department, etc.). Currently, employees must rely on subdomain APIs like `/leave-balance` and `/documents` but can't access basic profile information.

**Recommendation**:
```typescript
router.get(
  '/:id',
  authorize(['ADMIN', 'OWNER', 'EMPLOYEE']), // Add EMPLOYEE
  employeeController.getEmployee
);
```

Then in the controller, add logic:
```typescript
// If employee role, ensure they can only access their own data
if (req.user.role === 'EMPLOYEE') {
  const employee = await employeeService.getEmployeeByUserId(req.user.id);
  if (!employee || employee.id !== parseInt(req.params.id)) {
    return res.status(403).json({ message: 'Forbidden: Can only view own profile' });
  }
}
```

---

### 2. Attendance Routes (`attendance.routes.ts`)

| Endpoint | Method | Authorization | Status | Notes |
|----------|--------|---------------|--------|-------|
| `/` | POST | ADMIN, OWNER | âœ… Correct | Create attendance record - admin function |
| `/bulk` | POST | ADMIN, OWNER | âœ… Correct | Bulk upload - admin function |

**Critical Issue**: **No GET endpoints exist** for employees to view their own attendance records. This is a significant gap for self-service HR.

**Recommendation**: Add a new endpoint:
```typescript
/**
 * GET /api/v1/attendance/me
 * Get attendance records for the authenticated employee
 * Query params: startDate, endDate, month, year
 */
router.get(
  '/me',
  authorize(['EMPLOYEE', 'ADMIN', 'OWNER']),
  attendanceController.getMyAttendance
);
```

Controller logic:
```typescript
export const getMyAttendance = async (req: CustomRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  
  const employee = await attendanceService.getEmployeeByUserId(req.user.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });
  
  // Parse query filters (startDate, endDate, month, year)
  const attendanceRecords = await attendanceService.getAttendance({
    employeeId: employee.id,
    ...filters
  });
  
  return res.status(200).json(attendanceRecords);
};
```

---

### 3. Payroll Routes (`payroll.routes.ts`)

| Endpoint | Method | Authorization | Status | Notes |
|----------|--------|---------------|--------|-------|
| `/payslips` | GET | **Controller-level** | âœ… Correct | EMPLOYEE sees own payslips, ADMIN/OWNER see all |
| `/generate` | POST | ADMIN, OWNER | âœ… Correct | Generate payslip - admin function |
| `/bank-file` | POST | ADMIN, OWNER | âœ… Correct | Generate bank file - admin function |
| `/payslips/:id/pdf` | GET | ADMIN, OWNER | âš ï¸ **RISK** | **Employees can't download their own payslip PDFs** |

**Issue 1**: `GET /payslips` has no middleware-level authorization but implements **controller-level authorization correctly**:
- EMPLOYEE role: Automatically filtered to show only their own payslips (lines 37-42 in `payroll.controller.ts`)
- ADMIN/OWNER: Can query all payslips with optional filters

**Status**: âœ… Correct implementation, but consider adding `authorize(['ADMIN', 'OWNER', 'EMPLOYEE'])` middleware for clarity and documentation consistency.

**Issue 2**: `GET /payslips/:id/pdf` restricts EMPLOYEE access - they cannot download PDFs of their own payslips.

**Recommendation**:
```typescript
router.get(
  '/payslips/:id/pdf',
  authorize(['ADMIN', 'OWNER', 'EMPLOYEE']), // Add EMPLOYEE
  payrollController.downloadPayslipPdf
);
```

Controller logic:
```typescript
// If employee role, verify they own this payslip
if (req.user.role === 'EMPLOYEE') {
  const employee = await payrollService.getEmployeeByUserId(req.user.id);
  const payslip = await payrollService.getPayslipById(payslipId);
  
  if (!payslip || payslip.employeeId !== employee.id) {
    return res.status(403).json({ message: 'Forbidden: Can only download own payslips' });
  }
}
```

---

### 4. Leave Routes (`leave.routes.ts`)

| Endpoint | Method | Authorization | Verified | Notes |
|----------|--------|---------------|----------|-------|
| `/types` | GET | ADMIN, OWNER, EMPLOYEE | âœ… | Employees can view leave types |
| `/types` | POST | ADMIN, OWNER | âœ… | Create leave type - admin function |
| `/types/:id` | PUT | ADMIN, OWNER | âœ… | Update leave type - admin function |
| `/types/:id` | DELETE | ADMIN, OWNER | âœ… | Delete leave type - admin function |
| `/requests` | GET | Controller-level | âœ… | EMPLOYEE sees own requests, ADMIN/OWNER see all |
| `/requests` | POST | EMPLOYEE, ADMIN, OWNER | âœ… | Employees can submit leave requests |
| `/requests/:id` | GET | Controller-level | âœ… | EMPLOYEE can view own requests |
| `/requests/:id` | PUT | ADMIN, OWNER | âœ… | Update request - admin function |
| `/requests/:id/approve` | POST | ADMIN, OWNER | âœ… | Approve request - admin function |
| `/requests/:id/reject` | POST | ADMIN, OWNER | âœ… | Reject request - admin function |

**Status**: âœ… **All leave routes have proper authorization**. This module serves as a good reference implementation for employee self-service features with controller-level role filtering.

---

## Priority Recommendations

### ðŸš¨ High Priority (Critical for Employee Self-Service)

1. **Add `GET /employees/:id` for EMPLOYEE role**
   - Impact: Employees can't access their own basic profile information
   - Effort: Low (2-3 hours)
   - Files: `employee.routes.ts`, `employee.controller.ts`

2. **Add `GET /attendance/me` endpoint**
   - Impact: No way for employees to view their attendance history
   - Effort: Medium (4-6 hours including service layer and tests)
   - Files: `attendance.routes.ts`, `attendance.controller.ts`, `attendance.service.ts`

3. **Add `GET /payslips/:id/pdf` for EMPLOYEE role**
   - Impact: Employees can't download their own payslip PDFs (can only view JSON via `/payslips`)
   - Effort: Low (1-2 hours)
   - Files: `payroll.routes.ts`, `payroll.controller.ts`

### âš ï¸ Medium Priority (Best Practices)

4. **Add explicit authorization to `GET /payslips`**
   - Impact: Improves code clarity and documentation
   - Effort: Low (30 minutes)
   - Files: `payroll.routes.ts`
   - Change: Add `authorize(['ADMIN', 'OWNER', 'EMPLOYEE'])` middleware

---

## Testing Requirements

After implementing the above recommendations, add these tests:

### Backend (Jest) Tests

1. **Employee Profile Access**
   ```typescript
   describe('GET /employees/:id', () => {
     it('should allow EMPLOYEE to view their own profile', async () => {
       const res = await request(app)
         .get(`/api/v1/employees/${employeeId}`)
         .set('Authorization', `Bearer ${employeeToken}`)
         .expect(200);
       
       expect(res.body.id).toBe(employeeId);
     });
     
     it('should forbid EMPLOYEE from viewing other profiles', async () => {
       await request(app)
         .get(`/api/v1/employees/${otherEmployeeId}`)
         .set('Authorization', `Bearer ${employeeToken}`)
         .expect(403);
     });
   });
   ```

2. **Attendance Self-Service**
   ```typescript
   describe('GET /attendance/me', () => {
     it('should return attendance records for authenticated employee', async () => {
       const res = await request(app)
         .get('/api/v1/attendance/me?month=11&year=2024')
         .set('Authorization', `Bearer ${employeeToken}`)
         .expect(200);
       
       expect(Array.isArray(res.body)).toBe(true);
       expect(res.body.every(record => record.employeeId === employeeId)).toBe(true);
     });
   });
   ```

3. **Payslip PDF Download**
   ```typescript
   describe('GET /payslips/:id/pdf', () => {
     it('should allow EMPLOYEE to download their own payslip PDF', async () => {
       const res = await request(app)
         .get(`/api/v1/payroll/payslips/${payslipId}/pdf`)
         .set('Authorization', `Bearer ${employeeToken}`)
         .expect(200);
       
       expect(res.headers['content-type']).toBe('application/pdf');
     });
     
     it('should forbid EMPLOYEE from downloading other payslips', async () => {
       await request(app)
         .get(`/api/v1/payroll/payslips/${otherPayslipId}/pdf`)
         .set('Authorization', `Bearer ${employeeToken}`)
         .expect(403);
     });
   });
   ```

### E2E (Playwright) Tests

Add to `tests/e2e/employee-self-service.spec.ts`:

1. **Profile Viewing**: Navigate to "My Profile" page, verify employee data displayed
2. **Attendance History**: Navigate to "My Attendance" page, verify records from last month
3. **Payslip Download**: Navigate to "Payslips" page, click "Download PDF", verify file downloads

---

## Conclusion

The authorization system is **well-architected** with clear separation between admin and employee roles. However, **three critical gaps prevent full employee self-service**:

1. Employees can't view their own profile
2. Employees can't view their attendance history
3. Employees can't download their payslip PDFs

**Estimated Total Effort**: 8-12 hours for implementation + 4-6 hours for testing

**Impact**: Enables complete self-service portal for employees, reducing HR admin workload and improving employee experience.

---

## Next Steps

1. âœ… **Authorization audit completed** (this document)
2. ðŸ”„ **Implement high-priority recommendations** (items 1-3 above)
3. ðŸ”„ **Add role-based backend tests** (Jest tests for all authorization rules)
4. ðŸ”„ **Add E2E tests for employee self-service** (Playwright tests)
5. ðŸ”„ **Document E2E setup** (create E2E_TESTING_GUIDE.md)
6. ðŸ”„ **CI partial E2E integration** (add smoke tests to workflow)

