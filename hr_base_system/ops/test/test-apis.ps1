# Simpala HR API Testing Script
# Run this script to test all backend APIs and frontend

$ErrorActionPreference = "Continue"
$BACKEND_URL = "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1"
$FRONTEND_URL = "https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app"

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "  Simpala HR System - API Testing" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Test 1: Backend Health Check
Write-Host "`n[1] Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BACKEND_URL/health" -Method GET
    Write-Host "✅ Backend Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Database: $($health.database)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Login
Write-Host "`n[2] Testing Login (owner@simpala.lk)..." -ForegroundColor Yellow
try {
    $headers = @{ "Content-Type" = "application/json" }
    $body = @{ 
        email = "owner@simpala.lk"
        password = "password123" 
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "$BACKEND_URL/auth/login" -Method POST -Headers $headers -Body $body
    $token = $login.accessToken
    Write-Host "✅ Login Successful!" -ForegroundColor Green
    Write-Host "   User: $($login.user.email) (Role: $($login.user.role))" -ForegroundColor Gray
    Write-Host "   Token: $($token.Substring(0,30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Get Employees
Write-Host "`n[3] Testing Employees API..." -ForegroundColor Yellow
try {
    $authHeaders = @{ 
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $employees = Invoke-RestMethod -Uri "$BACKEND_URL/employees" -Method GET -Headers $authHeaders
    Write-Host "✅ Employees Retrieved: $($employees.Count) total" -ForegroundColor Green
    
    if ($employees.Count -gt 0) {
        Write-Host "`n   Sample Employees:" -ForegroundColor Gray
        $employees | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.first_name) $($_.last_name) ($($_.job_title))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Employees API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get Leave Types
Write-Host "`n[4] Testing Leave Types API..." -ForegroundColor Yellow
try {
    $leaveTypes = Invoke-RestMethod -Uri "$BACKEND_URL/leave/types" -Method GET -Headers $authHeaders
    $count = if ($leaveTypes) { $leaveTypes.Count } else { 0 }
    Write-Host "✅ Leave Types Retrieved: $count types" -ForegroundColor Green
    
    if ($leaveTypes -and $leaveTypes.Count -gt 0) {
        Write-Host "`n   Available Leave Types:" -ForegroundColor Gray
        $leaveTypes | ForEach-Object {
            Write-Host "   - $($_.name): $($_.days_allocated) days" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ℹ️  No leave types configured yet" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Leave Types API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get Leave Requests
Write-Host "`n[5] Testing Leave Requests API..." -ForegroundColor Yellow
try {
    $leaveRequests = Invoke-RestMethod -Uri "$BACKEND_URL/leave/requests" -Method GET -Headers $authHeaders
    $count = if ($leaveRequests) { $leaveRequests.Count } else { 0 }
    Write-Host "✅ Leave Requests Retrieved: $count requests" -ForegroundColor Green
    
    if ($leaveRequests -and $leaveRequests.Count -gt 0) {
        $pending = ($leaveRequests | Where-Object { $_.status -eq "PENDING" }).Count
        $approved = ($leaveRequests | Where-Object { $_.status -eq "APPROVED" }).Count
        Write-Host "   - Pending: $pending | Approved: $approved" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Leave Requests API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Get Attendance Records
Write-Host "`n[6] Testing Attendance API..." -ForegroundColor Yellow
try {
    $attendance = Invoke-RestMethod -Uri "$BACKEND_URL/attendance" -Method GET -Headers $authHeaders
    $count = if ($attendance) { $attendance.Count } else { 0 }
    Write-Host "✅ Attendance Records Retrieved: $count records" -ForegroundColor Green
} catch {
    Write-Host "❌ Attendance API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Get Payroll (Current Month)
Write-Host "`n[7] Testing Payroll API..." -ForegroundColor Yellow
try {
    $currentDate = Get-Date
    $year = $currentDate.Year
    $month = $currentDate.Month
    
    $payslips = Invoke-RestMethod -Uri "$BACKEND_URL/payroll/payslips?year=$year`&month=$month" -Method GET -Headers $authHeaders
    $count = if ($payslips) { $payslips.Count } else { 0 }
    Write-Host "✅ Payslips Retrieved: $count for $year-$month" -ForegroundColor Green
    
    if ($payslips -and $payslips.Count -gt 0) {
        $totalGross = ($payslips | Measure-Object -Property gross_pay -Sum).Sum
        $totalNet = ($payslips | Measure-Object -Property net_pay -Sum).Sum
        Write-Host "   Total Gross: LKR $totalGross | Total Net: LKR $totalNet" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Payroll API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Frontend Accessibility
Write-Host "`n[8] Testing Frontend Accessibility..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri $FRONTEND_URL -Method GET -TimeoutSec 10
    Write-Host "✅ Frontend Accessible!" -ForegroundColor Green
    Write-Host "   Status: $($frontend.StatusCode) $($frontend.StatusDescription)" -ForegroundColor Gray
    Write-Host "   Size: $($frontend.Content.Length) bytes" -ForegroundColor Gray
    
    # Check if it's a React app
    if ($frontend.Content -match 'root') {
        Write-Host "   ✓ React root element found" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Frontend not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Create a Test Employee (Optional)
Write-Host "`n[9] Testing Employee Creation..." -ForegroundColor Yellow
$createEmployee = Read-Host "Do you want to create a test employee? (y/N)"
if ($createEmployee -eq 'y') {
    try {
        $newEmployee = @{
            first_name = "Test"
            last_name = "Employee"
            email = "test.employee@simpala.lk"
            nic = "900123456V"
            job_title = "Tester"
            department = "QA"
            phone_number = "+94771234567"
            address = "123 Test St, Colombo"
            date_of_birth = "1990-01-01"
            hire_date = "2025-11-01"
            salary = 50000
            employment_status = "ACTIVE"
        } | ConvertTo-Json
        
        $created = Invoke-RestMethod -Uri "$BACKEND_URL/employees" -Method POST -Headers $authHeaders -Body $newEmployee
        Write-Host "✅ Test Employee Created!" -ForegroundColor Green
        Write-Host "   ID: $($created.id) - $($created.first_name) $($created.last_name)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Employee creation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "`n✓ Backend URL: $BACKEND_URL" -ForegroundColor Gray
Write-Host "✓ Frontend URL: $FRONTEND_URL" -ForegroundColor Gray
Write-Host "`n📝 Test Credentials:" -ForegroundColor Gray
Write-Host "   Email: owner@simpala.lk" -ForegroundColor Gray
Write-Host "   Password: password123" -ForegroundColor Gray
Write-Host "`nℹ️  For detailed testing, see: docs/DEVELOPER_TESTING_GUIDE.md`n" -ForegroundColor Yellow
