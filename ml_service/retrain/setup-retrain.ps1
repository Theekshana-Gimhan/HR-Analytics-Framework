<#
.SYNOPSIS
    Provision the monthly retrain automation (Cloud Run Job + Cloud Scheduler).

.DESCRIPTION
    Scaffold for automated retraining. NOTE: until the Dialogflow Pulse Check
    feeds fresh survey responses into the pipeline, each run reproduces the same
    model from the committed CSVs. This wires up the loop so live data drops in.

    Steps (all idempotent):
      1. Stage scripts/ + committed data CSVs into this folder for the build.
      2. Enable the Cloud Scheduler API.
      3. Create the retrain runtime SA + grant it write on the model bucket.
      4. Build the retrain image (regional Cloud Build).
      5. Create/update the Cloud Run Job.
      6. Create the scheduler SA + grant it invoke rights on the job.
      7. Create the monthly Cloud Scheduler trigger.
#>

$ErrorActionPreference = "Stop"

$PROJECT    = "kpi-uat"
$REGION     = "us-central1"
$BUCKET     = "kpi-uat-simpalahr-ml"
$JOB        = "simpalahr-ml-retrain"
$IMAGE      = "us-central1-docker.pkg.dev/kpi-uat/simpalahr/simpalahr-ml-retrain:latest"
$RETRAIN_SA = "simpalahr-ml-retrain@kpi-uat.iam.gserviceaccount.com"
$SCHED_SA   = "simpalahr-ml-scheduler@kpi-uat.iam.gserviceaccount.com"
$STAGE_BKT  = "gs://kpi-uat_us-central1_cloudbuild/source"

$DIR      = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO     = Join-Path $DIR "..\.."
$STAGE_S  = Join-Path $DIR "scripts"
$STAGE_D  = Join-Path $DIR "data"

Write-Host "=== 1. Stage build context ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $STAGE_S, $STAGE_D | Out-Null
Copy-Item (Join-Path $REPO "scripts\*.py") $STAGE_S -Force
foreach ($f in @("nexus_hr_master_dataset.csv", "validation_srilanka.csv")) {
    Copy-Item (Join-Path $REPO "data\$f") (Join-Path $STAGE_D $f) -Force
}
Write-Host "  staged scripts + data CSVs"

Write-Host "`n=== 2. Enable Cloud Scheduler API ===" -ForegroundColor Cyan
gcloud services enable cloudscheduler.googleapis.com --project $PROJECT

Write-Host "`n=== 3. Retrain runtime SA + bucket write ===" -ForegroundColor Cyan
if (-not (gcloud iam service-accounts list --project $PROJECT --filter="email:$RETRAIN_SA" --format="value(email)")) {
    gcloud iam service-accounts create simpalahr-ml-retrain --project $PROJECT --display-name "NexusHR ML retrain job"
}
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member "serviceAccount:$RETRAIN_SA" --role "roles/storage.objectAdmin" --project $PROJECT | Out-Null

Write-Host "`n=== 4. Build retrain image (regional) ===" -ForegroundColor Cyan
gcloud builds submit $DIR --tag $IMAGE --project $PROJECT --region $REGION --gcs-source-staging-dir $STAGE_BKT
if ($LASTEXITCODE -ne 0) { throw "Cloud Build failed" }

Write-Host "`n=== 5. Create/update Cloud Run Job ===" -ForegroundColor Cyan
gcloud run jobs deploy $JOB `
    --image $IMAGE `
    --project $PROJECT `
    --region $REGION `
    --service-account $RETRAIN_SA `
    --memory 2Gi `
    --cpu 2 `
    --max-retries 1 `
    --task-timeout 1800

Write-Host "`n=== 6. Scheduler SA + invoke rights ===" -ForegroundColor Cyan
if (-not (gcloud iam service-accounts list --project $PROJECT --filter="email:$SCHED_SA" --format="value(email)")) {
    gcloud iam service-accounts create simpalahr-ml-scheduler --project $PROJECT --display-name "NexusHR ML retrain scheduler"
}
gcloud run jobs add-iam-policy-binding $JOB --project $PROJECT --region $REGION --member "serviceAccount:$SCHED_SA" --role "roles/run.invoker" | Out-Null

Write-Host "`n=== 7. Monthly Cloud Scheduler trigger ===" -ForegroundColor Cyan
$uri = "https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT/jobs/$JOB`:run"
$exists = gcloud scheduler jobs list --project $PROJECT --location $REGION --filter="name~$JOB-monthly" --format="value(name)"
if ($exists) {
    gcloud scheduler jobs update http "$JOB-monthly" --project $PROJECT --location $REGION --schedule "0 2 1 * *" --time-zone "Asia/Colombo" --uri $uri --http-method POST --oauth-service-account-email $SCHED_SA
} else {
    gcloud scheduler jobs create http "$JOB-monthly" --project $PROJECT --location $REGION --schedule "0 2 1 * *" --time-zone "Asia/Colombo" --uri $uri --http-method POST --oauth-service-account-email $SCHED_SA
}

Write-Host "`n[OK] Retrain automation provisioned." -ForegroundColor Green
Write-Host "Run once now:  gcloud run jobs execute $JOB --region $REGION --project $PROJECT"
