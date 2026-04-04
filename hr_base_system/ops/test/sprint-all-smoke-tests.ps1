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

# Multipart/form-data file upload helper (PS 5.1 compatible)
function Upload-Document([string]$Uri, [hashtable]$Headers, [string]$Category) {
    $boundary = [System.Guid]::NewGuid().ToString('N')
    $enc      = [System.Text.Encoding]::UTF8
    $stamp    = (Get-Date).ToString('yyyyMMddHHmmss')
    $pdfBytes = $enc.GetBytes("%PDF-1.4 `nsmoke test document category=$Category ts=$stamp")

    $ms = [System.IO.MemoryStream]::new()
    $p1 = $enc.GetBytes("--$boundary`r`nContent-Disposition: form-data; name=`"category`"`r`n`r`n$Category`r`n")
    $ms.Write($p1, 0, $p1.Length)
    $p2 = $enc.GetBytes("--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"smoke_${Category}_$stamp.pdf`"`r`nContent-Type: application/pdf`r`n`r`n")
    $ms.Write($p2, 0, $p2.Length)
    $ms.Write($pdfBytes, 0, $pdfBytes.Length)
    $p3 = $enc.GetBytes("`r`n--$boundary--`r`n")
    $ms.Write($p3, 0, $p3.Length)
    $body = $ms.ToArray()
    $ms.Dispose()

    $hdrs = $Headers.Clone()
    $hdrs["Content-Type"] = "multipart/form-data; boundary=$boundary"
    return Invoke-RestMethod -Method POST -Uri $Uri -Headers $hdrs -Body $body
}

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
Write-Host "`n=== SPRINT 1 ===" -ForegroundColor Cyan
# ─────────────────────────────────────────────

# Pre-fetch leave types
$leaveTypes = Invoke-RestMethod -Method GET -Uri "$BASE/leave/types" -Headers $HE

# S1-T1: Create leave request then cancel it via admin (LEAVE_REQUEST_APPROVE = admin-only)
# Use Casual Leave (employee has 7 days balance); Annual Leave balance is 0
$ltCasual = ($leaveTypes | Where-Object { $_.name -like "*Casual*" }).id
if (-not $ltCasual) { $ltCasual = $leaveTypes[0].id }
# Use a date far enough in the future to avoid conflicts from previous test runs
$startD = (Get-Date).AddDays(1000).ToString("yyyy-MM-dd")
$endD   = (Get-Date).AddDays(1000).ToString("yyyy-MM-dd")  # single day
try {
    $lr1 = Invoke-RestMethod -Method POST -Uri "$BASE/leave/requests" -Headers $HE -Body (J @{
        leaveTypeId=$ltCasual; start_date=$startD; end_date=$endD; reason="sprint1 smoke test"
    }) -ContentType "application/json"
    # Status change requires LEAVE_REQUEST_APPROVE (admin-only) at PATCH /leave/:id/status
    $cl = Invoke-RestMethod -Method PATCH -Uri "$BASE/leave/$($lr1.id)/status" -Headers $HA -Body (J @{status="CANCELLED"}) -ContentType "application/json"
    Check "S1-T1 CANCELLED leave status" ($cl.status -eq "CANCELLED") "id=$($lr1.id) status=$($cl.status)"
} catch {
    $msg = "$($_.Exception.Response.StatusCode.Value__) $($_.Exception.Message)" -replace '\r?\n',' '
    Check "S1-T1 CANCELLED leave status" $false $msg
}

# S1-T2: Leave types visible to employee
Check "S1-T2 Leave types readable by employee" ($leaveTypes.Count -ge 1) "count=$($leaveTypes.Count)"

# S1-T3 + S1-T4: Document categories via multipart/form-data upload
$empId = 78  # test.s2b employee profile ID

try {
    $doc1 = Upload-Document -Uri "$BASE/employees/$empId/documents" -Headers $HA -Category "IDENTIFICATION"
    Check "S1-T3 DocumentCategory IDENTIFICATION" ($doc1.category -eq "IDENTIFICATION") "id=$($doc1.id) cat=$($doc1.category)"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S1-T3 DocumentCategory IDENTIFICATION" $false "HTTP $code"
}

