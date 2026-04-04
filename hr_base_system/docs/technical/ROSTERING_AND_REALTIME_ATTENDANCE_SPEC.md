# Functional Specification: Roster, Real-Time Attendance & Compliance

**Status**: **APPROVED** (Derived from CEO Directive)
**Date**: 2026-02-03
**Priority**: Critical / Immediate Phase

---

## 1. Executive Summary
Transformation of Simpala HR from a reactive system to a **proactive operational engine**. The goal is to manage workforce shifts, monitor attendance in real-time, and ensure statutory compliance (Shop & Office Act) automatically.

---

## 2. Core Feature Requirements

### 2.1 Shift & Roster Management (Priority: Highest)

#### 2.1.1 Roster Setup & Import
- **Bulk Upload**: Admin must be able to upload a CSV containing `EmployeeID, Date, StartTime, EndTime`.
- **Validation**: System must reject:
    - Invalid Employee IDs.
    - Dates in the past (unless "Correction Mode" is enabled).
    - EndTime < StartTime (unless crossing midnight).
    - Duplicate shifts for the same employee on the same day.

#### 2.1.2 Manual Shift Assignment (UI)
- **Drag-and-Drop Interface**: Calendar view to assign shifts.
- **Rules Engine (Prevent Save If)**:
    - **Overlap**: Employee already has a shift colliding with the new time.
    - **Rest Violation**: < 9 hours gap between previous shift end and new shift start (Shop & Office Act).
    - **Leave Conflict**: Employee has an APPROVED leave request for that date.

#### 2.1.3 Conflict & Blackout Engine
- **Blackout Threshold**: Prevent Leave Approval or Roster changes if `X%` of a department is absent.
- **Configurable**: Super-Admin sets `X%` (e.g., 20%).

### 2.2 Real-Time Attendance Module

#### 2.2.1 Biometric WebAuthn
- **Method**: Use device-native biometrics (FaceID/TouchID/Windows Hello) via WebAuthn standard.
- **Platform**: Must work on Mobile Web and Desktop. No external hardware.

#### 2.2.2 Intelligence Clock-In
- **Roster-Aware**: "Start Shift" button only active within `Start Window` (e.g., 15 mins before shift).
- **Soft Block**: Allow clock-in outside window but Auto-Flag for manager review.
- **Streak Engine**: Track consecutive "On-Time" arrivals. Visible to Employee.

#### 2.2.3 Dispute Workflow
- **Employee Action**: "Raise Dispute" for missed clock-ins or system errors.
- **Logic**: Auto-fill "Expected End Time" based on Roster.
- **Approval**: Manager must approve to finalize the attendance record.

### 2.3 Ghost Indicator (No-Show Scanner)

#### 2.3.1 Logic
- **Trigger**: Schedule job runs every 15 minutes.
- **Formula**:
    `CurrentTime > (Shift.StartTime + GracePeriod) AND Shift.Status == SCHEDULED`
- **Action**:
    1.  Mark Shift Status as `AT_RISK` or `NO_SHOW`.
    2.  Add to "Ghost List" for Admin.
    3.  Send "Nudge" (Email) to Employee/Manager.

### 2.4 Management Tools & Dashboards

#### 2.4.1 Compliance & Health
- **Statutory Runway Timer**: Countdown to next EPF/ETF remittance deadline.
- **Liquidity Speedometer**: Real-time running total of `(Basic Salary + Fixed Allowances + EPF 12% + ETF 3%)` for the current month.
- **Burnout Alerts**: Trigger if:
    - Worked > 6 consecutive days.
    - 100% Leave Balance remaining (Mid-Year check).

#### 2.4.2 Document Expiry
- **Tracked Docs**: Employment Contract, NIC, Medicals.
- **Automation**: Email Alert to HR `30 days` and `7 days` before expiry.

---

## 3. Data Architecture (Schema Plan)

### 3.1 New Models
```prisma
model ShiftTemplate {
  id        Int      @id @default(autoincrement())
  name      String   // "Morning A"
  startTime String   // "08:00"
  endTime   String   // "17:00"
  color     String   // Hex code
}

model EmployeeShift {
  id          Int       @id @default(autoincrement())
  employeeId  Int
  date        DateTime
  startTime   DateTime  // Planned Start
  endTime     DateTime  // Planned End
  
  // Real-Time
  actualIn    DateTime?
  actualOut   DateTime?
  isGhost     Boolean   @default(false)
  streakCount Int       @default(0) // Snapshot of streak at this shift
  
  status      ShiftStatus @default(SCHEDULED)
}

model ExpiryDocument {
  id          Int      @id @default(autoincrement())
  employeeId  Int
  type        DocType  // CONTRACT, NIC, MEDICAL
  expiryDate  DateTime
  fileUrl     String
  isNotified  Boolean  @default(false)
}
```

### 3.2 System Health (Admin Only)
- Monitor: `Last_Backup_Timestamp`, `Cron_Job_Status` (Ghost Scanner), `Pending_Migrations`.

---

## 4. User Stories for Development

### Epic: Rostering
- **US-R1**: As an HR Admin, I can upload a csv of shifts so that I don't have to manually enter 100+ shifts.
- **US-R2**: As a Manager, I cannot save a roster if an employee has < 9 hours rest, to ensure legal compliance.
- **US-R3**: As a Super Admin, I can set a "Blackout Threshold" (e.g. 20%) so that operations are not compromised by too many leaves.

### Epic: Attendance
- **US-A1**: As an Employee, I can clock in using FaceID on my phone.
- **US-A2**: As a System, I will flag an employee as a "Ghost" if they haven't clocked in 15 mins after shift start.
- **US-A3**: As a CEO, I can see a "Liquidity Speedometer" showing exactly how much payroll liability has accrued this month so far.

---

## 5. Sequencing (Immediate Sprint)
1.  **WebAuthn Integration** (Proof of Concept).
2.  **System Health Dashboard** (Foundation).
3.  **Statutory Runway Timer** (Quick Win).
4.  **Roster Database Implementation** (Core).

