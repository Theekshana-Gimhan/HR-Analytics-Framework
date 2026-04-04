# Quick Development Deployment Script
# Directly builds and deploys Cloud Run services without GitHub workflows

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('backend', 'frontend', 'both')]
    [string]$Service = 'both',

    [Parameter(Mandatory = $false)]
    [ValidateSet('local', 'cloud-build')]
    [string]$BuildStrategy = 'local'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path 'backend/Dockerfile')) {
    throw 'Run this script from the repository root (backend/Dockerfile not found).'
}

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH. Install $Name and try again."
    }
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter()][string[]]$Arguments = @(),
        [switch]$Quiet
    )

    $output = & $Command @Arguments
    if (-not $Quiet) {
        $output | ForEach-Object { Write-Output $_ }
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Command '$Command $($Arguments -join ' ')' failed with exit code $LASTEXITCODE."
    }
}

Assert-Command -Name 'gcloud'
if ($BuildStrategy -eq 'local') {
    Assert-Command -Name 'docker'
}

$PROJECT_ID = (gcloud config get-value project 2>$null).Trim()
if (-not $PROJECT_ID) {
    throw 'No active GCP project found. Run `gcloud config set project <project-id>` first.'
}

$REGION = 'us-central1'
$ARTIFACT_REGISTRY = 'us-central1-docker.pkg.dev'
$BACKEND_IMAGE = "$ARTIFACT_REGISTRY/$PROJECT_ID/simpalahr/simpalahr-backend-dev:latest"
$FRONTEND_IMAGE = "$ARTIFACT_REGISTRY/$PROJECT_ID/simpalahr/simpalahr-frontend-dev:latest"
$BACKEND_SERVICE = 'simpalahr-backend-dev'
$FRONTEND_SERVICE = 'simpalahr-frontend-dev'

Write-Host "Using project: $PROJECT_ID" -ForegroundColor Gray
Write-Host "Build strategy: $BuildStrategy" -ForegroundColor Gray
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Quick Dev Deployment to Cloud Run' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

function Invoke-DockerBuild {
    param(
        [Parameter(Mandatory = $true)][string]$Dockerfile,
        [Parameter(Mandatory = $true)][string]$Image,
        [Parameter()][hashtable]$BuildArgs
    )

    if ($BuildStrategy -eq 'cloud-build') {
        if ($Dockerfile -like "*backend*") {
            Write-Host "Using ops/cloudbuild-backend-dev.yaml for backend build..." -ForegroundColor Cyan
            $gcloudArgs = @('builds', 'submit', '.', '--config', 'ops/cloudbuild-backend-dev.yaml', '--project', $PROJECT_ID)
            # Note: Substitutions are hardcoded in the yaml for now to match previous behavior
        }
        elseif ($Dockerfile -like "*frontend*") {
            Write-Host "Using ops/cloudbuild-frontend.yaml for frontend build..." -ForegroundColor Cyan
            $gcloudArgs = @('builds', 'submit', '.', '--config', 'ops/cloudbuild-frontend.yaml', '--project', $PROJECT_ID)
        }
        else {
            Write-Warning "Cloud build config not found for $Dockerfile. Trying default submission (may fail if Dockerfile is not in root)..."
            $gcloudArgs = @('builds', 'submit', '.', '--tag', $Image, '--project', $PROJECT_ID, '--region', $REGION)
        }
        
        Invoke-ExternalCommand -Command 'gcloud' -Arguments $gcloudArgs -Quiet:$false
        return
    }

    Invoke-ExternalCommand -Command 'gcloud' -Arguments @('auth', 'configure-docker', $ARTIFACT_REGISTRY, '-q') -Quiet

    $buildArgsList = @('build', '-t', $Image, '-f', $Dockerfile)
    if ($BuildArgs) {
        foreach ($key in $BuildArgs.Keys) {
            $buildArgsList += @('--build-arg', "$key=$($BuildArgs[$key])")
        }
    }
    $buildArgsList += '.'

    Write-Host "docker $($buildArgsList -join ' ')" -ForegroundColor DarkGray
    Invoke-ExternalCommand -Command 'docker' -Arguments $buildArgsList -Quiet

    Invoke-ExternalCommand -Command 'docker' -Arguments @('push', $Image) -Quiet
}

function Invoke-BackendDeployment {
    Write-Host '📦 Building backend image...' -ForegroundColor Yellow
    Invoke-DockerBuild -Dockerfile 'backend/Dockerfile' -Image $BACKEND_IMAGE

    Write-Host '🚀 Deploying backend to Cloud Run...' -ForegroundColor Yellow
    $deployArgs = @(
        'run', 'deploy', $BACKEND_SERVICE,
        '--image', $BACKEND_IMAGE,
        '--platform', 'managed',
        '--region', $REGION,
        '--project', $PROJECT_ID,
        '--allow-unauthenticated',
        '--set-env-vars', 'NODE_ENV=production',
        '--update-secrets', 'DATABASE_URL=dev-database-url:latest,JWT_SECRET=jwt-secret:latest',
        '--memory', '512Mi',
        '--cpu', '1',
        '--min-instances', '0',
        '--max-instances', '10',
        '--timeout', '300',
        '--vpc-connector', 'simpala-vpc-connector',
        '--vpc-egress', 'all-traffic',
        '--cpu-boost',
        '--no-cpu-throttling'
    )

    Invoke-ExternalCommand -Command 'gcloud' -Arguments $deployArgs

    Write-Host '✅ Backend deployed successfully!' -ForegroundColor Green
}

function Invoke-FrontendDeployment {
    Write-Host '📦 Building frontend image...' -ForegroundColor Yellow
    $buildArgs = @{ VITE_API_BASE_URL = 'https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1' }
    Invoke-DockerBuild -Dockerfile 'frontend/Dockerfile' -Image $FRONTEND_IMAGE -BuildArgs $buildArgs

    Write-Host '🚀 Deploying frontend to Cloud Run...' -ForegroundColor Yellow
    $frontendArgs = @(
        'run', 'deploy', $FRONTEND_SERVICE,
        '--image', $FRONTEND_IMAGE,
        '--platform', 'managed',
        '--region', $REGION,
        '--project', $PROJECT_ID,
        '--allow-unauthenticated',
        '--memory', '256Mi',
        '--cpu', '1',
        '--min-instances', '0',
        '--max-instances', '10',
        '--timeout', '60'
    )

    Invoke-ExternalCommand -Command 'gcloud' -Arguments $frontendArgs

    Write-Host '✅ Frontend deployed successfully!' -ForegroundColor Green
}

$startTime = Get-Date

try {
    switch ($Service) {
        'backend' { Invoke-BackendDeployment }
        'frontend' { Invoke-FrontendDeployment }
        default {
            Invoke-BackendDeployment
            Invoke-FrontendDeployment
        }
    }
}
catch {
    Write-Host ''
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    throw
}

$duration = (Get-Date) - $startTime

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Deployment Summary' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan

if ($Service -eq 'backend' -or $Service -eq 'both') {
    Write-Host 'Backend:  ✅ SUCCESS' -ForegroundColor Green
    Write-Host 'URL:      https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app' -ForegroundColor Cyan
}

if ($Service -eq 'frontend' -or $Service -eq 'both') {
    Write-Host 'Frontend: ✅ SUCCESS' -ForegroundColor Green
    Write-Host 'URL:      https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app' -ForegroundColor Cyan
}

Write-Host "Duration: $([math]::Round($duration.TotalMinutes, 2)) minutes" -ForegroundColor Yellow
Write-Host ''
