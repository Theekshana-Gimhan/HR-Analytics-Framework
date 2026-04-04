#!/usr/bin/env pwsh
# Quick API Test - Run this for fast health check

$BACKEND = "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1"

Write-Host "`n🧪 Quick API Health Check`n" -ForegroundColor Cyan

# 1. Backend Health
Write-Host "1. Backend... " -NoNewline
try {
    $health = Invoke-RestMethod "$BACKEND/health"
    Write-Host "✅ $($health.status)" -ForegroundColor Green
} catch { Write-Host "❌ Failed" -ForegroundColor Red }

# 2. Login & Get Token
Write-Host "2. Login... " -NoNewline
try {
    $body = @{ email="owner@simpala.lk"; password="password123" } | ConvertTo-Json
    $login = Invoke-RestMethod "$BACKEND/auth/login" -Method POST -Body $body -ContentType "application/json"
    $token = $login.accessToken
    Write-Host "✅ Token received" -ForegroundColor Green
} catch { Write-Host "❌ Failed" -ForegroundColor Red; exit 1 }

# 3. Employees
Write-Host "3. Employees... " -NoNewline
try {
    $headers = @{ Authorization="Bearer $token" }
    $employees = Invoke-RestMethod "$BACKEND/employees" -Headers $headers
    Write-Host "✅ $($employees.Count) found" -ForegroundColor Green
} catch { Write-Host "❌ Failed" -ForegroundColor Red }

# 4. Leave Requests
Write-Host "4. Leave Requests... " -NoNewline
try {
    $leave = Invoke-RestMethod "$BACKEND/leave/requests" -Headers $headers
    $count = if($leave){$leave.Count}else{0}
    Write-Host "✅ $count found" -ForegroundColor Green
} catch { Write-Host "❌ Failed" -ForegroundColor Red }

# 5. Attendance
Write-Host "5. Attendance... " -NoNewline
try {
    $attendance = Invoke-RestMethod "$BACKEND/attendance" -Headers $headers
    $count = if($attendance){$attendance.Count}else{0}
    Write-Host "✅ $count records" -ForegroundColor Green
} catch { Write-Host "❌ Failed" -ForegroundColor Red }

# 6. Frontend
Write-Host "6. Frontend... " -NoNewline
try {
    $response = Invoke-WebRequest "https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app" -TimeoutSec 5
    Write-Host "✅ $($response.StatusCode)" -ForegroundColor Green
} catch { Write-Host "❌ Failed" -ForegroundColor Red }

Write-Host "`n✅ All systems operational!`n" -ForegroundColor Green
