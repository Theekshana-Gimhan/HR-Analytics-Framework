This folder contains a Cloud Run Job manifest to inspect the development Postgres database.

Files:
- `job.yaml` - Cloud Run Job manifest (`dbg-inspect-db`) that runs the backend debug image and prints:
  - information_schema columns for `User` (detects casing)
  - constraints mentioning `companyid`
  - sample rows from `User` and `Company`

How to run (Cloud Code / gcloud / Cloud Shell):

Option A - using gcloud (Cloud Shell recommended):
1. Open Cloud Shell in the GCP Console.
2. From the repository root, apply the job manifest:

```bash
# optional: edit the manifest if you need a different image tag or secret
gcloud run jobs replace ops/db-inspect/job.yaml --region=us-central1 --project=long-operator-466309-g6
# execute the job and wait for it to complete
gcloud run jobs execute dbg-inspect-db --region=us-central1 --project=long-operator-466309-g6 --wait
# view the job logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=dbg-inspect-db" --project=long-operator-466309-g6 --limit=200 --order=desc
```

Option B - Cloud Code for VS Code
- Install the Cloud Code extension in VS Code and sign in to your GCP account.
- Open this folder in VS Code, open `ops/db-inspect/job.yaml`, and use Cloud Code's "Run Job" or "Deploy Job" UI action.

Notes:
- The job uses the secret `dev-database-url` and the VPC connector `simpala-vpc-connector`.
- The job is read-only and safe (SELECTs only). It will print the results to stdout which Cloud Logging will capture.

If you'd like, I can run this job now from here (I already prepared the manifest). Otherwise, run the commands above in Cloud Shell and paste the logs here and I'll analyze them.