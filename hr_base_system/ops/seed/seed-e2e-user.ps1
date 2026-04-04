# Incremental E2E User Seed Script
# Creates and executes a Cloud Run job that runs the non-destructive incremental E2E user seed.
# This avoids local network/VPC access issues to the private Cloud SQL instance.

Write-Host "🚀 Creating Cloud Run job to seed E2E test user..." -ForegroundColor Cyan
Write-Host ""

$jobName = "e2e-user-seed"
$region = "us-central1"
$project = "long-operator-466309-g6"
$image = "us-central1-docker.pkg.dev/long-operator-466309-g6/simpalahr/simpalahr-backend-dev:latest"

# Create (or update) the Cloud Run job for incremental E2E seed
# CONFIRM_E2E_USER=yes tells the script to proceed (guard variable inside e2e-user.seed.ts)
# DATABASE_URL is injected from the secret (dev-database-url) so we can reach the private DB via VPC connector.

gcloud run jobs create $jobName `
  --image=$image `
  --region=$region `
  --project=$project `
  --vpc-connector=simpala-vpc-connector `
  --vpc-egress=all-traffic `
  --update-secrets=DATABASE_URL=dev-database-url:latest `
  --set-env-vars=CONFIRM_E2E_USER=yes `
  --command="npm" `
  --args="run,seed:e2e-user" `
  --max-retries=0 `
  --task-timeout=90s 2>$null

if ($LASTEXITCODE -ne 0) {
  Write-Host "⚠️ Job may already exist; attempting update instead..." -ForegroundColor Yellow
  gcloud run jobs update $jobName `
    --image=$image `
    --region=$region `
    --project=$project `
    --vpc-connector=simpala-vpc-connector `
    --vpc-egress=all-traffic `
    --update-secrets=DATABASE_URL=dev-database-url:latest `
    --set-env-vars=CONFIRM_E2E_USER=yes `
    --command="npm" `
    --args="run,seed:e2e-user" `
    --task-timeout=90s
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create or update Cloud Run job $jobName" -ForegroundColor Red
    exit 1
  }
}

Write-Host "✅ Job ready. Executing..." -ForegroundColor Green

# Execute the job and wait for completion
gcloud run jobs execute $jobName `
  --region=$region `
  --project=$project `
  --wait

if ($LASTEXITCODE -eq 0) {
  Write-Host "🎉 Incremental E2E user seed completed!" -ForegroundColor Green
  Write-Host "🔍 Verify user via backend API: GET /api/v1/users?email=john.doe@simpala.lk" -ForegroundColor Cyan
  Write-Host "🧪 Re-run targeted Playwright spec: leave-request-form-deployed.spec.ts" -ForegroundColor Cyan
} else {
  Write-Host "❌ Seed job execution failed" -ForegroundColor Red
  Write-Host "🔎 Check logs:" -ForegroundColor Yellow
  Write-Host "   gcloud run jobs executions list --job=$jobName --region=$region --project=$project" -ForegroundColor Yellow
  Write-Host "   gcloud run jobs executions describe EXECUTION_ID --job=$jobName --region=$region --project=$project" -ForegroundColor Yellow
  exit 1
}