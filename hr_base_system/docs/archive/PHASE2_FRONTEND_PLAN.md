# Phase 2 Frontend Execution Plan

**Author:** Frontend Guild (Lead: Senior Frontend Dev)
**Date:** October 15, 2025
**Scope:** Tasks 210. Phase 2 Roadmap (Navigation & Layout, UI Library, Error Handling, Employee/Leave/Attendance/Payroll UI)

---

## 1. Vision & Success Criteria

Deliver a production-ready, responsive, and accessible web experience that exposes every Phase 1 backend capability with clear user journeys for admins, managers, and employees.

### Success Metrics

- Navigation & layout framework supporting all HR modules with role-aware routing.
- Consistent design system (tokens + components) sourced from a single UI library.
- Feature flows for Employees, Leave, Attendance, and Payroll live against the production API.
- Automated quality gates: component/unit tests (>=80% critical paths), visual regression baseline, and planned E2E coverage hooks.
- Web Vitals (FCP < 2.5s, CLS < 0.1 on mid-range hardware) validated via Lighthouse.
- Seamless mobile-first responsive experience with parity of key workflows across breakpoints (â‰¥375px, â‰¥768px, â‰¥1200px).

---

## 2. Current State Assessment (October 2025)

| Area | Status | Gaps |
| --- | --- | --- |
| Project scaffolding | Create React App (react-scripts 5.0.1) with React 19.1 & React Router 7 | Jest 27 + ESM incompatibilities; tooling stagnant; no aliasing; slow dev build |
| Styling | Plain CSS modules + inline styles | No design tokens, theming, or component library |
| State/Data | Local component state + ad-hoc `axios` calls | No API abstraction, stale data risk, no caching |
| Auth | `localStorage` token usage only | No refresh handling, central auth context, or role guards |
| Routing | Basic routes wired through ProtectedRoute | No layout shell, breadcrumbs, or nested feature routes |
| Testing | CRA defaults; tests disabled in CI due to React Router v7/Jest issue | No unit/integration coverage and no UI smoke tests |
| DX | No linting beyond CRA defaults, no Prettier config, no Storybook | Need unified lint/format/test commands, commit hooks |

Immediate opportunities: migrate off CRA, align toolchain with latest React/Jest, introduce modular architecture, and stand up a design system to accelerate module delivery.

---

## 3. Mobile-first Design Principles

- **Progressive enhancement:** Design flows for small screens first (â‰¤ 390px), layering additional affordances for tablet and desktop.
- **Fluid layouts:** Utilize responsive grid + flex utilities with 4px spacing scale and container queries for adaptive density.
- **Touch-friendly interactions:** Minimum 44px tap targets, thumb-friendly navigation, swipe-friendly tables (horizontal scroll with sticky headers).
- **Accessible contrast & typography:** Dynamic type ramp that scales from 14px base on mobile to 16px+ on desktop while preserving WCAG AA contrast ratios.
- **Motion & feedback:** Subtle micro-interactions (hover, focus, tap) with reduced-motion support.
- **Offline & low-bandwidth considerations:** Lazy-load heavy modules, image optimization, and cached API responses for mobile networks.

Design deliverables: responsive wireframes (mobile/tablet/desktop), component specs, interaction guidelines, and accessibility checklist updates.

---

## 4. Architectural Direction

1. **Tooling & Build System**
   - Replace Create React App with **Vite (React + TS)** to resolve ESM/Jest incompatibilities and cut build times.
   - Adopt **Vitest** for unit/integration tests; configure **Testing Library** + **MSW** for API mocking.
   - Configure **ESLint (flat config)** + **Prettier** + **Stylelint** with project-wide scripts and CI integration.

2. **UI System**
   - Adopt **Material UI (MUI 6)** for component library (consistent with enterprise HR apps).
   - Define theme tokens (colors, typography, spacing, shadows) in `src/theme` with light/dark toggles.
   - Leverage **MUI X DataGrid** (pro) alternatives via community grid or AG Grid if licensing allows; else compose tables manually with MUI Table + virtualization.

3. **State & Data Management**
   - Centralize API access with `axios` base instance & interceptors (auth headers, error normalization) layered behind a service module.
   - Introduce **TanStack Query** for data fetching, caching, pagination, and optimistic updates.
   - Manage global auth/session via React Context + `zustand` (simple state store) or React Context + reducer (if avoiding extra deps).

4. **Routing & Layout**
   - Use React Router v7 nested routes with layout components (`AppShell`, `ModuleLayout`).
   - Implement role-aware route guards using backend roles (ADMIN, OWNER, EMPLOYEE).
   - Add breadcrumbs and navigation metadata defined in a central `routes.config.ts`.

