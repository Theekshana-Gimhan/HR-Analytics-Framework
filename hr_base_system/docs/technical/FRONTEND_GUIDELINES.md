# Frontend Guidelines: Simpala HR

**Version:** 1.0  
**Author:** Sr. Dev  
**Date:** February 5, 2026

---

## 1. Folder Structure

```
frontend/src/
â”œâ”€â”€ pages/              # Route-level components (one folder per route)
â”‚   â”œâ”€â”€ Dashboard/
â”‚   â”‚   â””â”€â”€ DashboardPage.tsx
â”‚   â”œâ”€â”€ Employees/
â”‚   â”‚   â”œâ”€â”€ EmployeesPage.tsx
â”‚   â”‚   â””â”€â”€ EmployeeDetailPage.tsx
â”‚   â”œâ”€â”€ Leave/
â”‚   â”‚   â””â”€â”€ LeavePage.tsx
â”‚   â”œâ”€â”€ Attendance/
â”‚   â”‚   â””â”€â”€ AttendancePage.tsx
â”‚   â”œâ”€â”€ Payroll/
â”‚   â”‚   â”œâ”€â”€ PayrollPage.tsx
â”‚   â”‚   â””â”€â”€ PayrollDashboardPage.tsx
â”‚   â”œâ”€â”€ Documents/
â”‚   â”‚   â””â”€â”€ DocumentsPage.tsx
â”‚   â””â”€â”€ Admin/
â”‚       â””â”€â”€ LeaveTypeManagementPage.tsx
â”‚
â”œâ”€â”€ components/         # Reusable UI components only
â”‚   â”œâ”€â”€ common/         # Generic UI (Button, Input, Modal, Card, PageLoader)
â”‚   â””â”€â”€ features/       # Domain-specific reusable (LeaveCard, EmployeeRow, PayslipTable)
â”‚
â”œâ”€â”€ hooks/              # Custom React hooks (useAuth, useEmployee, etc.)
â”œâ”€â”€ lib/                # API clients, utilities, constants
â”œâ”€â”€ routes/             # React Router configuration
â”œâ”€â”€ theme/              # MUI theme configuration
â””â”€â”€ app/                # Application-level (AppShell, ErrorBoundary)
```

---

## 2. Key Rules

### 2.1 Pages vs Components

| Type | Location | Purpose |
|------|----------|---------|
| **Page** | `src/pages/` | Mounted to a route, fetches data, orchestrates components |
| **Component** | `src/components/` | Reusable, receives data via props, no route awareness |

### 2.2 Naming Conventions

- **Pages:** `*Page.tsx` (e.g., `DashboardPage.tsx`, `EmployeesPage.tsx`)
- **Components:** PascalCase, descriptive (e.g., `LeaveRequestForm.tsx`, `EmployeeCard.tsx`)
- **Hooks:** `use*` prefix (e.g., `useAuth.ts`, `useEmployees.ts`)

### 2.3 Data Fetching

- Use **React Query** (`@tanstack/react-query`) for all API calls
- Define queries in page components, pass data to child components
- No API calls inside `components/` - only in `pages/` or custom hooks

### 2.4 Form Validation

- Use **React Hook Form** + **Zod** for all forms
- Define Zod schemas in `lib/schemas/` or co-located with forms

---

## 3. Migration Checklist (Jr. Dev)

Move these components from `components/` to `pages/`:

| Current Path | New Path |
|--------------|----------|
| `components/dashboard/Dashboard.tsx` | `pages/Dashboard/DashboardPage.tsx` |
| `components/employee/EmployeeList.tsx` | `pages/Employees/EmployeesPage.tsx` |
| `components/employee/EmployeeDetail.tsx` | `pages/Employees/EmployeeDetailPage.tsx` |
| `components/leave/LeavePage.tsx` | `pages/Leave/LeavePage.tsx` |
| `components/attendance/AttendancePage.tsx` | `pages/Attendance/AttendancePage.tsx` |
| `components/payroll/Payroll.tsx` | `pages/Payroll/PayrollPage.tsx` |
| `components/payroll/PayrollDashboard.tsx` | `pages/Payroll/PayrollDashboardPage.tsx` |
| `components/documents/DocumentsPage.tsx` | `pages/Documents/DocumentsPage.tsx` |
| `components/admin/LeaveTypeManagement.tsx` | `pages/Admin/LeaveTypeManagementPage.tsx` |

**Keep in `components/`:** `LeaveRequestForm.tsx`, `LeaveCalendar.tsx`, `EmployeeForm.tsx`, `common/*`

---

## 4. After Migration

Update `App.tsx` imports:

```tsx
// Before
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));

// After
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
```

---

## 5. Verification

```bash
npm run build    # Must succeed
npm run typecheck
npm run lint
```

---

## 6. Design System

We use a customized **Material UI** theme to ensure a premium look and feel.

### 6.1 Theme Configuration
- **Location**: `src/theme/index.ts`
- **Colors**: Based on a curated palette (Blues, Slates, Emeralds). Use `primary`, `secondary`, `success`, `error`, `warning`, `info` tokens.
- **Typography**: `Inter` font family. Use `h1`-`h6` for headings, `body1`/`body2` for text.

### 6.2 Component Usage
- **Buttons**:
    - `Primary`: `<Button variant="contained" color="primary">Action</Button>` (Rounded, Shadowed)
    - `Secondary`: `<Button variant="outlined" color="secondary">Cancel</Button>`
- **Cards**: Use `<Card>` for content blocks. `AppThemeProvider` applies default styles (soft shadows, rounded corners).
- **Inputs**: `<TextField variant="outlined" />` (Custom borders).

### 6.3 Maintenance
- To update tokens, modify `src/theme/index.ts`.
- Do not use hardcoded hex values in components; always use the theme palette.

### 6.4 UI Generation & Validation (Stitch)
We use **Stitch** to generate high-fidelity UI designs and components.
- **Project Name**: Simpala HR
- **Usage**:
  - Use Stitch to generate initial screen layouts and component references.
  - Review generated designs in Stitch before implementation.
  - Ensure implementation matches the Stitch-generated aesthetic (Blue 600, Slate 50, Inter font).


