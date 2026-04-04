#!/usr/bin/env pwsh
# Seed Test Data for Simpala HR
# Creates leave types, employees, attendance records, and leave requests

$BACKEND = "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1"
$ErrorActionPreference = "Continue"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  Simpala HR - Test Data Seeding" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Login
Write-Host "Logging in..." -NoNewline
$body = @{ email="owner@simpala.lk"; password="password123" } | ConvertTo-Json
$login = Invoke-RestMethod "$BACKEND/auth/login" -Method POST -Body $body -ContentType "application/json"
$headers = @{ 
    Authorization="Bearer $($login.accessToken)"
    "Content-Type"="application/json"
}
Write-Host " OK ($($login.user.email))`n" -ForegroundColor Green

# Get the actual company ID from the logged-in user
# Since we don't have a companies endpoint, we'll use companyId: 1 as default
# The backend will validate if it exists
$companyId = 1

# 1. Create Leave Types
Write-Host "[1] Creating Leave Types..." -ForegroundColor Yellow

$leaveTypes = @(
    @{
        name = "Annual Leave"
        default_balance = 14
        companyId = $companyId
        requires_anniversary = $false
    },
    @{
        name = "Sick Leave"
        default_balance = 7
        companyId = $companyId
        requires_anniversary = $false
    },
    @{
        name = "Casual Leave"
        default_balance = 7
        companyId = $companyId
        requires_anniversary = $false
    },
    @{
        name = "Maternity Leave"
        default_balance = 84
        companyId = $companyId
        requires_anniversary = $false
    },
    @{
        name = "Paternity Leave"
        default_balance = 3
        companyId = $companyId
        requires_anniversary = $false
    }
)

$createdLeaveTypes = @()
foreach ($leaveType in $leaveTypes) {
    try {
        $result = Invoke-RestMethod "$BACKEND/leave/types" -Method POST -Headers $headers -Body ($leaveType | ConvertTo-Json)
        Write-Host "   Created: $($leaveType.name) ($($leaveType.default_balance) days)" -ForegroundColor Gray
        $createdLeaveTypes += $result
    } catch {
        Write-Host "   Skipped: $($leaveType.name) (may exist)" -ForegroundColor DarkGray
    }
}

# Get all leave types
$allLeaveTypes = Invoke-RestMethod "$BACKEND/leave/types" -Headers $headers
Write-Host "   Total leave types: $($allLeaveTypes.Count)" -ForegroundColor Green

# 2. Create Employees
Write-Host "`n[2] Creating Employees..." -ForegroundColor Yellow

