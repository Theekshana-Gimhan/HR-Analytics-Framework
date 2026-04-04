# Ultra-Fast Development Deployment
# Uses Cloud Build to build and deploy in one command (5-7 minutes)

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backend", "frontend", "both")]
    [string]$Service = "both"
)

# Get current project from gcloud config
$PROJECT_ID = (gcloud config get-value project 2>$null).Trim()
$REGION = "us-central1"

Write-Host "Using project: $PROJECT_ID" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚡ ULTRA-FAST Dev Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Using Cloud Build for faster deployment" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

# Deploy Backend
if ($Service -eq "backend" -or $Service -eq "both") {
    Write-Host "🚀 Deploying Backend (Cloud Build)..." -ForegroundColor Yellow
    Write-Host "Building from monorepo root with backend Dockerfile..." -ForegroundColor Gray
    
    $BACKEND_IMAGE = "gcr.io/$PROJECT_ID/simpalahr-backend-dev:latest"
    
    # Submit build with config file
    gcloud builds submit . `
        --config=cloudbuild-backend.yaml `
        --project=$PROJECT_ID `
        --region=$REGION
    
    $buildSuccess = $LASTEXITCODE -eq 0
    
    if ($buildSuccess) {
        Write-Host "✅ Build successful, deploying..." -ForegroundColor Green
        
        # Get the frontend URL for CORS (use the new URL format)
        $FRONTEND_URL = "https://simpalahr-frontend-dev-85939737092.us-central1.run.app"
        
        gcloud run deploy simpalahr-backend-dev `
            --image=$BACKEND_IMAGE `
            --platform=managed `
            --region=$REGION `
            --project=$PROJECT_ID `
            --allow-unauthenticated `
            --set-env-vars="NODE_ENV=production,CORS_ORIGIN=$FRONTEND_URL" `
            --memory=512Mi `
            --cpu=1 `
            --max-instances=10 `
            --timeout=300
        
        $backendSuccess = $LASTEXITCODE -eq 0
    } else {
        $backendSuccess = $false
    }
    
    if ($backendSuccess) {
        Write-Host "✅ Backend deployed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend failed!" -ForegroundColor Red
    }
    Write-Host ""
}

# Deploy Frontend
if ($Service -eq "frontend" -or $Service -eq "both") {
    Write-Host "🚀 Deploying Frontend (Cloud Build)..." -ForegroundColor Yellow
    Write-Host "Building from monorepo root with frontend Dockerfile..." -ForegroundColor Gray
    
    $FRONTEND_IMAGE = "gcr.io/$PROJECT_ID/simpalahr-frontend-dev:latest"
    
    # Submit build with config file
    gcloud builds submit . `
        --config=cloudbuild-frontend.yaml `
        --project=$PROJECT_ID `
        --region=$REGION
    
    $buildSuccess = $LASTEXITCODE -eq 0
    
    if ($buildSuccess) {
        Write-Host "✅ Build successful, deploying..." -ForegroundColor Green
        
        gcloud run deploy simpalahr-frontend-dev `
            --image=$FRONTEND_IMAGE `
            --platform=managed `
            --region=$REGION `
            --project=$PROJECT_ID `
            --allow-unauthenticated `
            --memory=256Mi `
            --cpu=1 `
            --max-instances=10 `
            --timeout=60
        
        $frontendSuccess = $LASTEXITCODE -eq 0
    } else {
        $frontendSuccess = $false
    }
    
    if ($frontendSuccess) {
        Write-Host "✅ Frontend deployed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend failed!" -ForegroundColor Red
    }
    Write-Host ""
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚡ Deployment Complete!" -ForegroundColor Cyan
Write-Host "Duration: $($duration.TotalMinutes.ToString('0.00')) minutes" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  https://simpalahr-backend-dev-85939737092.us-central1.run.app" -ForegroundColor Cyan
Write-Host "Frontend: https://simpalahr-frontend-dev-85939737092.us-central1.run.app" -ForegroundColor Cyan
Write-Host ""