try {
    $doc2 = Upload-Document -Uri "$BASE/employees/$empId/documents" -Headers $HA -Category "OTHER"
    Check "S1-T4 DocumentCategory OTHER" ($doc2.category -eq "OTHER") "id=$($doc2.id) cat=$($doc2.category)"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S1-T4 DocumentCategory OTHER" $false "HTTP $code"
}

# S1-T5: At least 3 leave types (Annual/Casual/Medical)
Check "S1-T5 At least 3 leave types configured" ($leaveTypes.Count -ge 3) "count=$($leaveTypes.Count)"

# ─────────────────────────────────────────────
Write-Host "`n=== SPRINT 2 ===" -ForegroundColor Cyan
# ─────────────────────────────────────────────

# S2-T1: Check-in (gracefully handles already-checked-in via 409)
$today = (Get-Date).ToString("yyyy-MM-dd")
$ciId  = $null
try {
    $ci   = Invoke-RestMethod -Method POST -Uri "$BASE/attendance/checkin" -Headers $HE -Body (J @{}) -ContentType "application/json"
    # Response shape: { message, record: { id, checkInTime, ... } }
    $ciId = if ($ci.record) { $ci.record.id } else { $ci.id }
    Check "S2-T1 Check-in" $true "id=$ciId"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    if ($code -eq 409 -or $code -eq 400) {
        # Already checked in today — find today's record via admin attendance list
        $todayUri = "$BASE/attendance?employeeId=78" + $AMP + "startDate=$today" + $AMP + "endDate=$today"
        try {
            $todayRec = Invoke-RestMethod -Method GET -Uri $todayUri -Headers $HA
            # Response shape: { data: [...], pagination: {...} }
            $ciId = if ($todayRec.data -and $todayRec.data.Count -gt 0) { $todayRec.data[0].id } else { $null }
        } catch { $ciId = $null }
        Check "S2-T1 Check-in (already done, record found)" ($null -ne $ciId) "id=$ciId HTTP=$code"
    } else {
        Check "S2-T1 Check-in" $false "HTTP $code"
    }
}

# S2-T2: Duplicate check-in must be rejected (409 or 400)
try {
    $dup = Invoke-RestMethod -Method POST -Uri "$BASE/attendance/checkin" -Headers $HE -Body (J @{}) -ContentType "application/json"
    Check "S2-T2 Duplicate check-in guard" $false "Expected 409, got id=$($dup.record.id)"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S2-T2 Duplicate check-in guard" ($code -eq 409 -or $code -eq 400) "HTTP $code"
}

# S2-T3: Check-out
try {
    $co = Invoke-RestMethod -Method POST -Uri "$BASE/attendance/checkout" -Headers $HE -Body (J @{}) -ContentType "application/json"
    Check "S2-T3 Check-out" $true "msg=$($co.message)"
} catch {
    $code = $_.Exception.Response.StatusCode.Value__
    Check "S2-T3 Check-out" $false "HTTP $code"
}

# S2-T4: Monthly summary
$mon        = (Get-Date).Month; $yr = (Get-Date).Year
$summaryUri = "$BASE/attendance/me/summary?month=$mon" + $AMP + "year=$yr"
$summary    = Invoke-RestMethod -Method GET -Uri $summaryUri -Headers $HE
Check "S2-T4 Monthly summary" ($summary.total -ge 0) "month=$mon total=$($summary.total)"

# S2-T5: Create correction request
# Schema: { date(string), requestedStatus, reason, attendanceId?(number) }
# Get latest attendance record for this employee
$attListUri = "$BASE/attendance?employeeId=78" + $AMP + "limit=5"
$attList    = Invoke-RestMethod -Method GET -Uri $attListUri -Headers $HA
# Response: { data: [...], pagination: {...} }
$recId = if ($attList.data -and $attList.data.Count -gt 0) { $attList.data[0].id } elseif ($ciId) { $ciId } else { $null }

