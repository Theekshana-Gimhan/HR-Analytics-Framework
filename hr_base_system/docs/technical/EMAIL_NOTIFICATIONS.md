# Email Notification Setup

Simpala HR supports email notifications for password resets and leave management workflows.

## Quick Start

The email notification system uses **Google Workspace SMTP** and includes graceful degradation - the app works perfectly even without email configuration.

## Setup Guide

ðŸ“– **Complete setup instructions**: [WORKSPACE_SMTP_SETUP.md](./WORKSPACE_SMTP_SETUP.md)

## Features

âœ… **Password Reset Emails**
- Secure token-based reset links
- 1-hour expiration
- Responsive HTML template

âœ… **Leave Notifications**
- Request submission confirmation
- Approval notifications
- Rejection notifications with optional reason

## Current Status

**Email service is optional** - All features work without SMTP configuration:
- Password reset generates tokens correctly
- Leave workflows function normally
- Emails are logged as warnings in the server logs

To enable email sending:
1. Follow the [WORKSPACE_SMTP_SETUP.md](./WORKSPACE_SMTP_SETUP.md) guide
2. Configure secrets in GCP Secret Manager
3. Redeploy - emails will automatically start sending

## Cost

**$0** - Uses existing Google Workspace subscription
- Limit: 2,000 emails/day
- Current usage: ~50 emails/day

## Testing

Once configured, test with:
```bash
# Password reset email
curl -X POST https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'
```

Then apply for leave via the UI to test leave notifications.

