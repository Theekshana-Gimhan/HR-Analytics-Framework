# API Reference — Sprints 1, 2 & 3 Additions

**Base URL:** `https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app/api/v1`  
**Auth:** All endpoints require `Authorization: Bearer <accessToken>` header.  
**Login:** `POST /auth/login` → `{ accessToken, refreshToken }`

---

## Leave Endpoints

### PATCH /leave/{id}/status
Update a leave request status (approve, reject, or cancel).

**Permission:** `LEAVE_REQUEST_APPROVE` (ADMIN or OWNER role)

**Path params:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Leave request ID |

**Request body:**
```json
{
  "status": "APPROVED" | "REJECTED" | "CANCELLED" | "PENDING"
}
```

**Response 200:**
```json
{
  "id": 102,
  "status": "CANCELLED",
  "leaveTypeId": 3,
  "startDate": "2028-10-15",
  "endDate": "2028-10-15",
  "employeeId": 78,
  "reason": "personal"
}
```

> **Sprint 1 change:** `CANCELLED` status enum value added. Previously only `PENDING`, `APPROVED`, `REJECTED` were accepted.

---

### GET /leave/balance/me *(Sprint 3)*
Returns the authenticated employee's current leave balances. No admin permission required.

**Permission:** Any authenticated EMPLOYEE user with a linked employee profile.

**Query params:** None

**Response 200:**
```json
{
  "employeeId": 78,
  "balances": [
    {
      "leaveTypeId": 1,
      "leaveTypeName": "Annual Leave",
      "accrued": 14,
      "used": 14,
      "carriedForward": 0,
      "available": 0,
      "requiresAnniversary": false
    },
    {
      "leaveTypeId": 2,
      "leaveTypeName": "Casual Leave",
      "accrued": 7,
      "used": 0,
      "carriedForward": 0,
      "available": 7,
      "requiresAnniversary": false
    },
    {
      "leaveTypeId": 3,
      "leaveTypeName": "Medical Leave",
      "accrued": 7,
      "used": 0,
      "carriedForward": 0,
      "available": 7,
      "requiresAnniversary": true
    }
  ]
}
```

**Important:** The response uses **flat** `leaveTypeName` and `leaveTypeId` strings — not a nested `leaveType: { name }` object.

**Errors:**
- `404` — Employee profile not linked to this user

---

## User / Profile Endpoints

### PATCH /users/me *(updated in Sprint 3)*
Update the authenticated user's profile. All fields are optional (partial update).

**Permission:** Any authenticated user.

**Request body (all optional):**
```json
{
  "first_name": "string",
  "last_name": "string",
  "phone_number": "string",
  "address": "string",
  "emergency_contact_name": "string",
  "emergency_contact_phone": "string"
}
```

> **Sprint 3 change:** `emergency_contact_name` and `emergency_contact_phone` fields added. Partial PATCH is safe — omitting these fields preserves the existing values.

**Response 200:**
```json
{
  "id": 82,
  "email": "test.s2b@simpala.lk",
  "role": "EMPLOYEE",
  "employee": {
    "id": 78,
    "first_name": "Test",
    "last_name": "Employee",
    "phone_number": "+94770000999",
    "emergency_contact_name": "Nimal Silva",
    "emergency_contact_phone": "+94771000001",
    "department": "Engineering"
  }
}
```

---

## Attendance Endpoints *(all Sprint 2)*

### POST /attendance/checkin
Record today's check-in time for the authenticated employee.

**Permission:** `ATTENDANCE_VIEW_OWN` (EMPLOYEE)

**Request body:** `{}` (empty JSON object)

**Response 200:**
```json
{
  "message": "Checked in successfully",
  "record": {
    "id": 2838,
    "employeeId": 78,
    "date": "2026-02-13T00:00:00.000Z",
    "checkInTime": "2026-02-13T08:32:10.000Z",
    "checkOutTime": null,
    "status": "PRESENT"
  }
}
```

**Errors:**
- `404` — Employee profile not linked to this user
- `409` — Already checked in today

---

### POST /attendance/checkout
Record today's check-out time for the authenticated employee.

**Permission:** `ATTENDANCE_VIEW_OWN` (EMPLOYEE)

**Request body:** `{}` (empty JSON object)

**Response 200:**
```json
{
  "message": "Checked out successfully",
  "record": {
    "id": 2838,
    "checkOutTime": "2026-02-13T17:00:45.000Z",
    "status": "PRESENT"
  }
}
```

**Errors:**
- `404` — Employee profile not linked, or no check-in found for today
- `409` — No check-in record to check out from

---

### GET /attendance/me/summary
Returns a monthly attendance summary for the authenticated employee.

**Permission:** `ATTENDANCE_VIEW_OWN` (EMPLOYEE)

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | integer 1–12 | No (defaults to current) | Month |
| `year` | integer | No (defaults to current) | Year |

**Response 200:**
```json
{
  "employeeId": 78,
  "month": 2,
  "year": 2026,
  "total": 1,
  "present": 1,
  "absent": 0,
  "late": 0,
  "halfDay": 0,
  "wfh": 0,
  "onLeave": 0
}
```

