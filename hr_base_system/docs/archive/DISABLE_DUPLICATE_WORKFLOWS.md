# Disable Duplicate GitHub Workflows

## Problem
GitHub has automatically enabled security workflows (CodeQL and Trivy) that are running in addition to our custom CI pipeline, causing duplicate runs and failures.

## Affected Workflows
- **CodeQL** - Requires GitHub Advanced Security ($49/user/month for private repos)
- **Trivy Security** - Duplicate of our custom Trivy implementation in CI Pipeline

## Solution: Disable GitHub-Managed Workflows

### Step 1: Disable CodeQL
1. Go to your repository: https://github.com/Mad-marketing-git/HR
2. Click **Settings** (top menu)
3. Click **Code security and analysis** (left sidebar under "Security")
4. Find **Code scanning** section
5. Find **CodeQL analysis** 
6. Click **Disable** button next to it

### Step 2: Disable Secret Scanning (Optional)
If you see "Secret scanning" enabled and don't have Advanced Security:
1. In the same **Code security and analysis** page
2. Find **Secret scanning** section
3. Click **Disable** button

### Step 3: Check for Auto-Enabled Workflows
GitHub sometimes auto-creates workflow files in `.github/workflows/`:
1. Navigate to `.github/workflows/` in your repository
2. Look for any files you didn't create:
   - `codeql-analysis.yml` or `codeql.yml`
   - `trivy.yml` or similar
3. Delete these files if found

### Step 4: Verify Configuration
After disabling:
1. Go to **Actions** tab
2. Click on **All workflows** (left sidebar)
3. You should only see:
   - âœ… CI Pipeline
   - âœ… Deploy to Development  
   - âœ… Deploy to Production

## Our Custom Security Scanning

We've already implemented free security scanning in our CI Pipeline:

### âœ… npm audit (Backend & Frontend)
- Scans for known vulnerabilities in dependencies
- Runs on every push and PR
- No cost, built into npm

### âœ… Trivy Filesystem Scanner
- Scans entire codebase for vulnerabilities
- Checks CRITICAL and HIGH severity issues
- Free and open-source

### âœ… ESLint Security Plugins
- Static code analysis for security issues
- Catches common vulnerabilities in code
- Part of our lint jobs

## Verification

After disabling duplicate workflows, push a commit and verify:

```bash
# Check running workflows
gh run list --limit 5

# You should only see CI Pipeline and Deploy workflows
# No more CodeQL or Trivy Security workflows
```

## Why We Don't Need GitHub Advanced Security

GitHub Advanced Security includes:
- CodeQL scanning ($49/user/month)
- Secret scanning push protection
- Dependency review

Our free alternative stack provides similar coverage:
- **CodeQL Alternative**: Trivy + ESLint + npm audit
- **Secret Scanning**: `.gitignore` + environment variables
- **Dependency Review**: npm audit + Dependabot (free)

## Cost Comparison

| Feature | GitHub Advanced Security | Our Free Stack |
|---------|-------------------------|----------------|
| Code Scanning | CodeQL | Trivy + ESLint |
| Dependency Scanning | GitHub | npm audit + Dependabot |
| Secret Scanning | Push protection | .gitignore + secrets |
| **Cost per User** | **$49/month** | **$0** |

## Next Steps

1. âœ… Disable CodeQL in repository settings
2. âœ… Disable any other Advanced Security features
3. âœ… Wait for current CI Pipeline to complete
4. âœ… Verify only custom workflows are running
5. âœ… Set up GitHub Secrets for deployment (see `SECRETS_SETUP.md`)
6. âœ… Deploy to development environment

## Support

If you have questions about the security scanning setup, refer to:
- `docs/SECURITY_SCANNING_FREE.md` - Detailed security setup guide
- `docs/DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `.github/workflows/ci.yml` - CI pipeline configuration

