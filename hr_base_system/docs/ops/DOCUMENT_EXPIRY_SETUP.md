# Document Expiry Alert System - Operations Guide

The Simpala HR system includes an automated job to check for expiring employee documents (e.g., Visas, Driving Licenses) and send email notifications.

## Overview

- **Endpoint**: `POST /jobs/check-expiry`
- **Security**: Protected by `x-job-secret` header.
- **Frequency**: Recommended to run daily (e.g., at 09:00 AM).

## Deployment Instructions

To enable this feature in a production environment (Google Cloud Run), you must configure a **Cloud Scheduler** job.

### 1. Prerequisites
- The backend service must be deployed and accessible.
- You must have the `JOB_SECRET` environment variable set in your Cloud Run service configuration.
    - *Default (Dev)*: `dev-secret` (Do not use in production!)
    - *Production*: Generate a strong random string (e.g., `openssl rand -hex 32`).

### 2. Configure Cloud Scheduler

Run the following gcloud command to create the scheduler job:

```bash
gcloud scheduler jobs create http document-expiry-check \
  --schedule="0 9 * * *" \
  --uri="https://<YOUR-BACKEND-URL>/jobs/check-expiry" \
  --http-method="POST" \
  --headers="x-job-secret=<YOUR_JOB_SECRET>" \
  --location="us-central1" \
  --attempt-deadline="300s"
```

Replace:
- `<YOUR-BACKEND-URL>`: The actual URL of your deployed backend service.
- `<YOUR_JOB_SECRET>`: The secret key configured in your backend environment variables.

### 3. Verification

You can manually trigger the job to verify it works:

```bash
gcloud scheduler jobs run document-expiry-check --location="us-central1"
```

Check the logs in Cloud Run to confirm the job executed successfully:
- *Log Message*: "Document expiry check completed"
- *Summary*: `{ expiringFound: X, expiredFound: Y, emailsSent: Z, errors: 0 }`

## Troubleshooting

- **401 Unauthorized**: Ensure the `x-job-secret` header matches the `JOB_SECRET` environment variable.
- **No Emails Sent**: 
    - Verify `WORKSPACE_EMAIL` and `WORKSPACE_SMTP_PASSWORD` are set correctly.
    - Check if valid documents exist with expiry dates within the 30-day window.