---

### POST /attendance/corrections
Create a correction request for an attendance record.

**Permission:** `ATTENDANCE_VIEW_OWN` (EMPLOYEE)

**Request body:**
```json
{
  "date": "2026-02-13",
  "requestedStatus": "WFH",
  "reason": "Was working from home but system shows PRESENT",
  "attendanceId": 2838
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `date` | string (ISO date) | **Yes** | Date of the attendance record to correct |
| `requestedStatus` | enum | **Yes** | `PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `WFH`, `ON_LEAVE` |
| `reason` | string (min 3 chars) | **Yes** | |
| `attendanceId` | integer | No | ID of the specific attendance record; enables status propagation on approval |

**Response 201:**
```json
{
  "id": 5,
  "employeeId": 78,
  "date": "2026-02-13T00:00:00.000Z",
  "requestedStatus": "WFH",
  "reason": "Was working from home",
  "status": "PENDING",
  "attendanceId": 2838,
  "adminNotes": null,
  "createdAt": "2026-02-13T09:15:00.000Z"
}
```

---

### GET /attendance/corrections/mine
Returns all correction requests submitted by the authenticated employee.

**Permission:** `ATTENDANCE_VIEW_OWN` (EMPLOYEE)

**Response 200:** Plain array of correction request objects (ordered by `createdAt DESC`).

```json
[
  {
    "id": 5,
    "date": "2026-02-13T00:00:00.000Z",
    "requestedStatus": "WFH",
    "status": "APPROVED",
    "reason": "Was WFH",
    "adminNotes": "Verified",
    "attendance": {
      "id": 2838,
      "status": "WFH",
      "checkInTime": "2026-02-13T08:32:10.000Z",
      "checkOutTime": "2026-02-13T17:00:45.000Z"
    }
  }
]
```

---

### GET /attendance/corrections
Returns all correction requests for the admin's company.

**Permission:** `ATTENDANCE_VIEW_ALL` (ADMIN or OWNER)

**Response 200:** Plain array (ordered by `createdAt DESC`), each item includes `employee` details.

```json
[
  {
    "id": 5,
    "date": "2026-02-13T00:00:00.000Z",
    "requestedStatus": "WFH",
    "status": "APPROVED",
    "reason": "Was WFH",
    "adminNotes": "Verified",
    "employee": {
      "id": 78,
      "first_name": "Test",
      "last_name": "Employee",
      "department": "Engineering"
    },
    "attendance": {
      "id": 2838,
      "status": "WFH",
      "checkInTime": "2026-02-13T08:32:10.000Z",
      "checkOutTime": "2026-02-13T17:00:45.000Z"
    }
  }
]
```

---

### PATCH /attendance/corrections/{id}
Approve or reject a correction request.

**Permission:** `ATTENDANCE_VIEW_ALL` (ADMIN or OWNER)

**Path params:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Correction request ID |

**Request body:**
```json
{
  "status": "APPROVED",
  "adminNotes": "Confirmed with employee"
}
```

| Field | Type | Required |
|-------|------|----------|
| `status` | `"APPROVED"` or `"REJECTED"` | **Yes** |
| `adminNotes` | string | No |

**Response 200:** Updated correction request object.

> **Side effect:** When `status=APPROVED` and the correction has an `attendanceId`, the linked `AttendanceRecord.status` is updated to match `requestedStatus`.

**Errors:**
- `400` — Invalid ID
- `404` — Correction not found or not in this company

---

## Document Endpoints *(Sprint 1 — category field)*

### POST /employees/{id}/documents
Upload a document for an employee.

**Permission:** `DOCUMENT_MANAGE` (ADMIN/OWNER) or `DOCUMENT_MANAGE_SELF` (employee for their own)

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | binary | **Yes** | PDF, JPG, or PNG |
| `category` | string | No | See `DocumentCategory` enum below |

**DocumentCategory enum values:**
- `MEDICAL_REPORT`
- `EPF_FORM`
- `POLICE_REPORT`
- `CONTRACT`
- `IDENTIFICATION`
- `OTHER` *(default)*

**Response 201:**
```json
{
  "id": 13,
  "originalName": "smoke_IDENTIFICATION_20260213123456.pdf",
  "mimeType": "application/pdf",
  "size": 42,
  "storageProvider": "GCS",
  "category": "IDENTIFICATION",
  "createdAt": "2026-02-13T09:00:00.000Z",
  "uploadedBy": 12
}
```

---

## Enums Added/Modified

### LeaveStatus *(Sprint 1)*
```
PENDING | APPROVED | REJECTED | CANCELLED
```

### AttendanceStatus *(Sprint 1)*
```
PRESENT | ABSENT | LATE | HALF_DAY | WFH | ON_LEAVE
```

### DocumentCategory *(Sprint 1 — new)*
```
MEDICAL_REPORT | EPF_FORM | POLICE_REPORT | CONTRACT | IDENTIFICATION | OTHER
```

### CorrectionStatus *(Sprint 2 — new)*
```
PENDING | APPROVED | REJECTED
```
