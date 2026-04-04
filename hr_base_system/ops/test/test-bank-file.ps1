$BACKEND_URL = "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1"
$headers = @{ "Content-Type" = "application/json" }

# 1. Login as Owner
Write-Host "Logging in as Owner..." -ForegroundColor Cyan
$body = @{ email = "owner@simpala.lk"; password = "password123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BACKEND_URL/auth/login" -Method POST -Headers $headers -Body $body
$token = $login.accessToken
$authHeaders = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "Logged in successfully." -ForegroundColor Green

# 2. Generate Bank File (CIPS)
Write-Host "`nGenerating CIPS Bank File..." -ForegroundColor Cyan
$bankFileBody = @{
    month     = 11
    year      = 2025
    fileType  = "CIPS"
    narration = "November Salary"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BACKEND_URL/payroll/bank-file" -Method POST -Headers $authHeaders -Body $bankFileBody
    
    Write-Host "Bank File Generated Successfully!" -ForegroundColor Green
    # Cannot access headers easily in older PS with Invoke-RestMethod, skipping header output
    
    $csvContent = $response
    Write-Host "`nCSV Content Preview:" -ForegroundColor Yellow
    $csvContent -split "`n" | Select-Object -First 5 | ForEach-Object { Write-Host $_ }
}
catch {
    Write-Host "Error generating bank file: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Server Response: $errorBody" -ForegroundColor Red
    }
}

# 3. Generate Bank File (SLIPS)
Write-Host "`nGenerating SLIPS Bank File..." -ForegroundColor Cyan
$bankFileBodySlips = @{
    month    = 11
    year     = 2025
    fileType = "SLIPS"
} | ConvertTo-Json

try {
    $responseSlips = Invoke-RestMethod -Uri "$BACKEND_URL/payroll/bank-file" -Method POST -Headers $authHeaders -Body $bankFileBodySlips
    Write-Host "SLIPS Bank File Generated Successfully!" -ForegroundColor Green
    $responseSlips -split "`n" | Select-Object -First 5 | ForEach-Object { Write-Host $_ }
}
catch {
    Write-Host "Error generating SLIPS file: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Server Response: $errorBody" -ForegroundColor Red
    }
}
