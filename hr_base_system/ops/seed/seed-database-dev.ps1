#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Seeds the development database via Cloud Run Jobs
.DESCRIPTION
    Runs the full dev.seed.ts against the dev database with all payslip data
#>

Write-Host "Triggering full database seed for dev environment..." -ForegroundColor Cyan
Write-Host "This will create: company, users, employees, leave types, attendance, payslips" -ForegroundColor Gray

# First, build and push the seed image
Write-Host "`nBuilding seed image..." -ForegroundColor Yellow
docker build -f Dockerfile.seed-dev -t us-central1-docker.pkg.dev/long-operator-466309-g6/simpalahr/seed-dev:latest .
docker push us-central1-docker.pkg.dev/long-operator-466309-g6/simpalahr/seed-dev:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to build seed image" -ForegroundColor Red
    exit 1
}

# Deploy/update Cloud Run Job
Write-Host "`nDeploying seed job..." -ForegroundColor Yellow
gcloud run jobs create seed-dev-job `
    --image us-central1-docker.pkg.dev/long-operator-466309-g6/simpalahr/seed-dev:latest `
    --region us-central1 `
    --project long-operator-466309-g6 `
    --vpc-connector simpala-vpc-connector `
    --vpc-egress all-traffic `
    --set-secrets DATABASE_URL=dev-database-url:latest `
    --max-retries 0 `
    --task-timeout 10m `
    2>$null

if ($LASTEXITCODE -ne 0) {
    # Job might already exist, try updating instead
    Write-Host "Job exists, updating..." -ForegroundColor Gray
    gcloud run jobs update seed-dev-job `
        --image us-central1-docker.pkg.dev/long-operator-466309-g6/simpalahr/seed-dev:latest `
        --region us-central1 `
        --project long-operator-466309-g6
}

# Execute the job
Write-Host "`nExecuting seed job..." -ForegroundColor Yellow
gcloud run jobs execute seed-dev-job `
    --region us-central1 `
    --project long-operator-466309-g6 `
    --wait

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Seed job completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Data created:" -ForegroundColor Yellow
    Write-Host "  - 1 company (Simpala Tech Pvt Ltd)"
    Write-Host "  - 3 admin users + 20 employees"
    Write-Host "  - 3 leave types (Annual, Casual, Medical)"
    Write-Host "  - ~1300 attendance records (past 3 months)"
    Write-Host "  - 40 payslips (2 months for all employees)"
    Write-Host ""
    Write-Host "Login credentials:" -ForegroundColor Cyan
    Write-Host "  Owner: owner@simpala.lk / password123"
    Write-Host "  Admin: admin@simpala.lk / password123"
    Write-Host "  HR: hr@simpala.lk / password123"
    Write-Host "  Employee: kasun.fernando0@simpala.lk / password123"
    Write-Host ""
    Write-Host "You can now test payslip generation!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Seed job failed. Check logs above." -ForegroundColor Red
    exit 1
}