$employees = @(
    @{
        first_name = "Sarah"
        last_name = "Johnson"
        email = "sarah.johnson@simpala.lk"
        nic = "199012345678"
        job_title = "Senior Software Engineer"
        department = "Engineering"
        phone_number = "+94771234567"
        address = "123 Main Street, Colombo 03"
        date_of_birth = "1990-05-15"
        hire_date = "2023-01-15"
        salary = 180000
        employment_status = "ACTIVE"
        bank_name = "Commercial Bank"
        bank_account_number = "1001234567"
        bank_branch = "Colombo Fort"
    },
    @{
        first_name = "Michael"
        last_name = "Chen"
        email = "michael.chen@simpala.lk"
        nic = "199156789012"
        job_title = "Product Manager"
        department = "Product"
        phone_number = "+94772345678"
        address = "456 Park Avenue, Colombo 05"
        date_of_birth = "1991-08-22"
        hire_date = "2023-03-01"
        salary = 200000
        employment_status = "ACTIVE"
        bank_name = "Sampath Bank"
        bank_account_number = "2002345678"
        bank_branch = "Bambalapitiya"
    },
    @{
        first_name = "Priya"
        last_name = "Sharma"
        email = "priya.sharma@simpala.lk"
        nic = "199234567890"
        job_title = "UX Designer"
        department = "Design"
        phone_number = "+94773456789"
        address = "789 Lake Road, Colombo 07"
        date_of_birth = "1992-03-10"
        hire_date = "2023-06-01"
        salary = 150000
        employment_status = "ACTIVE"
        bank_name = "HNB"
        bank_account_number = "3003456789"
        bank_branch = "Kollupitiya"
    },
    @{
        first_name = "David"
        last_name = "Wilson"
        email = "david.wilson@simpala.lk"
        nic = "198890123456"
        job_title = "DevOps Engineer"
        department = "Engineering"
        phone_number = "+94774567890"
        address = "321 Hill Street, Colombo 04"
        date_of_birth = "1988-11-30"
        hire_date = "2022-09-01"
        salary = 190000
        employment_status = "ACTIVE"
        bank_name = "Commercial Bank"
        bank_account_number = "4004567890"
        bank_branch = "Wellawatte"
    },
    @{
        first_name = "Aisha"
        last_name = "Rahman"
        email = "aisha.rahman@simpala.lk"
        nic = "199445678901"
        job_title = "QA Engineer"
        department = "Engineering"
        phone_number = "+94775678901"
        address = "654 Beach Road, Colombo 06"
        date_of_birth = "1994-07-18"
        hire_date = "2024-01-15"
        salary = 130000
        employment_status = "ACTIVE"
        bank_name = "Sampath Bank"
        bank_account_number = "5005678901"
        bank_branch = "Mount Lavinia"
    },
    @{
        first_name = "James"
        last_name = "Taylor"
        email = "james.taylor@simpala.lk"
        nic = "198723456789"
        job_title = "Sales Manager"
        department = "Sales"
        phone_number = "+94776789012"
        address = "987 Green Lane, Colombo 08"
        date_of_birth = "1987-02-14"
        hire_date = "2022-05-01"
        salary = 170000
        employment_status = "ACTIVE"
        bank_name = "HNB"
        bank_account_number = "6006789012"
        bank_branch = "Nugegoda"
    },
    @{
        first_name = "Nina"
        last_name = "Patel"
        email = "nina.patel@simpala.lk"
        nic = "199567890123"
        job_title = "Marketing Specialist"
        department = "Marketing"
        phone_number = "+94777890123"
        address = "147 Flower Road, Colombo 02"
        date_of_birth = "1995-09-25"
        hire_date = "2024-03-01"
        salary = 120000
        employment_status = "ACTIVE"
        bank_name = "Commercial Bank"
        bank_account_number = "7007890123"
        bank_branch = "Pettah"
    },
    @{
        first_name = "Robert"
        last_name = "Lee"
        email = "robert.lee@simpala.lk"
        nic = "198656789012"
        job_title = "Finance Manager"
        department = "Finance"
        phone_number = "+94778901234"
        address = "258 Palm Grove, Colombo 03"
        date_of_birth = "1986-12-05"
        hire_date = "2021-11-01"
        salary = 210000
        employment_status = "ACTIVE"
        bank_name = "Sampath Bank"
        bank_account_number = "8008901234"
        bank_branch = "Maradana"
    }
)

$createdEmployees = @()
foreach ($emp in $employees) {
    try {
        $result = Invoke-RestMethod "$BACKEND/employees" -Method POST -Headers $headers -Body ($emp | ConvertTo-Json)
        Write-Host "   Created: $($emp.first_name) $($emp.last_name) - $($emp.job_title)" -ForegroundColor Gray
        $createdEmployees += $result
    } catch {
        Write-Host "   Skipped: $($emp.first_name) $($emp.last_name) (may exist)" -ForegroundColor DarkGray
    }
}

# Get all employees
$allEmployees = Invoke-RestMethod "$BACKEND/employees" -Headers $headers
Write-Host "   Total employees: $($allEmployees.Count)" -ForegroundColor Green

# 3. Create Attendance Records (last 10 working days)
Write-Host "`n[3] Creating Attendance Records..." -ForegroundColor Yellow

$attendanceCount = 0
$daysBack = 14
$today = Get-Date

