# Seed Database Script
# This creates a Cloud Run job to seed the production database with initial admin users

Write-Host "🚀 Creating Cloud Run job to seed the database..." -ForegroundColor Cyan
Write-Host ""

# Create seeding job
gcloud run jobs create seed-database `
  --image=us-central1-docker.pkg.dev/long-operator-466309-g6/simpalahr/simpalahr-backend-dev:latest `
  --region=us-central1 `
  --project=long-operator-466309-g6 `
  --vpc-connector=simpala-vpc-connector `
  --vpc-egress=all-traffic `
  --update-secrets=DATABASE_URL=DEV_DATABASE_URL:latest `
  --command="npm" `
  --args="run,seed" `
  --max-retries=0 `
  --task-timeout=120s

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Job created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Executing seed job..." -ForegroundColor Cyan
    
    # Execute the job
    gcloud run jobs execute seed-database `
      --region=us-central1 `
      --project=long-operator-466309-g6 `
      --wait
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Database seeding completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📧 You can now login with these credentials:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Option 1 (Owner/CEO):" -ForegroundColor White
        Write-Host "   Email: owner@simpala.lk" -ForegroundColor Cyan
        Write-Host "   Password: password123" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   Option 2 (Admin):" -ForegroundColor White
        Write-Host "   Email: admin@simpala.lk" -ForegroundColor Cyan
        Write-Host "   Password: password123" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   Option 3 (HR Manager):" -ForegroundColor White
        Write-Host "   Email: hr@simpala.lk" -ForegroundColor Cyan
        Write-Host "   Password: password123" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🌐 Frontend URL: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app" -ForegroundColor Green
        Write-Host "🔗 Backend URL: https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to execute seed job" -ForegroundColor Red
        Write-Host "Check logs with: gcloud run jobs executions list --job=seed-database --region=us-central1" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to create seed job" -ForegroundColor Red
}
