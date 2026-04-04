# Simple Local Docker Build & Deploy
# Fastest for development - builds locally then deploys

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backend", "frontend", "both")]
    [string]$Service = "both"
)

$PROJECT_ID = (gcloud config get-value project 2>$null).Trim()
$REGION = "us-central1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Simple Dev Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

# Backend
if ($Service -eq "backend" -or $Service -eq "both") {
    Write-Host "📦 Building Backend..." -ForegroundColor Yellow
    
    $BACKEND_IMAGE = "gcr.io/$PROJECT_ID/simpalahr-backend-dev:latest"
    
    # Build from root with backend Dockerfile
    docker build -t $BACKEND_IMAGE -f backend/Dockerfile .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⬆️  Pushing Backend Image..." -ForegroundColor Yellow
        docker push $BACKEND_IMAGE
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "🚀 Deploying Backend..." -ForegroundColor Yellow
            gcloud run deploy simpalahr-backend-dev `
                --image=$BACKEND_IMAGE `
                --platform=managed `
                --region=$REGION `
                --allow-unauthenticated `
                --set-env-vars="NODE_ENV=production" `
                --memory=512Mi `
                --cpu=1 `
                --max-instances=10 `
                --timeout=300
            
            $backendSuccess = $LASTEXITCODE -eq 0
        } else {
            Write-Host "❌ Backend push failed!" -ForegroundColor Red
            $backendSuccess = $false
        }
    } else {
        Write-Host "❌ Backend build failed!" -ForegroundColor Red
        $backendSuccess = $false
    }
    Write-Host ""
}

# Frontend
if ($Service -eq "frontend" -or $Service -eq "both") {
    Write-Host "📦 Building Frontend..." -ForegroundColor Yellow
    
    $FRONTEND_IMAGE = "gcr.io/$PROJECT_ID/simpalahr-frontend-dev:latest"
    
    # Build from root with frontend Dockerfile
    docker build -t $FRONTEND_IMAGE `
        -f frontend/Dockerfile `
        --build-arg VITE_API_BASE_URL=https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1 `
        .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⬆️  Pushing Frontend Image..." -ForegroundColor Yellow
        docker push $FRONTEND_IMAGE
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "🚀 Deploying Frontend..." -ForegroundColor Yellow
            gcloud run deploy simpalahr-frontend-dev `
                --image=$FRONTEND_IMAGE `
                --platform=managed `
                --region=$REGION `
                --allow-unauthenticated `
                --memory=256Mi `
                --cpu=1 `
                --max-instances=10 `
                --timeout=60
            
            $frontendSuccess = $LASTEXITCODE -eq 0
        } else {
            Write-Host "❌ Frontend push failed!" -ForegroundColor Red
            $frontendSuccess = $false
        }
    } else {
        Write-Host "❌ Frontend build failed!" -ForegroundColor Red
        $frontendSuccess = $false
    }
    Write-Host ""
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Service -eq "backend" -or $Service -eq "both") {
    if ($backendSuccess) {
        Write-Host "Backend:  ✅ SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "Backend:  ❌ FAILED" -ForegroundColor Red
    }
}

if ($Service -eq "frontend" -or $Service -eq "both") {
    if ($frontendSuccess) {
        Write-Host "Frontend: ✅ SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "Frontend: ❌ FAILED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Duration: $($duration.TotalMinutes.ToString('0.00')) minutes" -ForegroundColor Yellow
Write-Host "Backend:  https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app" -ForegroundColor Cyan
Write-Host "Frontend: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app" -ForegroundColor Cyan
Write-Host ""