for ($i = 1; $i -le $daysBack; $i++) {
    $date = $today.AddDays(-$i)
    
    # Skip weekends
    if ($date.DayOfWeek -eq [DayOfWeek]::Saturday -or $date.DayOfWeek -eq [DayOfWeek]::Sunday) {
        continue
    }
    
    $dateStr = $date.ToString("yyyy-MM-dd")
    
    # Create attendance for each employee
    foreach ($emp in $allEmployees) {
        # Random attendance pattern (90% present, 5% leave, 5% absent)
        $random = Get-Random -Minimum 1 -Maximum 100
        
        if ($random -le 90) {
            # Present
            $checkIn = "09:00:00"
            $checkOut = "17:30:00"
            $status = "PRESENT"
        } elseif ($random -le 95) {
            # On leave
            $checkIn = $null
            $checkOut = $null
            $status = "LEAVE"
        } else {
            # Absent
            $checkIn = $null
            $checkOut = $null
            $status = "ABSENT"
        }
        
        try {
            $attendance = @{
                employeeId = $emp.id
                date = $dateStr
                status = $status
            }
            
            if ($checkIn) {
                $attendance.check_in = $checkIn
                $attendance.check_out = $checkOut
            }
            
            $result = Invoke-RestMethod "$BACKEND/attendance" -Method POST -Headers $headers -Body ($attendance | ConvertTo-Json)
            $attendanceCount++
        } catch {
            # Silently skip duplicates
        }
    }
}

Write-Host "   Created $attendanceCount attendance records" -ForegroundColor Green

# 4. Create Leave Requests
Write-Host "`n[4] Creating Leave Requests..." -ForegroundColor Yellow

if ($allLeaveTypes.Count -gt 0) {
    $leaveRequestCount = 0
    
    # Create some leave requests with different statuses
    $leaveRequests = @(
        @{
            employeeId = $allEmployees[0].id
            leaveTypeId = $allLeaveTypes[0].id
            start_date = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
            end_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
            reason = "Family vacation"
            status = "PENDING"
        },
        @{
            employeeId = $allEmployees[1].id
            leaveTypeId = $allLeaveTypes[1].id
            start_date = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
            end_date = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
            reason = "Medical appointment"
            status = "APPROVED"
        },
        @{
            employeeId = $allEmployees[2].id
            leaveTypeId = $allLeaveTypes[2].id
            start_date = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
            end_date = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
            reason = "Personal matters"
            status = "PENDING"
        },
        @{
            employeeId = $allEmployees[3].id
            leaveTypeId = $allLeaveTypes[0].id
            start_date = (Get-Date).AddDays(-5).ToString("yyyy-MM-dd")
            end_date = (Get-Date).AddDays(-3).ToString("yyyy-MM-dd")
            reason = "Short trip"
            status = "APPROVED"
        },
        @{
            employeeId = $allEmployees[4].id
            leaveTypeId = $allLeaveTypes[1].id
            start_date = (Get-Date).AddDays(15).ToString("yyyy-MM-dd")
            end_date = (Get-Date).AddDays(16).ToString("yyyy-MM-dd")
            reason = "Health checkup"
            status = "PENDING"
        }
    )
    
    foreach ($leave in $leaveRequests) {
        try {
            # Create leave request
            $status = $leave.status
            $leave.Remove("status")
            
            $result = Invoke-RestMethod "$BACKEND/leave/requests" -Method POST -Headers $headers -Body ($leave | ConvertTo-Json)
            
            # Update status if not PENDING
            if ($status -ne "PENDING") {
                $statusUpdate = @{ status = $status } | ConvertTo-Json
                Invoke-RestMethod "$BACKEND/leave/$($result.id)/status" -Method PATCH -Headers $headers -Body $statusUpdate | Out-Null
            }
            
            Write-Host "   Created: Leave request for Employee $($leave.employeeId) - $status" -ForegroundColor Gray
            $leaveRequestCount++
        } catch {
            Write-Host "   Skipped: Leave request (may exist)" -ForegroundColor DarkGray
        }
    }
    
    Write-Host "   Total leave requests: $leaveRequestCount" -ForegroundColor Green
} else {
    Write-Host "   Skipped: No leave types available" -ForegroundColor Yellow
}

# Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  Test Data Seeding Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "`nSummary:" -ForegroundColor Yellow
Write-Host "   Leave Types: $($allLeaveTypes.Count)" -ForegroundColor Gray
Write-Host "   Employees: $($allEmployees.Count)" -ForegroundColor Gray
Write-Host "   Attendance Records: $attendanceCount" -ForegroundColor Gray
if ($allLeaveTypes.Count -gt 0) {
    Write-Host "   Leave Requests: $leaveRequestCount" -ForegroundColor Gray
}

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "   1. Run: .\test-apis.ps1 (verify data created)" -ForegroundColor Gray
Write-Host "   2. Login to frontend: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app" -ForegroundColor Gray
Write-Host "   3. Test workflows with new data`n" -ForegroundColor Gray
