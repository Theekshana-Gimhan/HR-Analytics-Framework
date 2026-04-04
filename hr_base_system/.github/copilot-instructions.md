# Simpala HR - AI Agent Instructions

## Project Overview
Simpala HR is a Sri Lankan-compliant HR management system with payroll, leave, and attendance tracking. This is a **monorepo** with backend (Node.js/Express/Prisma), frontend (React 19/Vite/MUI), and shared types package.

## Architecture & Key Patterns

### Monorepo Structure
```
backend/           # Express API with Prisma ORM
frontend/          # Vite + React 19 SPA
packages/
  types/           # Shared TypeScript types
ops/               # DevOps: cloudbuild, deploy, db, seed, test scripts
docs/              # All documentation (planning, product, QA, ops, technical)
tests/             # Performance tests
```

**Critical**: Always use workspace-aware commands:
- `npm run build` at root builds all workspaces in dependency order
- Backend imports types via `@simpala/types` (workspace reference)
- Run Prisma commands from `backend/` directory

### Backend Patterns

#### Authentication & Authorization
- All protected routes use `authenticate` middleware (adds `req.user: { id, role, companyId }`)
- Role-based access via `authorize(['OWNER', 'ADMIN'])` middleware
- Controllers extend `CustomRequest` type from `middleware/auth.middleware.ts`
- JWT tokens store `companyId` for multi-tenancy isolation

#### Request Validation Pattern
```typescript
// 1. Define Zod schema in schemas/validation.schemas.ts
export const createLeaveTypeSchema = z.object({
  name: z.string().min(1),
  default_balance: z.number().min(0),
});

// 2. Apply in routes with validateRequest middleware
router.post('/types', 
  authenticate,
  authorize(['OWNER', 'ADMIN']),
  validateRequest(createLeaveTypeSchema),
  controller.createLeaveType
);
```

#### Prisma Field Naming Convention
**CRITICAL**: Prisma models use camelCase fields with `@map` for snake_case DB columns:
```prisma
model LeaveType {
  defaultBalance  Float  @map("default_balance")
  requiresAnniversary Boolean @map("requires_anniversary")
}
```
When accepting snake_case API input, **always map to camelCase** before Prisma operations:
```typescript
const { default_balance, requires_anniversary, ...rest } = inputData;
await prisma.leaveType.create({
  data: {
    ...rest,
    defaultBalance: default_balance,
    requiresAnniversary: requires_anniversary,
  }
});
```

#### Transaction Pattern for Complex Operations
Use `prisma.$transaction` for multi-step operations (leave applications, balance updates):
```typescript
return await prisma.$transaction(async (tx) => {
  const leaveType = await tx.leaveType.create({ data });
  const employees = await tx.employee.findMany({ where });
  await Promise.all(employees.map(e => createBalance(e, tx)));
  return leaveType;
});
```

#### Multi-Tenancy
- All queries MUST filter by `companyId` from `req.user.companyId`
- Never expose data across companies
- See `leave.controller.ts:createLeaveType` for reference implementation

### Frontend Patterns

#### Code Splitting & Performance
- Routes are lazy-loaded via `React.lazy()` in `App.tsx`
- Manual Rollup chunks in `vite.config.ts` keep main bundle <500KB
- Use `PageLoader` for Suspense fallbacks

#### API Integration
- Base client in `lib/api/client.ts`
- All API calls use centralized error handling
- Auth token stored in localStorage (key: `VITE_AUTH_STORAGE_KEY`)

#### Environment Variables
Frontend vars MUST start with `VITE_` to be exposed to client:
```bash
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

## Development Workflows

### Local Development (Docker Compose)
```powershell
# Start backend + Postgres
cd backend
docker compose up --build

# Backend: http://localhost:3001
# Postgres: localhost:5432
```

### Database Management
```powershell
cd backend

# Generate Prisma client (run after schema changes)
npx prisma generate

# Create migration
npx prisma migrate dev --name descriptive_name

# Seed with realistic Sri Lankan HR data
npm run seed

# Reset DB and reseed
npm run db:reset
```

**Never** modify Prisma client manually - always regenerate after schema changes.

### Testing
```powershell
# Backend tests (requires Docker Postgres)
cd backend
docker compose up -d db
npx prisma generate
npm test -- --runInBand

# Frontend tests
cd frontend
npm test

# E2E tests (Playwright)
npm run e2e        # Headless
npm run e2e:ui     # Interactive
```

### Fast Deployment (5-7 min)
**For active development only** - bypasses full CI/CD:
```powershell
# Ultra-fast Cloud Build deploy
.\quick-deploy.ps1 -Service backend  # or frontend

# Dev URLs:
# Backend:  https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app
# Frontend: https://simpalahr-frontend-dev-wxbl5wur4q-uc.a.run.app
```

**For production/QA**: Push to `dev` or `main` branch to trigger full GitHub Actions pipeline (20-30 min with tests + migrations).

## Sri Lankan Compliance Requirements

### Payroll Calculations
- **EPF Employee**: 8% of basic salary
- **EPF Employer**: 12% of basic salary  
- **ETF**: 3% of basic salary
- **PAYE**: Progressive tax (refer to `docs/Product Requirements Document Simpala HR.md`)

### Leave Types (Statutory Minimums)
- Annual: 14 days/year
- Casual: 7 days/year
- Medical: 7 days/year (requires anniversary date for accrual)

### Bank File Exports
Supports CIPS and SLIPS formats for Sri Lankan banks. See `services/bankfile.service.ts` for format specifications.

## Critical Files to Reference

### Architecture & Planning
- `docs/technical/SOLUTION_ARCHITECTURE.md` - System design & data flows
- `docs/product/ROADMAP.md` - 20-task development plan with priorities
- `docs/technical/TECHNICAL_SPECIFICATION.md` - Stack decisions & NFRs

### Development Guides
- `backend/README.md` - Local setup, seeding, testing
- `docs/ops/FAST_DEPLOYMENT.md` - Quick deploy workflows
- `.github/workflows/README.md` - CI/CD pipeline details

### Code Patterns
- `backend/src/middleware/auth.middleware.ts` - Auth pattern reference
- `backend/src/routes/leave.routes.ts` - Route validation pattern
- `backend/src/services/leave.service.ts` - Transaction pattern examples
- `backend/prisma/schema.prisma` - Prisma field naming conventions

## Common Pitfalls

1. **Prisma Client Out of Sync**: Always run `npx prisma generate` after schema changes
2. **Field Name Mismatch**: API uses snake_case, Prisma uses camelCase - map explicitly
3. **Missing companyId Filter**: All queries must scope to user's company
4. **Workspace Commands**: Run `npm` commands from correct workspace directory
5. **Environment Variables**: Frontend vars need `VITE_` prefix
6. **Transaction Isolation**: Complex operations need `prisma.$transaction`

## Where to Find Answers

- **Feature requirements**: `docs/Product Requirements Document Simpala HR.md`
- **API endpoints**: Swagger docs at `/api-docs` or check route files
- **Test data**: `prisma/seeds/dev.seed.ts` (realistic) or `test.seed.ts` (minimal)
- **Deployment issues**: Check CloudWatch logs or `gcloud run services logs`
- **Type definitions**: `packages/types/src/index.ts`
