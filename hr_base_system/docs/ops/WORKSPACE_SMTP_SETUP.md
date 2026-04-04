# Google Workspace SMTP Setup Guide

This document provides step-by-step instructions for configuring Google Workspace SMTP for Simpala HR email notifications.

---

## Prerequisites

- Google Workspace account (Basic or higher)
- Admin access to Google Workspace Admin Console
- GCP project (`long-operator-466309-g6`)
- A dedicated email address for sending (e.g., `noreply@yourdomain.com`)

---

## Step 1: Configure SMTP Relay in Google Workspace

1. **Open Admin Console**:
   - Go to https://admin.google.com
   - Sign in with your Workspace admin account

2. **Navigate to SMTP Relay**:
   ```
   Apps â†’ Google Workspace â†’ Gmail â†’ Routing â†’ SMTP relay service
   ```

3. **Add SMTP Relay Configuration**:
   - Click "ADD ANOTHER" or "CONFIGURE"
   - **Allowed senders**: Select "Only registered App users"
   - **Authentication**: Check "Require SMTP authentication"
   - **Encryption**: Check "Require TLS encryption"
   - **IP Ranges** (optional): Leave empty to use authentication instead
   - Click "SAVE"

---

## Step 2: Create App Password

1. **Go to Google Account Security**:
   - Visit https://myaccount.google.com/security
   - Sign in with the email account you'll use (e.g., `noreply@yourdomain.com`)

2. **Enable 2-Step Verification** (if not already enabled):
   - Click "2-Step Verification"
   - Follow the setup process

3. **Generate App Password**:
   - Go back to Security â†’ "App passwords"
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter name: **Simpala HR Backend**
   - Click "GENERATE"
   - **Copy the 16-character password** (you'll need this for Secret Manager)

---

## Step 3: Add Secrets to GCP Secret Manager

```bash
# Create WORKSPACE_EMAIL secret
echo -n "noreply@yourdomain.com" | gcloud secrets create workspace-email \
  --data-file=- \
  --replication-policy=automatic \
  --project=long-operator-466309-g6

# Create WORKSPACE_SMTP_PASSWORD secret
echo -n "YOUR_16_CHAR_APP_PASSWORD" | gcloud secrets create workspace-smtp-password \
  --data-file=- \
  --replication-policy=automatic \
  --project=long-operator-466309-g6

# Create FRONTEND_URL secret (if not exists)
echo -n "https://simpalahr-frontend-dev-85939737092.us-central1.run.app" | gcloud secrets create frontend-url \
  --data-file=- \
  --replication-policy=automatic \
  --project=long-operator-466309-g6

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding workspace-email \
  --member=serviceAccount:github-actions-dev@long-operator-466309-g6.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding workspace-smtp-password \
  --member=serviceAccount:github-actions-dev@long-operator-466309-g6.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding frontend-url \
  --member=serviceAccount:github-actions-dev@long-operator-466309-g6.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## Step 4: Update Cloud Run Deployment Configuration

The `deploy-dev.yml` workflow needs to be updated to include the new secrets:

```yaml
# In .github/workflows/deploy-dev.yml
# Update the backend deployment step:

--set-env-vars NODE_ENV=production \
--update-secrets DATABASE_URL=dev-database-url:latest,\
                 JWT_SECRET=jwt-secret:latest,\
                 WORKSPACE_EMAIL=workspace-email:latest,\
                 WORKSPACE_SMTP_PASSWORD=workspace-smtp-password:latest,\
                 FRONTEND_URL=frontend-url:latest
```

---

## Step 5: Deploy to Dev Environment

```bash
# Commit and push changes
git add .
git commit -m "feat: implement email notifications with Google Workspace SMTP"
git push origin dev
```

The GitHub Actions workflow will:
1. Build backend with email service
2. Deploy to Cloud Run with new secrets
3. Run migrations
4. Deploy frontend

---

## Step 6: Test Email Sending

### Test Password Reset Email

```bash
curl -X POST https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@simpala.lk"}'
```

**Expected**: Email sent to `owner@simpala.lk` with password reset link

### Test Leave Request Email

1. Log in to the frontend
2. Apply for leave
3. **Expected**: Email sent to employee confirming leave request

### Test Leave Approval Email

1. Log in as admin
2. Approve a leave request
3. **Expected**: Email sent to employee with approval notification

---

## Troubleshooting

### Email Not Sending

1. **Check Secret Manager values**:
   ```bash
   gcloud secrets versions access latest --secret=workspace-email
   gcloud secrets versions access latest --secret=workspace-smtp-password
   ```

2. **Check Cloud Run logs**:
   ```bash
   gcloud run services logs read simpalahr-backend-dev \
     --region=us-central1 \
     --limit=50 \
     --project=long-operator-466309-g6
   ```

3. **Verify SMTP settings**:
   - Host: `smtp-relay.gmail.com`
   - Port: `587`
   - TLS: Enabled

### "Authentication Failed" Error

- Ensure 2-Step Verification is enabled
- Regenerate app password
- Update secret in Secret Manager

### Emails Going to Spam

- Configure SPF record for your domain:
  ```
  v=spf1 include:_spf.google.com ~all
  ```
- Configure DKIM in Google Workspace

---

## Email Sending Limits

| Plan | Daily Limit |
|------|-------------|
| Google Workspace SMTP | 2,000 emails/day |
| Current Usage (estimated) | ~50 emails/day |

**Recommendation**: Current limit is sufficient. Monitor usage and scale to SendGrid only if approaching 1,500 emails/day.

---

## Security Best Practices

1. âœ… Use app passwords (not account password)
2. âœ… Store credentials in Secret Manager
3. âœ… Use TLS encryption
4. âœ… Limit sender to registered users only
5. âš ï¸ **TODO**: Add SPF/DKIM records for better deliverability

