<#
.SYNOPSIS
    Quick Deploy script for Simpala HR development environment.
    
.DESCRIPTION
    Deploys backend and/or frontend to Cloud Run using Cloud Build (no local Docker required).
    Uses gcloud run deploy --source which uploads source and builds in the cloud.

.PARAMETER Service
    Which service to deploy: 'backend', 'frontend', or 'both' (default)

.EXAMPLE
    .\quick-deploy.ps1
    # Deploys both backend and frontend

.EXAMPLE
    .\quick-deploy.ps1 -Service backend
    # Deploys only the backend

.EXAMPLE
    .\quick-deploy.ps1 -Service frontend
    # Deploys only the frontend
#>

param(
    [ValidateSet('backend', 'frontend', 'both')]
    [string]$Service = 'both'
)

# Configuration
$PROJECT_ID = "long-operator-466309-g6"
$REGION = "us-central1"
$BACKEND_SERVICE = "simpalahr-backend-dev"
$FRONTEND_SERVICE = "simpalahr-frontend-dev"

# Paths
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_PATH = Join-Path $SCRIPT_DIR "backend"
$FRONTEND_PATH = Join-Path $SCRIPT_DIR "frontend"

# Colors for output
function Write-Header { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Yellow }

# Check gcloud authentication
function Test-GCloudAuth {
    Write-Info "Checking gcloud authentication..."
    $account = gcloud config get-value account 2>$null
    if (-not $account) {
        Write-Error "Not authenticated. Run: gcloud auth login"
        exit 1
    }
    Write-Success "Authenticated as $account"
}

# Deploy a service using Cloud Build
function Deploy-Service {
    param(
        [string]$ServiceName,
        [string]$SourcePath,
        [string]$DisplayName
    )

    Write-Header "Deploying $DisplayName"
    
    if (-not (Test-Path $SourcePath)) {
        Write-Error "Source path not found: $SourcePath"
        return $false
    }

    Write-Info "Source: $SourcePath"
    Write-Info "This will take 5-7 minutes..."

    $startTime = Get-Date
    
    # Deploy using Cloud Build
    gcloud run deploy $ServiceName `
        --source=$SourcePath `
        --project=$PROJECT_ID `
        --region=$REGION `
        --allow-unauthenticated `
        --quiet

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Deployment failed for $DisplayName"
        return $false
    }

    $elapsed = (Get-Date) - $startTime
    Write-Success "$DisplayName deployed in $($elapsed.Minutes)m $($elapsed.Seconds)s"
    
    # Get and display the URL
    $url = gcloud run services describe $ServiceName --project=$PROJECT_ID --region=$REGION --format="value(status.url)" 2>$null
    if ($url) {
        Write-Host "URL: $url" -ForegroundColor Magenta
    }
    
    return $true
}

# Main execution
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   Simpala HR Quick Deploy" -ForegroundColor Cyan
Write-Host "   Project: $PROJECT_ID | Region: $REGION" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Check authentication
Test-GCloudAuth

# Set project
gcloud config set project $PROJECT_ID 2>$null

$success = $true
$startTotal = Get-Date

# Deploy based on service parameter
switch ($Service) {
    'backend' {
        $success = Deploy-Service -ServiceName $BACKEND_SERVICE -SourcePath $BACKEND_PATH -DisplayName "Backend"
    }
    'frontend' {
        $success = Deploy-Service -ServiceName $FRONTEND_SERVICE -SourcePath $FRONTEND_PATH -DisplayName "Frontend"
    }
    'both' {
        $backendSuccess = Deploy-Service -ServiceName $BACKEND_SERVICE -SourcePath $BACKEND_PATH -DisplayName "Backend"
        $frontendSuccess = Deploy-Service -ServiceName $FRONTEND_SERVICE -SourcePath $FRONTEND_PATH -DisplayName "Frontend"
        $success = $backendSuccess -and $frontendSuccess
    }
}

$totalElapsed = (Get-Date) - $startTotal

Write-Host "`n============================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "   Deployment Complete! ($($totalElapsed.Minutes)m $($totalElapsed.Seconds)s)" -ForegroundColor Green
    Write-Host "`n   Backend:  https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app" -ForegroundColor White
    Write-Host "   Frontend: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app" -ForegroundColor White
} else {
    Write-Host "   Deployment Failed" -ForegroundColor Red
    exit 1
}
Write-Host "============================================`n" -ForegroundColor Cyan
