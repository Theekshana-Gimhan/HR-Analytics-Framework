<#
.SYNOPSIS
    Build and deploy the NexusHR attrition inference service to Cloud Run (kpi-uat).

.DESCRIPTION
    1. Copies the freshly-trained model bundles into ./models (baked-in fallback).
    2. Builds the image via Cloud Build -> Artifact Registry (simpalahr repo).
    3. Deploys to Cloud Run: IAM-authenticated, scale-to-zero, no VPC.

    Run scripts/train_model.py first so the bundles exist. The runtime service
    account and GCS bucket are provisioned by setup-iam.ps1 (run once).

.EXAMPLE
    .\deploy.ps1
#>

$ErrorActionPreference = "Stop"

$PROJECT     = "kpi-uat"
$REGION      = "us-central1"
$SERVICE     = "simpalahr-ml-dev"
$IMAGE       = "us-central1-docker.pkg.dev/kpi-uat/simpalahr/simpalahr-ml-dev:latest"
$RUNTIME_SA  = "simpalahr-ml-runtime@kpi-uat.iam.gserviceaccount.com"
$BUCKET      = "kpi-uat-simpalahr-ml"

$SCRIPT_DIR  = Split-Path -Parent $MyInvocation.MyCommand.Path
$MODELS_SRC  = Join-Path $SCRIPT_DIR "..\models"
$MODELS_DST  = Join-Path $SCRIPT_DIR "models"

Write-Host "=== Staging model bundles (baked-in fallback) ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $MODELS_DST | Out-Null
foreach ($f in @("attrition_local.joblib", "attrition_transfer.joblib")) {
    $src = Join-Path $MODELS_SRC $f
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $MODELS_DST $f) -Force
        Write-Host "  copied $f"
    } else {
        Write-Host "  [warn] $f not found - run scripts/train_model.py first" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Building image via Cloud Build (regional) ===" -ForegroundColor Cyan
# Org policy constraints/gcp.resourceLocations forbids the default 'us' multi-region
# staging bucket, so build in-region using the existing regional staging bucket.
gcloud builds submit $SCRIPT_DIR --tag $IMAGE --project $PROJECT `
    --region $REGION `
    --gcs-source-staging-dir "gs://kpi-uat_us-central1_cloudbuild/source"
if ($LASTEXITCODE -ne 0) { throw "Cloud Build failed" }

Write-Host "`n=== Deploying to Cloud Run ===" -ForegroundColor Cyan
gcloud run deploy $SERVICE `
    --image $IMAGE `
    --project $PROJECT `
    --region $REGION `
    --no-allow-unauthenticated `
    --service-account $RUNTIME_SA `
    --min-instances 0 `
    --max-instances 3 `
    --memory 1Gi `
    --cpu 1 `
    --set-env-vars "MODEL_BUCKET=$BUCKET,MODEL_PREFIX=models" `
    --quiet
if ($LASTEXITCODE -ne 0) { throw "Cloud Run deploy failed" }

$url = gcloud run services describe $SERVICE --project $PROJECT --region $REGION --format="value(status.url)"
Write-Host "`n[OK] Deployed: $url" -ForegroundColor Green
Write-Host "Test (IAM token):" -ForegroundColor Cyan
Write-Host '  curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" <URL>/health'
