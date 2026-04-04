# Simpala HR Backend

[![CI/CD](https://github.com/Mad-marketing-git/HR/actions/workflows/ci.yml/badge.svg)](https://github.com/Mad-marketing-git/HR/actions/workflows/ci.yml)

## Backend development with Docker Compose

To start Postgres and the backend locally:

```powershell
cd SimpalaHR/backend
docker compose up --build
```

This will start Postgres on port 5432 and the backend on port 3001. The backend reads env vars from `.env`.

To stop:

```powershell
docker compose down -v
```

## Running Tests

### Understanding Test Database Options

The backend tests require a PostgreSQL database. There are two testing approaches:

| Approach | Use Case | Database |
|----------|----------|----------|
| **Local Docker** | Development, full test suite | `docker-compose up -d db` |
| **CI/CD Pipeline** | Automated testing | Cloud SQL via Cloud Build |

**Note:** The Cloud SQL database (`34.72.134.162`) is not accessible from local machines due to GCP firewall rules. Local development testing requires Docker.

### Local Development Testing (Recommended)

Best for: Daily development, debugging, running full test suite.

1. Make sure Docker Desktop is running on your machine.
2. From the backend folder run:

```powershell
cd d:\HR\SimpalaHR\backend

# Start local Postgres database
docker-compose up -d db

# Update .env to use local database
# DATABASE_URL=postgresql://simpala:simpala123@localhost:5432/simpala

# Regenerate Prisma client (important before tests)
npx prisma generate

# Apply migrations to local DB
npx prisma migrate deploy

# Run the full test suite (sequential)
npm test -- --runInBand
```

**Notes:**
- The compose file starts Postgres on localhost:5432.
- Tests create and clean up their own test data.
- If you see TypeScript errors about missing Prisma types, ensure `npx prisma generate` runs before the build.

### CI/CD Pipeline Testing

Backend tests run automatically in GitHub Actions workflows when:
- Pull requests are opened to `dev` or `main` branches
- Commits are pushed to `dev` or `main`

The CI/CD pipeline:
1. Uses Cloud Build with Cloud SQL connectivity
2. Runs migrations against a dedicated test database
3. Executes the full test suite
4. Reports coverage results

### Running Specific Tests

```powershell
# Run a specific test file
npm test -- --runInBand src/tests/leave.test.ts

# Run tests matching a pattern
npm test -- --runInBand -t "leave"

# Run with coverage
npm run test:coverage
```

### E2E Testing (Playwright)

E2E tests can run against the deployed cloud environment:

```powershell
cd d:\HR\SimpalaHR\frontend

# Run against deployed dev environment
$env:PLAYWRIGHT_BASE_URL="https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app"
npm run e2e

# Or with UI mode
npm run e2e:ui
```

## Database Seeding

The project includes seed scripts to populate the database with realistic test data.

### Development Seed (Full Data)

Creates comprehensive Sri Lankan HR data for development and demos:

```powershell
npm run seed
```

**What it creates:**
- 1 company (Simpala Tech Pvt Ltd)
- 3 admin users (owner, admin, hr)
- 20 regular employees with realistic Sri Lankan names and data
- 3 leave types (Annual: 14 days, Casual: 7 days, Medical: 7 days per Sri Lankan law)
- ~1300 attendance records (past 3 months, weekdays only, 95% attendance rate)
- Multiple leave requests with various statuses
- 40 payslips (2 months for all employees with correct EPF/ETF/PAYE calculations)

**Login credentials:**
- Owner: `owner@simpala.lk` / `password123`
- Admin: `admin@simpala.lk` / `password123`
- HR: `hr@simpala.lk` / `password123`
- Employee: `kasun.fernando0@simpala.lk` / `password123`

### Test Seed (Minimal Data)

Creates minimal data for quick testing:

```powershell
npm run seed:test
```

**What it creates:**
- 1 company
- 1 admin user
- 3 employees
- 3 leave types

**Login credentials:**
- Admin: `admin@test.com` / `password123`
- Employee: `alice@test.com` / `password123`

### Database Reset

Reset database and reseed with development data:

```powershell
npm run db:reset
```

⚠️ **Warning:** This will delete ALL data and re-run migrations!

### When to Use Seeds

- **First time setup**: Run `npm run seed` after initial migration
- **Development**: Use `npm run seed` for realistic data
- **Testing**: Use `npm run seed:test` for quick test data
- **Cleanup**: Use `npm run db:reset` to start fresh

## Security Features

The application implements multiple layers of security hardening:

### Security Headers (Helmet.js)

Helmet is configured to set secure HTTP headers:

- **Content Security Policy (CSP)**: Restricts resource loading to same origin
- **HSTS**: HTTP Strict Transport Security with 1-year max-age and preload
- **X-Frame-Options**: Prevents clickjacking by disabling iframe embedding
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-DNS-Prefetch-Control**: Controls DNS prefetching

### Rate Limiting

API endpoints are protected with rate limiting:

- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Includes `RateLimit-*` headers for client awareness
- **Responses**: Returns `429 Too Many Requests` when limit exceeded

### CORS (Cross-Origin Resource Sharing)

CORS is configured with:

- **Origin Whitelist**: Set via `CORS_ORIGIN` environment variable (comma-separated)
- **Credentials**: Enabled for cookie-based authentication
- **Default**: `*` (all origins) in development - **must be configured for production!**

**Production Configuration:**

```env
# In .env file
CORS_ORIGIN=https://yourapp.com,https://www.yourapp.com
```

### Authentication & Authorization

- **JWT Access Tokens**: 15-minute expiry, signed with secret
- **Refresh Tokens**: 7-day expiry, stored in database with rotation
- **Token Rotation**: New refresh token issued on each refresh (prevents token reuse attacks)
- **Password Hashing**: bcrypt with salting
- **Role-Based Access**: Admin, HR, and Employee roles

### Password Requirements

Strong password validation for new users:

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

**Note**: Login validation is intentionally lenient (min 6 chars) to support existing users.

### Environment Variables

All sensitive configuration is stored in environment variables:

- `JWT_SECRET`: Cryptographically random secret (min 64 bytes recommended)
- `DATABASE_URL`: Database connection string
- `CORS_ORIGIN`: Allowed origins for CORS
- `NODE_ENV`: Environment mode (development, production, test)
- `STORAGE_DRIVER`: Document storage backend (`local` now, `s3` upcoming)
- `LOCAL_STORAGE_ROOT`: Absolute path where employee documents are stored when using the local driver
- `DOCUMENT_MAX_FILE_SIZE_MB`: Maximum upload size for employee documents (default 5 MB)

Generate a secure JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

See `.env.example` for all required environment variables.

### Security Best Practices

For production deployment:

1. ✅ Set strong `JWT_SECRET` (min 64 bytes of randomness)
2. ✅ Configure `CORS_ORIGIN` to only allow your frontend domain(s)
3. ✅ Use HTTPS/TLS for all traffic
4. ✅ Enable database connection pooling and SSL
5. ✅ Review and customize rate limits based on your usage patterns
6. ✅ Set `NODE_ENV=production` to disable debug logging
7. ✅ Regularly rotate JWT secrets and invalidate old tokens
8. ⚠️ Consider adding request body size limits
9. ⚠️ Implement additional monitoring and alerting

## API Documentation

The API is fully documented using OpenAPI 3.0 (Swagger) specification.

### Accessing Documentation

Once the server is running, access the interactive API documentation at:

**[http://localhost:3001/api-docs](http://localhost:3001/api-docs)**

The Swagger UI provides:

- Complete endpoint documentation for all 13 API endpoints
- Request/response schemas with examples
- Authentication requirements per endpoint
- Interactive "Try it out" functionality to test APIs directly
- Sri Lankan HR-specific calculations (EPF, ETF, PAYE)

### API Endpoints

The API includes the following endpoint groups:

**Authentication** (`/api/v1/auth`)

- `POST /login` - User authentication
- `POST /refresh` - Refresh access token (with token rotation)
- `POST /logout` - Revoke specific refresh token
- `POST /logout-all` - Revoke all tokens for user

**Employees** (`/api/v1/employees`)

- `GET /` - List all employees (Admin/Owner)
- `POST /` - Create new employee (Admin/Owner)
- `GET /:id/documents` - List document metadata for the employee (Admin/Owner or employee themselves)
- `POST /:id/documents` - Upload a PDF/JPEG/PNG document for the employee (Admin/Owner or employee themselves)
- `GET /:id/documents/{documentId}` - Download a specific employee document (Admin/Owner or employee themselves)
- `DELETE /:id/documents/{documentId}` - Delete an employee document (Admin/Owner or employee themselves)

**Leave** (`/api/v1/leave`)

- `GET /types` - List leave types (Admin/Owner)
- `POST /types` - Create leave type (Admin/Owner)
- `POST /apply` - Apply for leave
- `PATCH /:id/status` - Approve/reject leave (Admin/Owner)

**Attendance** (`/api/v1/attendance`)

- `POST /` - Record single attendance (Admin/Owner)
- `POST /bulk` - Bulk upload CSV (Admin/Owner)

**Payroll** (`/api/v1/payroll`)

- `POST /generate` - Generate payslip with EPF/ETF/PAYE (Admin/Owner)
- `POST /bank-file` - Generate downloadable CIPS/SLIPS salary transfer CSV with audit trail (Admin/Owner)

**Health** (`/health`)

- `GET /health` - Service health check (no auth)

### Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```text
Authorization: Bearer <your_access_token>
```

Get your access token from the `/api/v1/auth/login` endpoint.

## Caching

The backend uses an **in-memory LRU cache** (`lru-cache`) for frequently accessed endpoints. This is a zero-infrastructure-cost solution with a provider interface that allows swapping to Redis when scaling to multiple instances.

### Cached Endpoints

| Endpoint | TTL | Cache Key Pattern |
|----------|-----|-------------------|
| `GET /api/v1/dashboard/stats` | 60s | `dashboard:stats:company:{id}` |
| `GET /api/v1/dashboard/liquidity` | 60s | `dashboard:liquidity:company:{id}` |
| `GET /api/v1/leave/types` | 5 min | `leaveTypes:company:{id}` |
| `GET /api/v1/employees` | 2 min | `employees:company:{id}:list:{filters}` |

### Key Design Decisions

- **Multi-tenancy safe**: All cache keys are scoped by `companyId` — tenants never share cached data.
- **Auto-invalidation**: Mutation endpoints (create/update/delete) automatically invalidate relevant caches.
- **LRU eviction**: Max 500 entries; least-recently-used items are evicted when full.
- **Redis-ready**: Implement the `CacheProvider` interface in `src/services/cache/cache.interface.ts` and swap the provider in `src/services/cache/index.ts`.

### Cache Statistics

Cache hit/miss metrics are included in the `/health` endpoint response:

```json
{
  "status": "healthy",
  "cache": { "size": 12, "hits": 45, "misses": 8, "hitRate": 85 }
}
```

### Running Cache Tests

Cache tests are pure unit tests (no database required):

```powershell
npm run test:unit
```

## Logging & Monitoring

The application uses Winston for structured logging with daily log rotation.

### Log Files

Logs are stored in the `logs/` directory with daily rotation:

- `error-YYYY-MM-DD.log` - Error-level logs only
- `combined-YYYY-MM-DD.log` - All logs (info, warn, error, debug)
- `http-YYYY-MM-DD.log` - HTTP request/response logs
- `exceptions-YYYY-MM-DD.log` - Unhandled exceptions
- `rejections-YYYY-MM-DD.log` - Unhandled promise rejections

### Log Rotation

- **Pattern**: Daily rotation with date suffix
- **Compression**: Older logs are automatically zipped
- **Max Size**: 20MB per file before rotation
- **Retention**: Logs kept for 14 days, then automatically deleted

### Log Levels

Logs use the following levels (in order of severity):

1. **error** - Error events that might still allow the app to continue
2. **warn** - Warning messages for potentially harmful situations
3. **info** - Informational messages highlighting application progress
4. **http** - HTTP request/response details
5. **debug** - Detailed debug information (development only)

**Environment-based logging:**

- **Development**: Logs all levels (debug through error)
- **Production**: Logs warnings and errors only (warn, error)

### Correlation IDs

Every request is assigned a unique correlation ID for tracking across logs:

- **Header**: `X-Correlation-ID` (sent in response)
- **Usage**: Search logs by correlation ID to trace a request's full lifecycle
- **Format**: UUID v4 (e.g., `a1b2c3d4-e5f6-7890-abcd-1234567890ab`)

Logs automatically include:

- `correlationId` - Request tracking ID
- `userId` - Authenticated user ID (if logged in)
- `userRole` - User's role (OWNER, ADMIN, EMPLOYEE)

### Example Log Entry

```json
{
  "level": "http",
  "message": "HTTP POST /api/v1/auth/login",
  "meta": {
    "correlationId": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
    "req": {
      "method": "POST",
      "url": "/api/v1/auth/login",
      "headers": {...},
      "remoteAddress": "::1"
    },
    "res": {
      "statusCode": 200
    },
    "responseTime": 145
  },
  "timestamp": "2025-10-09T12:30:45.123Z"
}
```

### Accessing Logs

**View logs in real-time:**

```powershell
# All logs
tail -f logs/combined-*.log

# Errors only
tail -f logs/error-*.log

# HTTP requests
tail -f logs/http-*.log
```

**Search logs by correlation ID:**

```powershell
grep "a1b2c3d4-e5f6-7890-abcd-1234567890ab" logs/combined-*.log
```

**Parse JSON logs (PowerShell):**

```powershell
Get-Content logs/combined-*.log | ConvertFrom-Json | Where-Object {$_.level -eq "error"}
```

### Production Monitoring

For production environments, consider:

1. **Log aggregation**: Ship logs to centralized service (ELK, Datadog, CloudWatch)
2. **Alerting**: Set up alerts for error spikes
3. **Metrics**: Track correlation IDs for distributed tracing
4. **Sensitive data**: Logs are configured to exclude passwords and tokens

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment. The workflow includes:

### Pipeline Stages

1. **Lint** - Code quality checks with ESLint and Prettier
2. **Build and Test** - TypeScript typecheck, Prisma generation, and test suite with coverage
3. **Docker Build** - Build and push Docker images to GitHub Container Registry (GHCR)
4. **Deploy Staging** - Deploy to staging environment with database migrations

### Running Locally

```powershell
# Run linting
npm run lint

# Fix lint issues automatically
npm run lint:fix

# Check code formatting
npm run format:check

# Format code
npm run format

# Run tests with coverage
npm run test:coverage
```

### CI Triggers

- **Pull Requests**: Runs lint and build-and-test jobs
- **Push to main**: Runs full pipeline including Docker build and staging deployment
- **Push to feature branches**: Runs lint and build-and-test jobs

### Docker Images

Images are automatically built and pushed to `ghcr.io/mad-marketing-git/hr/backend` with the following tags:

- `latest` - Latest main branch
- `main-<sha>` - Specific commit on main
- `<branch>` - Latest commit on branch