5. **Forms & Validation**
   - Use **React Hook Form** + **Zod** for schema-driven form management aligning with backend DTOs (backend already uses Zod).
   - Shared form components for inputs, selects, date pickers (Material UI components wrapped for consistent validation messaging).

6. **Error & Feedback Framework**
   - App-level error boundary, query error presenters, toast notifications (MUI Snackbar + notistack).
   - Centralized loading skeleton components.

7. **Internationalization & Accessibility**
   - Accessibility baked into design (WCAG AA). Consider future-proofing by scaffolding `react-intl` or `lingui` (phase 2 optional).

---

## 5. Implementation Roadmap & Milestones

> Estimated duration: 4 weeks (105 day sprints). Multiple streams can run in parallel once Foundation is complete.

### Milestone A â€” Foundation & Tooling (Week 1)

- Migrate CRA to Vite (preserve Git history; use `cra-to-vite` scripts or manual migration).
- Update dependencies: React Router v7, React 19, TypeScript 5.6, ESLint 9 flat config, Prettier 3, Vitest, Testing Library, MSW.
- Establish folder structure:
  - `src/app` (AppShell, router setup, providers)
  - `src/features/{domain}` for employees, leave, etc.
  - `src/components/ui` for shared design system pieces
  - `src/lib` for utilities (api, auth, hooks)
- Configure environment variables (`VITE_API_BASE_URL`, `VITE_AUTH_STORAGE_KEY`).
- Integrate Husky + lint-staged for pre-commit checks.

**Exit criteria:** Vite dev server running, build succeeds, Vitest smoke tests pass in CI.

### Milestone B â€” Navigation & Layout (Task 21) (Week 1-2)

- Implement `AppShell` with persistent sidebar/topbar (responsive drawer + mobile menu).
- Add organization branding (logo, color tokens) + user menu (profile, logout).
- Define navigation structure for Employee, Leave, Attendance, Payroll, Documents (optional) modules.
- Implement role-based menu filtering.
- Add global breadcrumbs + page title management.
- Establish responsive breakpoints, container widths, and mobile-first spacing/typography scale.
- Prototype mobile navigation (bottom bar or overlay) and ensure parity with desktop sidebar.

**Exit criteria:** Authenticated user sees responsive shell, navigation highlights active route, logout clears tokens and redirects.

### Milestone C â€” UI Library & Design System (Task 22) (Week 2)

- Install & configure Material UI, theming, typography, icon sets.
- Create reusable primitives: Button, TextField, Select, DatePicker wrapper, DataTable, Card, EmptyState, Dialog.
- Document component usage via Storybook or in-code MDX notes (optional but recommended for knowledge sharing).
- Implement global loading indicators (progress bar, skeleton) and confirm WCAG AA color contrast.
- Build responsive variants (xs/sm/md/lg) for core components with tokenized spacing and typography scale.
- Introduce utility hooks (`useBreakpoint`, `useIsMobile`) to drive adaptive behavior.

**Exit criteria:** Shared components used by at least Login + Employee module, screenshot diff tests stable.

### Milestone D â€” Error Handling & Feedback (Task 23) (Week 2-3)

- App-level error boundary + route-level boundaries.
- Integrate notistack for toast notifications triggered by TanStack Query mutate flows.
- Loading states and skeletons integrated across modules.
- Retry sheets for critical API failures, offline detection via Service Worker or `navigator.onLine` with fallback UI.
- Tailor error and loading presentations for mobile (full-screen states, accessible focus management) vs desktop (inline banners, toasts).

**Exit criteria:** Simulated API failures show friendly messages, no blank screens, offline mode surfaces notice.

### Milestone E â€” Feature Modules (Tasks 12â€“15) (Weeks 3-5)

| Module | Key Screens | Notes |
| --- | --- | --- |
| **Employees** | List, detail drawer, create/edit modal, soft-deleted filter, document tab | Use DataGrid with sorting/filter, integrate document upload component (Task 16 output); mobile cards + swipe actions |
| **Leave** | Employee dashboard (balances, request form), Manager dashboard (approvals, calendar), Leave history | Use Calendar heatmap (FullCalendar) and integrate real-time balance; mobile stacked cards with sticky action bar |
| **Attendance** | Daily log list, manual entry form, CSV upload wizard with validation results | Provide import progress indicator, file parsing (Papaparse) in web worker; responsive table to list transform |
| **Payroll** | Monthly summary, payslip list, detail drawer with PDF download, bank file export CTA | Use TanStack Query mutations for export; show status to user; layered detail drawer optimized for small screens |

