# GitHub Secrets Configuration

## Required Secrets for Deployment

Configure these secrets in your GitHub repository before deploying.

**Path**: Settings â†’ Secrets and variables â†’ Actions â†’ New repository secret

---

## Development Environment Secrets

### DEV_DATABASE_URL
**Description**: PostgreSQL database connection string for development  
**Format**: `postgresql://username:password@host:port/database?schema=public`  
**Example**: `postgresql://dev_user:dev_pass@db-dev.example.com:5432/simpalahr_dev?schema=public`

### DEV_JWT_SECRET
**Description**: Secret key for signing JWT tokens (minimum 32 characters)  
**Generate**:
```bash
openssl rand -base64 32
```
**Example**: `Yk8vP2mN5rJ9sK3dF7gH1qW6tX0aZ4bC8eL2nM3oP5`

### DEV_BACKEND_URL (Optional)
**Description**: Full URL to the backend API including /api/v1  
**Format**: `https://{service-name}.run.app/api/v1`  
**Example**: `https://simpalahr-backend-dev-abc123.run.app/api/v1`  
**Note**: If not set, frontend will use a placeholder URL

---

## Production Environment Secrets

### PROD_DATABASE_URL
**Description**: PostgreSQL database connection string for production  
**Format**: `postgresql://username:password@host:port/database?schema=public`  
**Example**: `postgresql://prod_user:prod_pass@db-prod.example.com:5432/simpalahr_prod?schema=public`  
**âš ï¸ Important**: Use a strong password and restrict network access

### PROD_JWT_SECRET
**Description**: Secret key for signing JWT tokens (minimum 32 characters)  
**Generate**:
```bash
openssl rand -base64 32
```
**Example**: `Bx9mT4nL2vK8pJ5cG1wH3yZ7aF0dE6qR9sM4oN2tX8`  
**âš ï¸ Important**: MUST be different from development secret

### PROD_BACKEND_URL (Required)
**Description**: Full URL to the production backend API including /api/v1  
**Format**: `https://{service-name}.run.app/api/v1`  
**Example**: `https://simpalahr-backend-prod-xyz789.run.app/api/v1`  
**âš ï¸ Important**: This is required for frontend to connect to backend

---

## Getting Your Backend URL

After first deployment, get the backend URL:

```bash
# For Development
gcloud run services describe simpalahr-backend-dev \
  --region us-central1 \
  --project long-operator-466309-g6 \
  --format 'value(status.url)'

# For Production
gcloud run services describe simpalahr-backend-prod \
  --region us-central1 \
  --project start-project-466908 \
  --format 'value(status.url)'
```

Then add `/api/v1` to the end and set it as the secret.

---

## Database Connection String Format

### Components

```
postgresql://[username]:[password]@[host]:[port]/[database]?schema=[schema]
```

- **username**: Database user with appropriate permissions
- **password**: Strong password (URL-encoded if contains special chars)
- **host**: Database server hostname or IP
- **port**: Usually 5432 for PostgreSQL
- **database**: Database name
- **schema**: Usually `public`

### Using Cloud SQL

If using Google Cloud SQL, format:

```
postgresql://[user]:[password]@/[database]?host=/cloudsql/[PROJECT_ID]:[REGION]:[INSTANCE_NAME]&schema=public
```

Or use the Cloud SQL Proxy:

```
postgresql://[user]:[password]@[INSTANCE_CONNECTION_NAME]/[database]?schema=public
```

---

## Security Best Practices

1. âœ… **Never commit secrets** to version control
2. âœ… **Use different secrets** for dev and production
3. âœ… **Rotate secrets regularly** (every 90 days recommended)
4. âœ… **Use strong passwords** (16+ characters, mixed case, numbers, symbols)
5. âœ… **Restrict database access** by IP whitelist when possible
6. âœ… **Enable SSL** for database connections
7. âœ… **Monitor secret access** in GitHub audit logs

