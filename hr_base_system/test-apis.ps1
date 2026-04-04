# Simpala HR - Test API Suite (PowerShell)
# Run this after deployment to test all fixes
# Usage: .\test-apis.ps1 -BaseUrl "http://localhost:3001/api/v1" -Token "your-token" -CompanyId 1 -EmployeeId 1

param(
    [string]$BaseUrl = "http://localhost:3001/api/v1",
    [string]$Token = "",
    [int]$CompanyId = 0,
    [int]$EmployeeId = 0
)

# Helper function to make API calls
function Invoke-TestAPI {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body,
        [string]$AuthToken
    )

    $headers = @{
        "Content-Type" = "application/json"
    }

    if ($AuthToken) {
        $headers["Authorization"] = "Bearer $AuthToken"
    }

    try {
        $url = "$BaseUrl$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers
        } else {
            $bodyJson = $Body | ConvertTo-Json
            $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -Body $bodyJson
        }

        return $response.Content | ConvertFrom-Json
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Simpala HR - Test API Suite" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Base URL: $BaseUrl"
Write-Host "Company ID: $CompanyId"
Write-Host "Employee ID: $EmployeeId"
Write-Host ""

# Test 1: Health Check
Write-Host "[TEST 1] Health Check - Verify test endpoints available" -ForegroundColor Yellow

$result = Invoke-TestAPI -Method "GET" -Endpoint "/test/health"
$result | ConvertTo-Json -Depth 5 | Write-Host
Write-Host ""

if ($Token) {
    # Test 2: Employee Creation Validation
    Write-Host "[TEST 2] Employee Creation Validation" -ForegroundColor Yellow
    $result = Invoke-TestAPI -Method "POST" -Endpoint "/test/employee-creation" `
        -Body @{ scenario = "valid" } -AuthToken $Token
    $result | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""

    # Test 3: Leave Application Error Handling
    Write-Host "[TEST 3] Leave Application Error Handling" -ForegroundColor Yellow
    $result = Invoke-TestAPI -Method "POST" -Endpoint "/test/leave-application" `
        -Body @{ scenario = "valid" } -AuthToken $Token
    $result | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""

    # Test 4: Payroll EPF Calculation
    Write-Host "[TEST 4] Payroll EPF Calculation (Verify rates)" -ForegroundColor Yellow
    if ($EmployeeId -gt 0) {
        $result = Invoke-TestAPI -Method "POST" -Endpoint "/test/payroll-calculation" `
            -Body @{ employeeId = $EmployeeId } -AuthToken $Token
        $result | ConvertTo-Json -Depth 5 | Write-Host
    } else {
        Write-Host "Skipped: employeeId not provided" -ForegroundColor Red
    }
    Write-Host ""

    # Test 5: Attendance CSV Import
    Write-Host "[TEST 5] Attendance CSV Import" -ForegroundColor Yellow
    $result = Invoke-TestAPI -Method "POST" -Endpoint "/test/attendance-import" `
        -Body @{ scenario = "valid" } -AuthToken $Token
    $result | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""

    # Test 6: Bank File Export Encoding
    Write-Host "[TEST 6] Bank File Export Encoding (CRLF + UTF-8)" -ForegroundColor Yellow
    $now = Get-Date
    $month = $now.Month
    $year = $now.Year
    $result = Invoke-TestAPI -Method "POST" -Endpoint "/test/bank-file-export" `
        -Body @{ month = $month; year = $year; fileType = "SLIPS" } -AuthToken $Token
    $result | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""

    # Test 7: Leave Anniversary Accrual
    Write-Host "[TEST 7] Leave Anniversary Accrual" -ForegroundColor Yellow
    if ($EmployeeId -gt 0) {
        $result = Invoke-TestAPI -Method "POST" -Endpoint "/test/leave-accrual" `
            -Body @{ employeeId = $EmployeeId } -AuthToken $Token
        $result | ConvertTo-Json -Depth 5 | Write-Host
    } else {
        Write-Host "Skipped: employeeId not provided" -ForegroundColor Red
    }
    Write-Host ""

    # Test 8: Multi-Tenancy Isolation
    Write-Host "[TEST 8] Multi-Tenancy Isolation" -ForegroundColor Yellow
    $result = Invoke-TestAPI -Method "GET" -Endpoint "/test/multi-tenancy" -AuthToken $Token
    $result | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""
} else {
    Write-Host "Note: Get an auth token to run all tests" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To authenticate:" -ForegroundColor Yellow
    Write-Host @"
`$loginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body '{"email":"your@email.com","password":"password"}'

`$token = (`$loginResponse.Content | ConvertFrom-Json).accessToken

# Then run this script again with the token
.\test-apis.ps1 -BaseUrl "$BaseUrl" -Token "`$token" -EmployeeId 1
"@
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Test Suite Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
