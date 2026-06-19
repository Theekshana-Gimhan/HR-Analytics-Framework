<#
.SYNOPSIS
    One-time IAM + bucket provisioning for the ML inference service (kpi-uat).

.DESCRIPTION
    - Creates the least-privilege runtime SA (simpalahr-ml-runtime).
    - Grants it read-only access to the model bucket.
    - Grants the HR backend SA permission to invoke the (locked) ML service.
      (Run the invoker grant AFTER the service exists; the script is idempotent,
       so re-running after deploy is safe.)
#>

$ErrorActionPreference = "Stop"

$PROJECT     = "kpi-uat"
$REGION      = "us-central1"
$SERVICE     = "simpalahr-ml-dev"
$BUCKET      = "kpi-uat-simpalahr-ml"
$ML_SA       = "simpalahr-ml-runtime@kpi-uat.iam.gserviceaccount.com"
$HR_SA       = "staging-runtime-sa@kpi-uat.iam.gserviceaccount.com"   # HR backend caller

Write-Host "=== Runtime service account ===" -ForegroundColor Cyan
$exists = gcloud iam service-accounts list --project $PROJECT --filter="email:$ML_SA" --format="value(email)"
if (-not $exists) {
    gcloud iam service-accounts create simpalahr-ml-runtime `
        --project $PROJECT `
        --display-name "NexusHR ML inference runtime"
} else {
    Write-Host "  exists: $ML_SA"
}

Write-Host "`n=== Grant ML SA read on model bucket ===" -ForegroundColor Cyan
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" `
    --member "serviceAccount:$ML_SA" `
    --role "roles/storage.objectViewer" `
    --project $PROJECT | Out-Null
Write-Host "  granted roles/storage.objectViewer on gs://$BUCKET"

Write-Host "`n=== Grant HR backend SA invoke rights on ML service ===" -ForegroundColor Cyan
$svcExists = gcloud run services list --project $PROJECT --region $REGION --filter="metadata.name:$SERVICE" --format="value(metadata.name)"
if ($svcExists) {
    gcloud run services add-iam-policy-binding $SERVICE `
        --project $PROJECT --region $REGION `
        --member "serviceAccount:$HR_SA" `
        --role "roles/run.invoker" | Out-Null
    Write-Host "  granted roles/run.invoker to $HR_SA on $SERVICE"
} else {
    Write-Host "  [skip] $SERVICE not deployed yet - re-run after deploy.ps1" -ForegroundColor Yellow
}

Write-Host "`n[OK] IAM setup complete." -ForegroundColor Green
