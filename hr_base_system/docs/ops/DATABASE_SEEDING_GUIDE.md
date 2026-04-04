# Database Seeding Guide

## Overview
The Simpala HR production database needs initial seed data to function properly. This includes company information, leave types, and initial user accounts.

## Current Production Status
âœ… Backend deployed and running
âœ… Frontend deployed and accessible
âš ï¸ Database needs seeding (missing company and leave types)

## What Needs to Be Seeded

### Required Data:
1. **Company** - At least one company record
2. **Leave Types** - Annual, Sick, Casual, Maternity, Paternity
3. **Users** - Owner, Admin, HR accounts (already exist but need company association)

### Optional Data:
- Sample employees
- Sample attendance records  
- Sample leave requests
- Historical payslips

## Option 1: Run Dev Seed (Recommended)

The dev seed creates realistic test data including:
- 1 company (Simpala Tech Pvt Ltd)
- 3 admin users (owner, admin, hr)
- 20+ employees
- 3 leave types
- 3 months of attendance records
- Sample leave requests

### Steps:

1. **Connect to Cloud SQL**
   ```bash
   # Get the connection name
   gcloud sql instances describe simpalahr-db --format="value(connectionName)"
   # Result: simpala-hr:us-central1:simpalahr-db
   ```

2. **Run seed via Cloud Build**
   ```bash
   # From project root
   gcloud builds submit --config=cloudbuild-seed.yaml
   ```

3. **Or run locally via Cloud SQL Proxy**
   ```bash
   # Terminal 1: Start proxy
   cloud-sql-proxy simpala-hr:us-central1:simpalahr-db
   
   # Terminal 2: Run seed
   cd SimpalaHR/backend
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/simpala_hr" npm run seed
   ```

## Option 2: Manual SQL Insertion

If you prefer manual control, run these SQL commands:

### Create Company
```sql
INSERT INTO "Company" (name, address)
VALUES ('Simpala Tech Pvt Ltd', '123 Galle Road, Colombo 03, Sri Lanka')
RETURNING id;
-- Note the returned ID (e.g., 1)
```

### Update Existing Users with Company ID
```sql
-- Assuming company ID is 1
UPDATE "User" 
SET company_id = 1 
WHERE email IN ('owner@simpala.lk', 'admin@simpala.lk', 'hr@simpala.lk');
```

### Create Leave Types
```sql
-- Get company ID first
SELECT id FROM "Company" LIMIT 1;

-- Insert leave types (replace 1 with actual company ID)
INSERT INTO "LeaveType" (company_id, name, default_balance, requires_anniversary)
VALUES 
  (1, 'Annual Leave', 14, false),
  (1, 'Sick Leave', 7, false),
  (1, 'Casual Leave', 7, false),
  (1, 'Maternity Leave', 84, false),
  (1, 'Paternity Leave', 3, false);
```

### Create Leave Balances for Existing Employees
```sql
-- This ensures all employees have balance records for each leave type
INSERT INTO "EmployeeLeaveBalance" (employee_id, leave_type_id, accrued, used, "carriedForward", "lastAccruedAt")
SELECT 
  e.id as employee_id,
  lt.id as leave_type_id,
  lt.default_balance as accrued,
  0 as used,
  0 as "carriedForward",
  NULL as "lastAccruedAt"
FROM "Employee" e
CROSS JOIN "LeaveType" lt
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeLeaveBalance" elb 
  WHERE elb.employee_id = e.id AND elb.leave_type_id = lt.id
);
```

## Option 3: Use PowerShell Seed Script

The test data seed script can now work once leave types exist:

```powershell
# From D:\HR
.\seed-test-data.ps1
```

This will create:
- Leave types (if manual seed was done, these will be skipped)
- 8 additional employees
- 2 weeks of attendance records
- Sample leave requests

## Verification

After seeding, verify the data:

### Check Company
```powershell
$body = @{ email="owner@simpala.lk"; password="password123" } | ConvertTo-Json
$login = Invoke-RestMethod "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
$headers = @{ Authorization="Bearer $($login.accessToken)" }

# Check leave types
Invoke-RestMethod "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1/leave/types" -Headers $headers
```

### Run Full API Test
```powershell
.\test-apis.ps1
```

Expected results after seeding:
- âœ… Leave Types: 5
- âœ… Employees: 3-11 (depending on options)
- âœ… Attendance: 20+ records
- âœ… Frontend: Accessible with no warnings

## Troubleshooting

### Error: "Something went wrong" when creating leave types
**Cause**: No company record exists
**Solution**: Follow Option 2 to create company first

### Error: Foreign key constraint violation
**Cause**: Trying to reference non-existent company ID
**Solution**: Check company ID with `SELECT id FROM "Company"` and use that ID

### Leave balances not showing
**Cause**: EmployeeLeaveBalance records not created
**Solution**: Run the leave balance creation SQL from Option 2

## Production Deployment Checklist

- [ ] Company created
- [ ] User company associations updated
- [ ] Leave types created (5 types)
- [ ] Employee leave balances initialized
- [ ] Verify via `.\test-apis.ps1`
- [ ] Test frontend login and navigation
- [ ] Create first leave request to confirm workflow

## Next Steps After Seeding

1. **Test Frontend**
   - Login: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app
   - Credentials: owner@simpala.lk / password123
   - Navigate to Leave page - should show 5 leave types
   - Try creating a leave request

2. **Create Additional Test Data**
   ```powershell
   .\seed-test-data.ps1
   ```

3. **Run End-to-End Tests**
   ```powershell
   .\test-workflows.ps1
   ```

4. **Monitor Backend Logs**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=simpalahr-backend-dev" --limit 50 --format json
   ```

## Files Reference

- Dev seed: `SimpalaHR/backend/prisma/seeds/dev.seed.ts`
- Test seed: `SimpalaHR/backend/prisma/seeds/test.seed.ts`
- PowerShell seed: `seed-test-data.ps1`
- API tests: `test-apis.ps1`, `quick-test.ps1`, `test-workflows.ps1`

## Support

If you encounter issues:
1. Check backend logs in Cloud Run
2. Verify database connectivity
3. Confirm user exists and has correct role
4. Review error messages in API responses

---

*Last Updated: 2025-11-04*
*Status: Ready for production seeding*