try {
    $corrBody = @{ date=$today; requestedStatus="WFH"; reason="Full suite smoke test" }
    if ($recId) { $corrBody.attendanceId = [int]$recId }
    $corr = Invoke-RestMethod -Method POST -Uri "$BASE/attendance/corrections" -Headers $HE -Body (J $corrBody) -ContentType "application/json"
    Check "S2-T5 Correction request created" ($corr.id -gt 0) "id=$($corr.id) status=$($corr.status)"
} catch {
    $errBody = ""
    try { $r = $_.Exception.Response; $s = $r.GetResponseStream(); $reader = [System.IO.StreamReader]::new($s); $errBody = $reader.ReadToEnd() } catch {}
    Check "S2-T5 Correction request created" $false "HTTP $($_.Exception.Response.StatusCode.Value__) $errBody"
}

# S2-T6: Employee sees own corrections — service returns plain array
$mine = Invoke-RestMethod -Method GET -Uri "$BASE/attendance/corrections/mine" -Headers $HE
# $mine is a plain JSON array (e.g. [{id:1,...},{id:2,...}])
$mineCount = if ($mine -is [array]) { $mine.Count } else { 1 }
Check "S2-T6 Employee sees own corrections" ($mineCount -gt 0) "count=$mineCount"

# S2-T7: Admin sees all corrections — plain array
$all = Invoke-RestMethod -Method GET -Uri "$BASE/attendance/corrections" -Headers $HA
$allCount = if ($all -is [array]) { $all.Count } else { 1 }
Check "S2-T7 Admin sees all corrections" ($allCount -gt 0) "count=$allCount"

# S2-T8 + S2-T9 depend on corrections existing
# Corrections are ordered DESC by createdAt — index 0 is the newest.
# Prefer to approve the one we created in T5 ($corr.id), fallback to $all[0]
$approveId = if ($corr -and $corr.id) { $corr.id } elseif ($all -is [array] -and $all.Count -gt 0) { $all[0].id } elseif ($all.id) { $all.id } else { $null }

if ($approveId) {
    $approve = Invoke-RestMethod -Method PATCH -Uri "$BASE/attendance/corrections/$approveId" -Headers $HA -Body (J @{status="APPROVED";adminNotes="Verified via smoke test"}) -ContentType "application/json"
    Check "S2-T8 Admin approve correction" ($approve.status -eq "APPROVED") "id=$approveId status=$($approve.status)"

    # S2-T9: Verify attendance record status changed to WFH.
    # No single-record endpoint — query by date range and find today's record.
    if ($recId) {
        $verifyUri = "$BASE/attendance?employeeId=78" + $AMP + "startDate=$today" + $AMP + "endDate=$today"
        $verifyRec = Invoke-RestMethod -Method GET -Uri $verifyUri -Headers $HA
        $todayStatus = if ($verifyRec.data -and $verifyRec.data.Count -gt 0) { $verifyRec.data[0].status } else { $null }
        Check "S2-T9 Attendance record updated to WFH" ($todayStatus -eq "WFH") "status=$todayStatus"
    } else {
        Check "S2-T9 Attendance record updated to WFH" $false "recId not available (no attendance record found earlier)"
    }
} else {
    Check "S2-T8 Admin approve correction" $false "No corrections found (T5 may have failed)"
    Check "S2-T9 Attendance record updated to WFH" $false "Skipped (no corrections)"
}

# ─────────────────────────────────────────────
Write-Host "`n=== SPRINT 3 ===" -ForegroundColor Cyan
# ─────────────────────────────────────────────

# S3-T1: Save emergency contact
$p1 = Invoke-RestMethod -Method PATCH -Uri "$BASE/users/me" -Headers $HE -Body (J @{
    phone_number="+94771234999"; emergency_contact_name="Nimal Silva"; emergency_contact_phone="+94771000001"
}) -ContentType "application/json"
Check "S3-T1 Save emergency contact" ($p1.employee.emergency_contact_name -eq "Nimal Silva") "ec_name=$($p1.employee.emergency_contact_name)"

# S3-T2: GET profile persists the value
$profile = Invoke-RestMethod -Method GET -Uri "$BASE/users/me" -Headers $HE
Check "S3-T2 GET profile persists emergency contact" ($profile.employee.emergency_contact_name -eq "Nimal Silva") "ec=$($profile.employee.emergency_contact_name)"

# S3-T3: Partial PATCH must not wipe emergency contact
$p2 = Invoke-RestMethod -Method PATCH -Uri "$BASE/users/me" -Headers $HE -Body (J @{phone_number="+94770000999"}) -ContentType "application/json"
Check "S3-T3 Partial PATCH preserves emergency contact" ($p2.employee.emergency_contact_name -eq "Nimal Silva") "ec=$($p2.employee.emergency_contact_name)"