Each feature module should deliver:

- Route definitions, breadcrumbs, empty/loading/error states.
- API services with types derived from backend OpenAPI (generate using `openapi-typescript` once Swagger refreshed).
- Component-level tests (Vitest + Testing Library).
- Cypress/Playwright scenario stubs (ready for Phase 3 automation).

### Cross-Cutting Enhancements

- **Analytics & Logging:** Hook up simple telemetry (console-based for now) for key user actions.
- **Document Storage UI:** Inline preview (PDF/images) using MUI Dialog + embed (subject to security headers).
- **Accessibility Review:** Keyboard navigation, focus management, aria labels.
- **Responsive QA:** Visual regression snapshots across breakpoints, device lab smoke tests (iPhone SE, Pixel 7, iPad Air, 1440p desktop).
- **Design tokens governance:** Maintain Figma + code token sync for colors, spacing, typography, motion.

---

## 6. Tooling & Quality Gates

- **Testing Pyramid**
  - Unit/Component: Vitest + Testing Library (run on every push).
  - Integration: MSW-backed tests for form submissions and query flows.
  - E2E: Playwright (Phase 3) â€” scaffold tests now with `TODO` markers.
- **Static Analysis**
  - ESLint (typescript, react, jsx-a11y, tanstack query plugin) running in CI.
  - Stylelint for CSS-in-JS (if using MUI emotion) or SCSS modules.
- **Visual Regression (Optional)**
  - Chromatic or Loki integration once key screens ready.
- **Performance Budget**
  - Set bundle analyzer (rollup-plugin-visualizer) thresholds (initial chunk < 250 KB gzip).

---

## 7. Dependencies & Coordination

- **Backend Alignment**
  - Confirm API contracts for: employee search filters, leave balance endpoint (`/employees/:id/leave-balance`), attendance bulk upload, payroll export endpoints.
  - Request Swagger regeneration task (already highlighted in status report) to auto-generate TypeScript clients.
  - Coordinate on auth token refresh/expiry policies (Phase 2 will implement refresh handling if backend supports).

- **DevOps**
  - Update CI pipeline to run `npm run lint`, `npm run test`, and `npm run build` via Vite.
  - Add Vite preview deployment artifact for QA/stakeholders (GitHub Pages or Netlify preview).
  - Integrate branch protection requiring frontend jobs to pass.

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Vite migration delays due to CRA dependencies | Slips foundation | Pair migration; leverage codemods; time-box fallback (continue with CRA + patch tests) |
| UI library learning curve | Slower feature delivery | Provide component cookbook + Storybook examples early |
| API changes during frontend build | Rework | Use generated types from OpenAPI; align with backend versioning |
| Performance on low-end devices | Poor UX | Establish perf budgets, test on throttled network/devices |
| Role-based complexity | Incorrect access control | Build shared `hasRole` utilities and backend-driven permissions metadata |

---

## 9. Deliverables & Timeline Snapshot

| Week | Focus | Key Deliverables |
| --- | --- | --- |
| 1 | Foundation | Vite migration, lint/test pipeline, skeleton AppShell |
| 2 | Layout + UI system | Responsive navigation, MUI theme, shared components |
| 3 | Error handling + Employees module | Toasts, error boundaries, employee list & forms |
| 4 | Leave & Attendance modules | Leave dashboards, attendance import workflow |
| 5 | Payroll module + polish | Payroll summary, exports, accessibility/perf audit |

Parallel threads: documentation updates, QA prep, S3 document viewer integration.

---

## 10. Definition of Done for Phase 2

- All roadmap tasks 2115 closed with acceptance criteria met.
- Frontend CI jobs (lint, test, build) mandatory and green.
- Storybook (or equivalent documentation) covering critical shared components.
- UAT sign-off for each HR workflow (employee CRUD, leave, attendance, payroll).
- Accessibility audit report (manual + axe tooling) filed with actionable fixes.
- Handover documentation: updated README, deployment guide, troubleshooting FAQ.

---

## 11. Immediate Next Steps

1. Schedule architecture kick-off to align stakeholders on Vite migration + MUI adoption.
2. Regenerate backend Swagger spec and wire OpenAPI client generation into frontend build.
3. Spin up a `phase2/frontend-foundation` branch and execute Milestone A tasks.
4. Prepare design references (wireframes or Figma updates) to guide component builds.

Once Milestone A is in motion, we can staff feature squads per module and begin iterative delivery backed by the structure above.

