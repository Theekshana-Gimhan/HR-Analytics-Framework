# Sprint Delivery Report — Simpala HR

**Period:** Feb 2026  
**Sprints Delivered:** 1, 2, 3  
**Sign-off date:** 2026-02-13  
**Live smoke tests:** ✅ 21 / 21 passed (`ops/test/sprint-all-smoke-tests.ps1`)

---

## Sprint 1 — Schema Extensions & Leave CANCELLED Status

### Objective
Extend core data model to support Sri Lankan compliance requirements: attendance sub-statuses, a `CANCELLED` leave lifecycle state, and a typed document category system.

### Deliverables

#### Backend (committed, migrated, deployed)
| Change | File(s) |
|--------|---------|
| `CANCELLED` added to `LeaveStatus` enum | `prisma/schema.prisma`, migration `20260228000000` |
| `LATE`, `HALF_DAY`, `WFH`, `ON_LEAVE` added to `AttendanceStatus` | same migration |
| `DocumentCategory` enum created (`MEDICAL_REPORT`, `EPF_FORM`, `POLICE_REPORT`, `CONTRACT`, `IDENTIFICATION`, `OTHER`) | same migration |
| `category` field added to `EmployeeDocument` model | same migration |
| `updateLeaveStatusSchema` updated to include `CANCELLED` | `schemas/validation.schemas.ts` |

#### Frontend
| Change | File(s) |
|--------|---------|
| Leave status chip renders `CANCELLED` state | `components/leave/LeaveStatusChip.tsx` |
| Attendance status colours updated for new values | `components/attendance/` |
| Employee type updated | `packages/types/src/index.ts` |

### Smoke Tests
- S1-T1 ✅ CANCELLED leave status
- S1-T2 ✅ Leave types readable by employee
- S1-T3 ✅ DocumentCategory IDENTIFICATION
- S1-T4 ✅ DocumentCategory OTHER
- S1-T5 ✅ At least 3 statutory leave types

---

## Sprint 2 — Attendance Check-In/Out & Correction Requests

### Objective
Give employees a self-service way to record daily attendance (check-in/out) and request corrections. Provide admins with an approval workflow that propagates to the actual attendance record.

### Deliverables

#### Backend
| Change | File(s) |
|--------|---------|
| `AttendanceCorrectionRequest` model + `CorrectionStatus` enum | `prisma/schema.prisma`, migration `20260228000001` |
| `POST /attendance/checkin` | `routes/attendance.routes.ts`, `controllers/attendance.controller.ts` |
| `POST /attendance/checkout` | same |
| `GET /attendance/me/summary?month&year` | same |
| `POST /attendance/corrections` (employee) | same |
| `GET /attendance/corrections/mine` (employee) | same |
| `GET /attendance/corrections` (admin) | same |
| `PATCH /attendance/corrections/:id` (admin approve/reject) | same |
| Approval propagates `status=WFH/LATE/…` to linked `AttendanceRecord` | `services/attendance.service.ts` |

#### Frontend
| Change | File(s) |
|--------|---------|
| Check-in / Check-out widget on Dashboard | `components/dashboard/AttendanceWidget.tsx` |
| Correction request form & history modal | `components/attendance/CorrectionRequestModal.tsx` |
| Admin correction approval table | `pages/Attendance/AdminCorrectionsPage.tsx` |

