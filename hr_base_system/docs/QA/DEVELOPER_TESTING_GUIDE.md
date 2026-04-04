# Developer Testing Guide

**Status:** Active
**Aligned with:** [QA Strategy v2.0](./QA_STRATEGY.md)

This guide provides practical instructions for developers to run tests locally, verify changes against the cloud development environment, and troubleshoot common testing issues.

---

## 1. Local Testing Workflow

### 1.1 Prerequisites
- **Node.js** v18+
- **Docker Desktop** (Running, for database)
- **PostgreSQL Client** (Optional, for manual DB inspection)

### 1.2 Setting up the Test Database
The test environment requires a dedicated database. We use Docker to spin one up quickly.

```bash
# Start the test database container
docker run --name simpala-test-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=simpala_test -p 5433:5432 -d postgres:alpine

# Run migrations (from backend workspace)
cd SimpalaHR/backend
npx prisma migrate deploy
```

> **Note:** Ensure your `.env.test` (or equivalent test config) points to `localhost:5433`.

### 1.3 Running Backend Tests
**Workspace:** `SimpalaHR/backend`
**Framework:** Jest

```bash
# Run all unit and integration tests
npm run test -w SimpalaHR/backend

# Run tests in watch mode (great for TDD)
npm run test:watch -w SimpalaHR/backend

# Run a specific test file
npm run test -w SimpalaHR/backend -- src/services/payroll.service.test.ts
```

### 1.4 Running Frontend Tests
**Workspace:** `SimpalaHR/frontend`
**Framework:** Vitest

```bash
# Run unit tests
npm run test -w SimpalaHR/frontend

# Run with UI (visual test runner)
npm run test -w SimpalaHR/frontend -- --ui
```

---

## 2. Cloud Dev Testing

After merging to `main`, your code is automatically deployed to the Cloud Dev environment. You must verify your changes here.

### 2.1 Smoke Testing
Run a quick health check to ensure the deployment succeeded.

- **Check API Health:** `https://simpalahr-backend-dev-[id].a.run.app/health`
- **Check Frontend:** `https://simpalahr-frontend-dev-[id].a.run.app`

### 2.2 End-to-End (E2E) Testing
Run Playwright tests against the real Cloud Dev environment to verify critical flows.

```bash
# Run E2E tests targeting Cloud Dev
# Replace [URL] with the actual frontend URL
E2E_BASE_URL=https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app npm run e2e -w SimpalaHR/frontend
```

---

## 3. End-to-End (E2E) Testing - Local
You can also run E2E tests against your local server.

```bash
# 1. Start Backend (Terminal 1)
npm run dev -w SimpalaHR/backend

# 2. Start Frontend (Terminal 2)
npm run dev -w SimpalaHR/frontend

# 3. Run Playwright (Terminal 3)
npm run e2e -w SimpalaHR/frontend

# Open Playwright UI Inspector
npm run e2e:ui -w SimpalaHR/frontend
```

---

## 4. Troubleshooting

### "Database connection error" during tests
- **Cause:** Docker container is not running or port 5433 is blocked.
- **Fix:** `docker start simpala-test-db` or check if another postgres instance is using the port.

### "Prisma Client not initialized"
- **Cause:** Generated client is out of sync with schema.
- **Fix:** `npm run build -w SimpalaHR/backend` (runs `prisma generate`).

### "ReferenceError: document is not defined" (Frontend)
- **Cause:** Testing DOM elements without `jsdom` environment.
- **Fix:** Ensure `// @vitest-environment jsdom` is at the top of your test file.

---

## 5. Writing Good Tests
- **Backend:** Focus on Service layer logic. Mock Repositories/Prisma.
- **Frontend:** Focus on User Interactions (Click, Type). Avoid testing implementation details.
- **Naming:** `it('should calculate EPF correctly when salary is > 20000', ...)`
