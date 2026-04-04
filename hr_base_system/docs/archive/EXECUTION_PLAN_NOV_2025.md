# ðŸš€ Simpala HR - Complete Execution Plan
**Date:** November 12, 2025  
**Status:** Active Development  
**Goal:** Take frontend from 30% â†’ 100% production-ready in 3 weeks

---

## ðŸ“Š Current State Assessment

### âœ… **Already Complete (Great News!)**
- Backend: 100% complete with 87 passing tests
- Frontend tooling: **ALREADY MIGRATED TO VITE** âœ…
- Material-UI: **ALREADY INSTALLED** with custom theme âœ…
- TypeScript: Fully configured âœ…
- Playwright E2E: Configured âœ…
- CI/CD: Fully operational âœ…
- Deployment: Dev environment live on GCP âœ…

### âš ï¸ **Needs Work**
- State management (no TanStack Query yet)
- Components need enhancement (forms, validation, UX)
- Missing features in existing components
- Limited test coverage
- API service layer needs improvement
- Production hardening (GCS, security audit)

---

## ðŸŽ¯ 3-Week Execution Plan

### **WEEK 1: Foundation & State Management (Nov 12-18)**

#### Day 1-2: Setup & State Management Infrastructure
- [x] âœ… Audit current frontend (DONE - components exist but need enhancement)
- [ ] Install & configure TanStack Query
- [ ] Create API service layer with axios interceptors
- [ ] Set up React Hook Form + Zod validation
- [ ] Create reusable form components

#### Day 3-4: Employee Management Enhancement
- [ ] Enhance EmployeeList: search, filters, pagination
- [ ] Improve EmployeeForm: validation, error handling, UX
- [ ] Add EmployeeEdit functionality
- [ ] Enhance document upload/management
- [ ] Add loading states and error boundaries

#### Day 5: Leave Management Enhancement
- [ ] Improve leave request form with React Hook Form
- [ ] Enhance leave approval workflow
- [ ] Improve leave calendar with better UX
- [ ] Add leave balance display
- [ ] Add search and filtering

### **WEEK 2: Feature Completion & Polish (Nov 19-25)**

#### Day 6-7: Payroll & Attendance
- [ ] Enhance PayrollDashboard: month picker, reports
- [ ] Add payslip bulk download
- [ ] Improve bank file generation UI
- [ ] Enhance attendance calendar view
- [ ] Improve CSV upload with better feedback

#### Day 8-9: Admin & Document Management
- [ ] Complete LeaveTypeManagement admin page
- [ ] Enhance DocumentsPage with better search/filters
- [ ] Add role-based access control UI
- [ ] Create admin dashboard for system settings
- [ ] Add user management UI

#### Day 10: Mobile Responsiveness
- [ ] Test all pages on mobile (â‰¥375px)
- [ ] Fix responsive layouts
- [ ] Ensure touch-friendly interactions (44px min)
- [ ] Test on iOS Safari, Chrome Android
- [ ] Fix any mobile-specific issues

### **WEEK 3: Testing & Production Hardening (Nov 26 - Dec 2)**

#### Day 11-12: Testing
- [ ] Write Vitest unit tests for critical components
- [ ] Add API mocking with MSW
- [ ] Expand Playwright E2E tests:
  - Employee lifecycle test
  - Leave request + approval test
  - Payroll run test
  - Attendance upload test
- [ ] Integrate E2E tests into CI pipeline
- [ ] Target: 80% test coverage for critical paths

#### Day 13: Production Infrastructure
- [ ] Migrate to Google Cloud Storage for documents
- [ ] Create GCS bucket with proper permissions
- [ ] Implement storage provider interface
- [ ] Add file upload security (size limits, type validation)
- [ ] Update backend tests for GCS

#### Day 14-15: Quality Assurance
- [ ] Performance testing with k6
- [ ] Security audit with OWASP ZAP
- [ ] Update API documentation (Swagger)
- [ ] Load testing (100+ concurrent users)
- [ ] Fix any critical issues found

---

## ðŸ“‹ Detailed Task Breakdown

### **Phase 1: State Management & API Layer**

#### Install Dependencies
```bash
npm install @tanstack/react-query@^5.0.0
npm install react-hook-form@^7.0.0
npm install @hookform/resolvers@^3.0.0
npm install zod@^3.22.0
```

#### Create API Service Layer
- `src/lib/api/client.ts` - Axios instance with interceptors
- `src/lib/api/endpoints.ts` - Typed API endpoints
- `src/lib/api/hooks.ts` - React Query hooks

#### Create Form System
- `src/components/forms/FormInput.tsx` - Reusable input with validation
- `src/components/forms/FormSelect.tsx` - Reusable select
- `src/components/forms/FormDatePicker.tsx` - Date picker with validation
- `src/lib/schemas/` - Zod validation schemas

### **Phase 2: Component Enhancement Checklist**

#### Employee Management
- [ ] EmployeeList
  - [ ] Add search by name/email/NIC
  - [ ] Add department filter
  - [ ] Add status filter (Active/Inactive)
  - [ ] Add pagination with query params
  - [ ] Add loading skeleton
  - [ ] Add empty state
  - [ ] Add bulk actions
  
- [ ] EmployeeForm
  - [ ] Replace with React Hook Form
  - [ ] Add Zod validation
  - [ ] Add field-level error messages
  - [ ] Add autosave draft
  - [ ] Add success/error notifications
  - [ ] Add loading state during submission
  
- [ ] EmployeeDetail
  - [ ] Add edit mode
  - [ ] Improve document upload UX
  - [ ] Add document preview
  - [ ] Add activity log
  - [ ] Add quick actions menu