---

## Updating Secrets

### In GitHub

1. Go to repository Settings
2. Navigate to Secrets and variables â†’ Actions
3. Find the secret you want to update
4. Click **Update**
5. Enter the new value
6. Click **Update secret**

### After Updating

You need to re-deploy for changes to take effect:

```bash
# Trigger deployment with updated secrets
git commit --allow-empty -m "chore: trigger deployment with updated secrets"
git push origin dev  # or main for production
```

---

## Verifying Secrets Are Set

You can verify secrets are configured (but not see their values):

```bash
# Using GitHub CLI
gh secret list

# Or check in GitHub UI
# Repository â†’ Settings â†’ Secrets and variables â†’ Actions
```

---

## Troubleshooting

### Error: "secrets.DEV_DATABASE_URL is empty"

**Solution**: The secret is not configured or is empty
1. Go to GitHub repository settings
2. Add the secret with the correct name
3. Ensure there are no trailing spaces
4. Re-run the deployment

### Error: "database connection failed"

**Solution**: Check your DATABASE_URL
1. Verify the format is correct
2. Test connection locally:
   ```bash
   psql "postgresql://user:pass@host:5432/db"
   ```
3. Check firewall rules allow GitHub Actions IP ranges
4. Verify credentials are correct

### Error: "JWT token invalid"

**Solution**: JWT_SECRET mismatch or not set
1. Ensure JWT_SECRET is set in GitHub secrets
2. Verify it's at least 32 characters
3. Check for typos in secret name
4. Re-deploy after setting the correct secret

---

## Quick Setup Checklist

### Development

- [ ] DEV_DATABASE_URL configured
- [ ] DEV_JWT_SECRET configured (32+ chars)
- [ ] DEV_BACKEND_URL configured (or will set after first deploy)
- [ ] Secrets verified in GitHub settings
- [ ] Ready to deploy to dev branch

### Production

- [ ] PROD_DATABASE_URL configured
- [ ] PROD_JWT_SECRET configured (32+ chars, different from dev)
- [ ] PROD_BACKEND_URL configured (required!)
- [ ] Database backups configured
- [ ] Production database secured (IP whitelist, SSL)
- [ ] Secrets verified in GitHub settings
- [ ] Ready to deploy to main branch

---

## Example: First Time Setup

### Step 1: Create Development Secrets

```bash
# Generate JWT secret
DEV_JWT_SECRET=$(openssl rand -base64 32)
echo "Your DEV_JWT_SECRET: $DEV_JWT_SECRET"

# Copy to clipboard (macOS)
echo $DEV_JWT_SECRET | pbcopy

# Add to GitHub:
# Settings â†’ Secrets â†’ New secret
# Name: DEV_JWT_SECRET
# Value: [paste from clipboard]
```

### Step 2: Set Development Database URL

```bash
# Format your database URL
DEV_DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# Add to GitHub:
# Settings â†’ Secrets â†’ New secret
# Name: DEV_DATABASE_URL
# Value: [your database URL]
```

### Step 3: First Deployment

```bash
# Deploy to dev to get backend URL
git push origin dev

# Wait for deployment to complete
# Get backend URL from deployment summary or:
gcloud run services describe simpalahr-backend-dev \
  --region us-central1 \
  --format 'value(status.url)'

# Add /api/v1 to the URL and set as DEV_BACKEND_URL
# Example: https://simpalahr-backend-dev-xyz.run.app/api/v1
```

### Step 4: Update Frontend Configuration

```bash
# Add DEV_BACKEND_URL secret with the URL from step 3
# Then trigger a re-deployment
git commit --allow-empty -m "chore: update frontend with backend URL"
git push origin dev
```

### Step 5: Repeat for Production

Follow the same steps for production secrets, but:
- Use different JWT_SECRET
- Use production database
- Deploy to main branch instead of dev

---

**Last Updated**: November 3, 2025