### Smoke Tests
- S2-T1 ✅ Check-in (idempotent — finds today's record if already checked in)
- S2-T2 ✅ Duplicate check-in rejected with 409
- S2-T3 ✅ Check-out success
- S2-T4 ✅ Monthly summary returns correct totals
- S2-T5 ✅ Employee creates correction request
- S2-T6 ✅ Employee sees own corrections
- S2-T7 ✅ Admin sees all corrections
- S2-T8 ✅ Admin approves correction
- S2-T9 ✅ Attendance record status set to WFH after approval

---

## Sprint 3 — Emergency Contacts & Self-Service Leave Balance

### Objective
Allow employees to maintain emergency contact information on their profile, and view their current leave balances without admin intervention.

### Deliverables

#### Backend
| Change | File(s) |
|--------|---------|
| `emergency_contact_name`, `emergency_contact_phone` fields on `Employee` | `prisma/schema.prisma`, migration `20260228000002` |
| `updateProfileSchema` extended with emergency contact fields | `schemas/validation.schemas.ts` |
| `GET /users/me` select updated to include emergency contact | `services/user.service.ts` |
| `PATCH /users/me` preserves emergency contact on partial update | `services/user.service.ts` |
| `GET /leave/balance/me` self-service endpoint (no admin required) | `routes/leave.routes.ts`, `controllers/leave.controller.ts` |

#### Frontend
| Change | File(s) |
|--------|---------|
| Emergency Contact section in Profile form | `pages/Profile/ProfileForm.tsx` |
| `getMyBalance()` API call + `SelfLeaveBalance` type | `lib/api/leave.ts` |
| `useSelfLeaveBalance()` hook | `lib/api/hooks.ts` |
| `MyLeavesWidget` uses real balance API (replaced mock data) | `components/dashboard/MyLeavesWidget.tsx` |
| `LeaveBalanceBar` in LeavePage | `pages/Leave/LeavePage.tsx` |

#### Bugs fixed during Sprint 3 QA
1. **Middleware field stripping** — `updateProfileSchema` in `validation.schemas.ts` did not declare `emergency_contact_name/phone`, causing both fields to be stripped by `validateRequest()` middleware before reaching the controller. Added both fields to the schema.
2. **Frontend field name mismatch** — `MyLeavesWidget` and `LeavePage` accessed `balance.leaveType.name` (nested) and `balance.id` as key, but the API returns a flat `{ leaveTypeName, leaveTypeId }` shape. Updated both components to use the correct flat fields.

### Smoke Tests
- S3-T1 ✅ Save emergency contact
- S3-T2 ✅ GET profile persists emergency contact
- S3-T3 ✅ Partial PATCH preserves emergency contact
- S3-T4 ✅ GET /leave/balance/me returns balances
- S3-T5 ✅ Balance response has correct flat shape
- S3-T6 ✅ Emergency contact can be cleared
- S3-T7 ✅ Emergency contact can be re-set

---

## API Endpoints Added/Modified (Sprints 1–3)

See [docs/technical/API_REFERENCE_SPRINTS_1_3.md](../technical/API_REFERENCE_SPRINTS_1_3.md) for full endpoint reference.

| Method | Endpoint | Auth | Sprint |
|--------|----------|------|--------|
| `PATCH` | `/leave/{id}/status` | ADMIN/OWNER | S1 — CANCELLED status added |
| `POST` | `/attendance/checkin` | EMPLOYEE | S2 |
| `POST` | `/attendance/checkout` | EMPLOYEE | S2 |
| `GET` | `/attendance/me/summary` | EMPLOYEE | S2 |
| `POST` | `/attendance/corrections` | EMPLOYEE | S2 |
| `GET` | `/attendance/corrections/mine` | EMPLOYEE | S2 |
| `GET` | `/attendance/corrections` | ADMIN/OWNER | S2 |
| `PATCH` | `/attendance/corrections/{id}` | ADMIN/OWNER | S2 |
| `GET` | `/leave/balance/me` | EMPLOYEE | S3 |
| `PATCH` | `/users/me` | EMPLOYEE | S3 — emergency contact fields added |

---

## Definition of Done — All Sprints

- [x] Prisma migration applied to Cloud Run dev DB
- [x] Backend code compiled cleanly (TypeScript)
- [x] CI/CD pipeline green on `dev` branch
- [x] All 21 live smoke tests passing against dev environment
- [x] Frontend unit tests configured (Vitest)
- [x] Documentation updated (this file + REGRESSION_TEST_REPORT.md + API_REFERENCE_SPRINTS_1_3.md + ROADMAP.md)
