param(
    [string]$BASE = "https://simpalahr-backend-dev-85939737092.us-central1.run.app/api/v1"
)

$pass = 0; $fail = 0
$AMP = [char]38

function Check([string]$label, [bool]$condition, [string]$info) {
    if ($condition) {
        $script:pass++
        Write-Host "[PASS] $label  $info" -ForegroundColor Green
    } else {
        $script:fail++
        Write-Host "[FAIL] $label  $info" -ForegroundColor Red
    }
}

function J($obj) { $obj | ConvertTo-Json -Compress -Depth 5 }

# ─────────────────────────────────────────────
Write-Host "`n=== Logging in ===" -ForegroundColor Cyan
# ─────────────────────────────────────────────

$EMP_TOKEN   = (Invoke-RestMethod -Method POST -Uri "$BASE/auth/login" -Body (J @{email="test.s2b@simpala.lk";password="Test1234!"}) -ContentType "application/json").accessToken
$ADM_TOKEN   = (Invoke-RestMethod -Method POST -Uri "$BASE/auth/login" -Body (J @{email="admin@simpala.lk";password="password123"}) -ContentType "application/json").accessToken
$OWNER_TOKEN = (Invoke-RestMethod -Method POST -Uri "$BASE/auth/login" -Body (J @{email="owner@simpala.lk";password="password123"}) -ContentType "application/json").accessToken

$HE = @{ Authorization = "Bearer $EMP_TOKEN" }
$HA = @{ Authorization = "Bearer $ADM_TOKEN" }
$HO = @{ Authorization = "Bearer $OWNER_TOKEN" }

Write-Host "Employee: $($EMP_TOKEN.Substring(0,25))..."
Write-Host "Admin:    $($ADM_TOKEN.Substring(0,25))..."
Write-Host "Owner:    $($OWNER_TOKEN.Substring(0,25))..."

# ─────────────────────────────────────────────
Write-Host "`n=== SPRINT 4 — Audit Log API ===" -ForegroundColor Cyan
# ─────────────────────────────────────────────

# S4-T1: OWNER can access audit logs
try {
    $auditResp = Invoke-RestMethod -Method GET -Uri "$BASE/audit-logs?limit=5" -Headers $HO
    # Response: { logs: [...], total, limit, offset }
    $hasShape = ($null -ne $auditResp.logs) -and ($null -ne $auditResp.total)
    Check "S4-T1 OWNER can GET /audit-logs" $hasShape "count=$($auditResp.logs.Count) total=$($auditResp.total)"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S4-T1 OWNER can GET /audit-logs" $false "HTTP $code"
}

# S4-T2: ADMIN must NOT access audit logs (403)
try {
    $auditAdmin = Invoke-RestMethod -Method GET -Uri "$BASE/audit-logs?limit=5" -Headers $HA
    Check "S4-T2 ADMIN denied GET /audit-logs" $false "Expected 403, got 200"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S4-T2 ADMIN denied GET /audit-logs" ($code -eq 403) "HTTP $code"
}

# S4-T3: EMPLOYEE must NOT access audit logs (403)
try {
    $auditEmp = Invoke-RestMethod -Method GET -Uri "$BASE/audit-logs?limit=5" -Headers $HE
    Check "S4-T3 EMPLOYEE denied GET /audit-logs" $false "Expected 403, got 200"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S4-T3 EMPLOYEE denied GET /audit-logs" ($code -eq 403) "HTTP $code"
}

# ─────────────────────────────────────────────
Write-Host "`n=== SPRINT 4 — Document Expiry CRUD ===" -ForegroundColor Cyan
# ─────────────────────────────────────────────

$empId = 78  # test.s2b employee profile ID
$stamp = (Get-Date).ToString("yyyyMMddHHmmss")
$futureExpiry = (Get-Date).AddDays(180).ToString("yyyy-MM-dd")
$createdDocId = $null

# S4-T4: ADMIN can get expiry document summary
try {
    $summary = Invoke-RestMethod -Method GET -Uri "$BASE/expiry-documents/summary" -Headers $HA
    $hasSummary = ($null -ne $summary.total) -or ($null -ne $summary.valid)
    Check "S4-T4 GET /expiry-documents/summary" $hasSummary "valid=$($summary.valid) expiring=$($summary.expiringSoon) expired=$($summary.expired) total=$($summary.total)"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S4-T4 GET /expiry-documents/summary" $false "HTTP $code"
}

# S4-T5: ADMIN can create expiry document
try {
    $newDoc = Invoke-RestMethod -Method POST -Uri "$BASE/expiry-documents" -Headers $HA -Body (J @{
        employeeId=$empId
        documentType="LICENSE"
        name="Smoke Test License $stamp"
        expiryDate=$futureExpiry
        alertDaysBefore=30
        notes="Created by Sprint 4 smoke test"
    }) -ContentType "application/json"
    $createdDocId = $newDoc.id
    Check "S4-T5 POST /expiry-documents (create)" ($createdDocId -gt 0) "id=$createdDocId type=$($newDoc.documentType)"
} catch {
    $errBody = ""
    try { $r = $_.Exception.Response; $s = $r.GetResponseStream(); $reader = [System.IO.StreamReader]::new($s); $errBody = $reader.ReadToEnd() } catch {}
    Check "S4-T5 POST /expiry-documents (create)" $false "HTTP $($_.Exception.Response.StatusCode.Value__) $errBody"
}