# S3-T4: GET /leave/balance/me
$lb = Invoke-RestMethod -Method GET -Uri "$BASE/leave/balance/me" -Headers $HE
Check "S3-T4 GET /leave/balance/me returns data" ($lb.balances.Count -gt 0) "employeeId=$($lb.employeeId) count=$($lb.balances.Count)"

# S3-T5: Balance response shape (flat leaveTypeName, not nested)
$b0      = $lb.balances[0]
$shapeOk = ($null -ne $b0.leaveTypeName) -and ($null -ne $b0.accrued) -and ($null -ne $b0.used) -and ($null -ne $b0.available)
Check "S3-T5 Balance shape has leaveTypeName/accrued/used/available" $shapeOk "name='$($b0.leaveTypeName)' avail=$($b0.available)"

# S3-T6: Clear emergency contact
$p3 = Invoke-RestMethod -Method PATCH -Uri "$BASE/users/me" -Headers $HE -Body (J @{emergency_contact_name="";emergency_contact_phone=""}) -ContentType "application/json"
Check "S3-T6 Clear emergency contact" ($p3.employee.emergency_contact_name -eq "") "ec='$($p3.employee.emergency_contact_name)'"

# S3-T7: Re-set emergency contact
$p4 = Invoke-RestMethod -Method PATCH -Uri "$BASE/users/me" -Headers $HE -Body (J @{emergency_contact_name="Kamal Perera";emergency_contact_phone="+94760000002"}) -ContentType "application/json"
Check "S3-T7 Re-set emergency contact" ($p4.employee.emergency_contact_name -eq "Kamal Perera") "ec=$($p4.employee.emergency_contact_name)"

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

$stamp = (Get-Date).ToString("yyyyMMddHHmmss")
$futureExpiry = (Get-Date).AddDays(180).ToString("yyyy-MM-dd")
$createdDocId = $null

# S4-T4: ADMIN can get expiry document summary
try {
    $exSummary = Invoke-RestMethod -Method GET -Uri "$BASE/expiry-documents/summary" -Headers $HA
    $hasSummary = ($null -ne $exSummary.total) -or ($null -ne $exSummary.valid)
    Check "S4-T4 GET /expiry-documents/summary" $hasSummary "valid=$($exSummary.valid) expiring=$($exSummary.expiringSoon) expired=$($exSummary.expired) total=$($exSummary.total)"
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
        Check "S4-T8 DELETE /expiry-documents/:id" $true "id=$createdDocId deleted"
    } catch {
        $code = $_.Exception.Response.StatusCode.Value__
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

$ltCasual2  = ($leaveTypes | Where-Object { $_.name -like "*Casual*" }).id
$ltMedical2 = ($leaveTypes | Where-Object { $_.name -like "*Medical*" }).id

$farStart3 = (Get-Date).AddDays(2000).ToString("yyyy-MM-dd")
$farEnd3   = (Get-Date).AddDays(2002).ToString("yyyy-MM-dd")  # 3 days

# S4-T9: Casual Leave >2 consecutive days must be rejected
if ($ltCasual2) {
    try {
        $null = Invoke-WebRequest -Method POST -Uri "$BASE/leave/requests" -Headers $HE -Body (J @{
            leaveTypeId=$ltCasual2; start_date=$farStart3; end_date=$farEnd3; reason="casual leave 3 days test"
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
if ($ltMedical2) {
    try {
        $null = Invoke-WebRequest -Method POST -Uri "$BASE/leave/requests" -Headers $HE -Body (J @{
            leaveTypeId=$ltMedical2; start_date=$farStart3; end_date=$farEnd3
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
Write-Host "  TOTAL  : $total" -ForegroundColor Cyan
Write-Host "  PASSED : $pass" -ForegroundColor Green
if ($fail -eq 0) {
    Write-Host "  FAILED : 0  --  ALL GREEN" -ForegroundColor Green
} else {
    Write-Host "  FAILED : $fail" -ForegroundColor Red
}
Write-Host "==============================`n" -ForegroundColor Cyan
exit $fail
