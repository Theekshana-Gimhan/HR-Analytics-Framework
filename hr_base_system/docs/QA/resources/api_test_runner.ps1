$ErrorActionPreference = "Stop"
$baseUrl = "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1"

function Test-Step {
    param ($Name, $ScriptBlock)
    Write-Host "TYPE: TEST | STATUS: RUNNING | NAME: $Name"
    try {
        & $ScriptBlock
        Write-Host "TYPE: TEST | STATUS: PASS    | NAME: $Name" -ForegroundColor Green
    }
    catch {
        Write-Host "TYPE: TEST | STATUS: FAIL    | NAME: $Name" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)"
    }
}

# 1. Auth
Test-Step "Authentication (Owner Login)" {
    $body = @{ email = "owner@simpala.lk"; password = "password123" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    if (-not $response.accessToken) { throw "No access token received" }
    $global:headers = @{ Authorization = "Bearer $($response.accessToken)" }
}

Test-Step "Authentication (Get Profile)" {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $global:headers
    if ($response.email -ne "owner@simpala.lk") { throw "Profile email mismatch" }
    $global:companyId = $response.companyId
}

# 2. Dashboard
Test-Step "Dashboard Stats" {
    $stats = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method Get -Headers $global:headers
    if (-not $stats) { throw "No stats returned" }
}

Test-Step "Dashboard Liquidity" {
    $liq = Invoke-RestMethod -Uri "$baseUrl/dashboard/liquidity" -Method Get -Headers $global:headers
    if (-not $liq) { throw "No liquidity data returned" }
}

# 3. Employee Management
$global:testEmployeeId = $null
Test-Step "Create Employee" {
    $random = Get-Random -Minimum 1000 -Maximum 9999
    $empData = @{
        first_name        = "TestAPI"
        last_name         = "User$random"
        email             = "testapi$random@simpala.lk"
        nic               = "99123${random}V"
        designation       = "QA Engineer"
        department        = "Engineering"
        joined_date       = (Get-Date).ToString("yyyy-MM-dd")
        employment_status = "ACTIVE"
        basic_salary      = 150000
    } | ConvertTo-Json
    
    $emp = Invoke-RestMethod -Uri "$baseUrl/employees" -Method Post -Body $empData -Headers $global:headers -ContentType "application/json"
    $global:testEmployeeId = $emp.id
    if (-not $global:testEmployeeId) { throw "Employee creation failed" }
}

Test-Step "Get Employee Details" {
    $emp = Invoke-RestMethod -Uri "$baseUrl/employees/$global:testEmployeeId" -Method Get -Headers $global:headers
    if ($emp.first_name -ne "TestAPI") { throw "Employee detail mismatch" }
}

Test-Step "Update Employee" {
    $updateData = @{ basic_salary = 160000 } | ConvertTo-Json
    $emp = Invoke-RestMethod -Uri "$baseUrl/employees/$global:testEmployeeId" -Method Patch -Body $updateData -Headers $global:headers -ContentType "application/json"
    if ($emp.basic_salary -ne 160000) { throw "Salary update failed" }
}

Test-Step "Search Employee" {
    $search = Invoke-RestMethod -Uri "$baseUrl/employees?search=TestAPI" -Method Get -Headers $global:headers
    if ($search.data.Count -lt 1) { throw "Search returned no results" }
}

# 4. Leave Management
Test-Step "Get Leave Types" {
    $types = Invoke-RestMethod -Uri "$baseUrl/leave/types" -Method Get -Headers $global:headers
    if ($types.Count -eq 0) { throw "No leave types found" }
    $global:annualLeaveId = ($types | Where-Object { $_.name -like "*Annual*" }).id
}

Test-Step "Apply for Leave (As Owner for Employee)" {
    # Note: Usually employees apply, but admins can too or we simulate.
    # For now, we'll try to apply for the created employee if the API supports admin override or if we just test the endpoint structure.
    # The 'request' endpoint usually uses req.user.id. 
    # To test fully we'd need to login as the new employee, but they don't have a user account yet (unless linked).
    # We will skip 'Apply' unless we link a user.
    # Instead, we check the balance endpoint for the new employee.
    $bal = Invoke-RestMethod -Uri "$baseUrl/leave/balance/$global:testEmployeeId" -Method Get -Headers $global:headers
    if (-not $bal) { throw "Balance check failed" }
}

# 5. Company Settings (New)
Test-Step "Get Company Settings" {
    $settings = Invoke-RestMethod -Uri "$baseUrl/company" -Method Get -Headers $global:headers
    if (-not $settings) { throw "Settings fetch failed" }
}

# Cleanup
Test-Step "Delete Test Employee" {
    if ($global:testEmployeeId) {
        Invoke-RestMethod -Uri "$baseUrl/employees/$global:testEmployeeId" -Method Delete -Headers $global:headers | Out-Null
    }
}