#### Leave Management
- [ ] LeaveRequestForm
  - [ ] Add leave type selector with balance display
  - [ ] Add date range validation
  - [ ] Add conflict checking (overlapping leaves)
  - [ ] Add attachment upload
  - [ ] Add form preview before submit
  
- [ ] LeaveCalendar
  - [ ] Add month/year navigation
  - [ ] Add legend for leave types
  - [ ] Add filters (department, status)
  - [ ] Add export to PDF/Excel
  - [ ] Add day view with details
  
- [ ] LeaveRequestList
  - [ ] Add search and filters
  - [ ] Add bulk approval
  - [ ] Add status change notifications
  - [ ] Add history view
  - [ ] Add export functionality

#### Payroll Management
- [ ] PayrollDashboard
  - [ ] Add month/year picker
  - [ ] Add EPF/ETF reports
  - [ ] Add PAYE summary
  - [ ] Add download all payslips
  - [ ] Add export to Excel
  - [ ] Add charts for trends
  
- [ ] Add new PayrollReports page
  - [ ] Monthly summary report
  - [ ] Department-wise breakdown
  - [ ] Historical comparisons
  - [ ] Statutory filing reports

#### Attendance Management
- [ ] AttendanceCalendar (new component)
  - [ ] Monthly calendar view
  - [ ] Color-coded presence/absence
  - [ ] Click to edit attendance
  - [ ] Add legends and filters
  
- [ ] AttendanceBulkUpload
  - [ ] Improve CSV validation
  - [ ] Add preview before import
  - [ ] Add conflict resolution
  - [ ] Add import history
  - [ ] Add downloadable template

### **Phase 3: Testing Strategy**

#### Unit Tests (Vitest + Testing Library)
```typescript
// Priority components to test:
- src/components/employee/EmployeeForm.test.tsx
- src/components/leave/LeaveRequestForm.test.tsx
- src/lib/api/client.test.ts
- src/lib/utils/validation.test.ts
- src/hooks/useAuth.test.tsx
```

#### E2E Tests (Playwright)
```typescript
// tests/e2e/employee-lifecycle.spec.ts
- Create employee â†’ View details â†’ Upload document â†’ Edit employee

// tests/e2e/leave-workflow.spec.ts
- Login as employee â†’ Apply leave â†’ Login as admin â†’ Approve leave

// tests/e2e/payroll-run.spec.ts
- Upload attendance â†’ Run payroll â†’ Download payslip â†’ Generate bank file

// tests/e2e/attendance-upload.spec.ts
- Upload CSV â†’ Validate data â†’ Confirm import â†’ View in calendar
```

### **Phase 4: Production Hardening**

#### Google Cloud Storage Migration
1. Create GCS bucket: `simpala-hr-documents-prod`
2. Configure IAM permissions
3. Update backend storage provider:
   ```typescript
   // SimpalaHR/backend/src/services/storage/gcs-provider.ts
   ```
4. Add environment variables:
   ```
   STORAGE_PROVIDER=gcs
   GCS_BUCKET_NAME=simpala-hr-documents-prod
   GCS_PROJECT_ID=start-project-466908
   ```
5. Update tests to use GCS emulator

#### Security Checklist
- [ ] Run OWASP ZAP scan
- [ ] Verify JWT token refresh works
- [ ] Check SQL injection protection
- [ ] Test XSS prevention
- [ ] Verify CSRF protection
- [ ] Check rate limiting
- [ ] Verify file upload security
- [ ] Test authentication edge cases

#### Performance Checklist
- [ ] Load test with k6 (100 concurrent users)
- [ ] Verify API response times <200ms (p95)
- [ ] Check database query performance
- [ ] Optimize N+1 queries
- [ ] Add database indexes if needed
- [ ] Frontend bundle size <300KB
- [ ] Lighthouse score >90
- [ ] Test on slow 3G network

---

## ðŸŽ¯ Success Metrics

### Week 1 Goals
- [ ] TanStack Query integrated with 5+ hooks
- [ ] React Hook Form working in all forms
- [ ] Employee module 100% complete
- [ ] Leave module 100% complete

### Week 2 Goals
- [ ] All modules feature-complete
- [ ] Mobile responsive on all pages
- [ ] 50+ Vitest unit tests passing
- [ ] 5+ E2E tests passing

### Week 3 Goals
- [ ] GCS migration complete
- [ ] Security audit passed
- [ ] Performance targets met
- [ ] 80% test coverage
- [ ] Production deployment ready

---

## ðŸš€ Immediate Action Items (TODAY)

### Priority 1: State Management Setup
1. Install TanStack Query + React Hook Form
2. Create API service layer
3. Set up query client and providers

### Priority 2: Start Component Enhancement
1. Begin with EmployeeForm (most used)
2. Add proper validation
3. Improve UX with loading states

### Priority 3: Testing Foundation
1. Write first unit tests
2. Expand E2E test coverage
3. Add to CI pipeline

---

## ðŸ“ Notes & Decisions

### Architecture Decisions
- âœ… Vite instead of CRA (already done)
- âœ… Material-UI for design system (already done)
- ðŸ”„ TanStack Query for server state (to be added)
- ðŸ”„ React Hook Form for forms (to be added)
- âœ… Playwright for E2E (already configured)
- ðŸ”„ Vitest for unit tests (configured, needs tests)

### Deferred Features (Post-MVP)
- Dark mode support
- Internationalization (i18n)
- Advanced analytics dashboard
- Email notification templates
- Mobile native apps
- Biometric integration
- Performance management module

---

## ðŸŽŠ Ready to Execute!

This plan takes us from current 30% â†’ 100% production-ready frontend in 3 weeks.

**START DATE:** November 12, 2025  
**TARGET COMPLETION:** December 2, 2025  
**DEPLOYMENT:** December 3-5, 2025

Let's build! ðŸš€