# S4-T6: ADMIN can list expiry documents (verify created doc exists)
try {
    $listResp = Invoke-RestMethod -Method GET -Uri "$BASE/expiry-documents?limit=50" -Headers $HA
    $found = $false
    if ($listResp.documents) {
        foreach ($d in $listResp.documents) {
            if ($d.id -eq $createdDocId) { $found = $true; break }
        }
    }
    Check "S4-T6 GET /expiry-documents (list)" $found "total=$($listResp.total) found_created=$found"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S4-T6 GET /expiry-documents (list)" $false "HTTP $code"
}

# S4-T7: ADMIN can update expiry document
if ($createdDocId) {
    try {
        $updDoc = Invoke-RestMethod -Method PATCH -Uri "$BASE/expiry-documents/$createdDocId" -Headers $HA -Body (J @{
            notes="Updated by Sprint 4 smoke test"
            status="RENEWED"
        }) -ContentType "application/json"
        Check "S4-T7 PATCH /expiry-documents/:id (update)" ($updDoc.notes -like "*Updated*" -or $updDoc.status -eq "RENEWED") "status=$($updDoc.status)"
    } catch {
        $code = $_.Exception.Response.StatusCode.Value__
        Check "S4-T7 PATCH /expiry-documents/:id (update)" $false "HTTP $code"
    }
} else {
    Check "S4-T7 PATCH /expiry-documents/:id (update)" $false "Skipped (no doc created)"
}

# S4-T8: ADMIN can delete expiry document
if ($createdDocId) {
    try {
        $null = Invoke-WebRequest -Method DELETE -Uri "$BASE/expiry-documents/$createdDocId" -Headers $HA -UseBasicParsing
        # 204 No Content = success
        Check "S4-T8 DELETE /expiry-documents/:id" $true "id=$createdDocId deleted"
    } catch {
        $code = $_.Exception.Response.StatusCode.Value__
        # 204 may throw in some PS versions; treat as pass
        if ($code -eq 204) {
            Check "S4-T8 DELETE /expiry-documents/:id" $true "id=$createdDocId deleted (204)"
        } else {
            Check "S4-T8 DELETE /expiry-documents/:id" $false "HTTP $code"
        }
    }
} else {
    Check "S4-T8 DELETE /expiry-documents/:id" $false "Skipped (no doc created)"
}

# ─────────────────────────────────────────────
Write-Host "`n=== SPRINT 4 — Leave Policy Validations ===" -ForegroundColor Cyan
# ─────────────────────────────────────────────

# Pre-fetch leave types
$leaveTypes = Invoke-RestMethod -Method GET -Uri "$BASE/leave/types" -Headers $HE

$ltCasual  = ($leaveTypes | Where-Object { $_.name -like "*Casual*" }).id
$ltMedical = ($leaveTypes | Where-Object { $_.name -like "*Medical*" }).id

# Use far-future dates to avoid conflicts
$farStart3 = (Get-Date).AddDays(2000).ToString("yyyy-MM-dd")
$farEnd3   = (Get-Date).AddDays(2002).ToString("yyyy-MM-dd")  # 3 days

# S4-T9: Casual Leave >2 consecutive days must be rejected
if ($ltCasual) {
    try {
        $null = Invoke-WebRequest -Method POST -Uri "$BASE/leave/requests" -Headers $HE -Body (J @{
            leaveTypeId=$ltCasual; start_date=$farStart3; end_date=$farEnd3; reason="casual leave 3 days test"
        }) -ContentType "application/json" -UseBasicParsing
        Check "S4-T9 Casual Leave >2 days rejected" $false "Expected 400, got 2xx"
    } catch {
        $code = $_.Exception.Response.StatusCode.Value__
        Check "S4-T9 Casual Leave >2 days rejected" ($code -eq 400) "HTTP $code"
    }
} else {
    Check "S4-T9 Casual Leave >2 days rejected" $false "Casual leave type not found"
}

# S4-T10: Medical Leave >2 days without reason must be rejected
if ($ltMedical) {
    try {
        $null = Invoke-WebRequest -Method POST -Uri "$BASE/leave/requests" -Headers $HE -Body (J @{
            leaveTypeId=$ltMedical; start_date=$farStart3; end_date=$farEnd3
        }) -ContentType "application/json" -UseBasicParsing
        Check "S4-T10 Medical Leave >2 days no reason rejected" $false "Expected 400, got 2xx"
    } catch {
        $code = $_.Exception.Response.StatusCode.Value__
        Check "S4-T10 Medical Leave >2 days no reason rejected" ($code -eq 400) "HTTP $code"
    }
} else {
    Check "S4-T10 Medical Leave >2 days no reason rejected" $false "Medical leave type not found"
}

# ─────────────────────────────────────────────
$total = $pass + $fail
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  SPRINT 4 TOTAL  : $total" -ForegroundColor Cyan
Write-Host "  PASSED : $pass" -ForegroundColor Green
if ($fail -eq 0) {
    Write-Host "  FAILED : 0  --  ALL GREEN" -ForegroundColor Green
} else {
    Write-Host "  FAILED : $fail" -ForegroundColor Red
}
Write-Host "==============================`n" -ForegroundColor Cyan
exit $fail
