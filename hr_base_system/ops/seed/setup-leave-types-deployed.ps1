# Setup Leave Types in Deployed Environment
# This script configures the standard Sri Lankan leave types in the deployed dev environment

$BackendUrl = "https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1"
$Email = "owner@simpala.lk"
$Password = "password123"

Write-Host "🔐 Logging in to deployed environment..." -ForegroundColor Cyan

# Step 1: Login to get auth token
$loginBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BackendUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create headers with auth token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 3: Check existing leave types
Write-Host "`n📋 Checking existing leave types..." -ForegroundColor Cyan

try {
    $existingTypes = Invoke-RestMethod -Uri "$BackendUrl/leave/types" -Method GET -Headers $headers
    Write-Host "   Found $($existingTypes.Count) existing leave types" -ForegroundColor Gray
    
    if ($existingTypes.Count -gt 0) {
        Write-Host "   Existing types:" -ForegroundColor Gray
        foreach ($type in $existingTypes) {
            Write-Host "   - $($type.name): $($type.default_balance) days" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "⚠️  Could not fetch existing leave types: $_" -ForegroundColor Yellow
    $existingTypes = @()
}

# Step 4: Define standard Sri Lankan leave types
$leaveTypes = @(
    @{
        name = "Annual Leave"
        default_balance = 14
        description = "Annual vacation leave - 14 days per year as per Sri Lankan labor law"
        requires_anniversary = $true
    },
    @{
        name = "Casual Leave"
        default_balance = 7
        description = "Short-term casual leave - 7 days per year"
        requires_anniversary = $false
    },
    @{
        name = "Medical Leave"
        default_balance = 7
        description = "Medical/sick leave - 7 days per year"
        requires_anniversary = $false
    }
)

# Step 5: Create each leave type
Write-Host "`n🚀 Creating leave types..." -ForegroundColor Cyan

$created = 0
$skipped = 0

foreach ($leaveType in $leaveTypes) {
    # Check if this type already exists
    $exists = $existingTypes | Where-Object { $_.name -eq $leaveType.name }
    
    if ($exists) {
        Write-Host "⏭️  Skipping '$($leaveType.name)' - already exists" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    $body = $leaveType | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/leave/types" -Method POST -Body $body -Headers $headers
        Write-Host "✅ Created '$($leaveType.name)' - $($leaveType.default_balance) days" -ForegroundColor Green
        $created++
    } catch {
        $errorMessage = $_.ErrorDetails.Message
        Write-Host "❌ Failed to create '$($leaveType.name)': $errorMessage" -ForegroundColor Red
    }
}

# Step 6: Verify setup
Write-Host "`n🔍 Verifying setup..." -ForegroundColor Cyan

try {
    $finalTypes = Invoke-RestMethod -Uri "$BackendUrl/leave/types" -Method GET -Headers $headers
    Write-Host "✅ Total leave types now configured: $($finalTypes.Count)" -ForegroundColor Green
    Write-Host "`n📊 Current leave types:" -ForegroundColor Cyan
    foreach ($type in $finalTypes) {
        Write-Host "   ✓ $($type.name): $($type.default_balance) days" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify setup: $_" -ForegroundColor Yellow
}

# Summary
Write-Host "`n📈 Summary:" -ForegroundColor Cyan
if ($created -gt 0) {
    Write-Host "   Created: $created" -ForegroundColor Green
} else {
    Write-Host "   Created: $created" -ForegroundColor Gray
}
if ($skipped -gt 0) {
    Write-Host "   Skipped: $skipped" -ForegroundColor Yellow
} else {
    Write-Host "   Skipped: $skipped" -ForegroundColor Gray
}
Write-Host "`n✨ Leave types setup complete!" -ForegroundColor Green
Write-Host "   You can now run E2E tests against the deployed environment." -ForegroundColor Gray
