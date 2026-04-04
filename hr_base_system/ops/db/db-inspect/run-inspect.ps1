# PowerShell helper to deploy and run the dbg-inspect-db job using gcloud
param()

# Create the job via gcloud using YAML by uploading the file content to the server
# Workaround: use gcloud beta run jobs replace --source is not available on this
# gcloud version in this environment, so we'll create the job using the REST API.

$project = 'long-operator-466309-g6'
$region = 'us-central1'
$jobName = 'dbg-inspect-db'
$yamlPath = 'd:/HR/ops/db-inspect/job.yaml'

Write-Host "Deploying job from $yamlPath to project $project region $region..."

# Use gcloud beta run jobs replace with the file content via stdin
# The gcloud CLI may not support --source; we will use 'gcloud beta run jobs replace -' and pipe the file content.
Get-Content $yamlPath -Raw | gcloud beta run jobs replace --region=$region --project=$project -

Write-Host 'Job deployed. Executing job...'
$exec = gcloud run jobs execute $jobName --region=$region --project=$project --wait --format=json
Write-Host 'Execution result:'
Write-Host $exec

# Fetch logs
$logsFile = 'd:/HR/db_inspect_logs.json'
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=$jobName" --project=$project --limit=500 --order=desc --format=json > $logsFile
Write-Host "Logs written to $logsFile"
Get-Content $logsFile -Raw | Out-Host
