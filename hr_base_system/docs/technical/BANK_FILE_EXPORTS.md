# Bank File Export Guide

Generated: October 15, 2025

This document explains how Simpala HR produces Sri Lanka compliant CIPS and SLIPS salary transfer files via the `POST /api/v1/payroll/bank-file` endpoint.

## Overview

| Item | Details |
| --- | --- |
| Endpoint | `POST /api/v1/payroll/bank-file` |
| Roles | OWNER, ADMIN |
| Formats | `CIPS`, `SLIPS` |
| Output | CSV (download response) |
| Headers | `X-Export-Id`, `X-Total-Records`, `X-Total-Amount` |
| Persistence | Prisma `BankFileExport` table |

### Request Payload

```json
{
  "month": 9,
  "year": 2025,
  "fileType": "CIPS",
  "bankCodes": ["7056"],
  "narration": "Salary Payment 09/2025"
}
```

* `month` / `year` target the payslip period.
* `fileType` chooses the layout (`CIPS` or `SLIPS`).
* `bankCodes` (optional) restricts the export to specific Sri Lankan bank codes.
* `narration` (optional, max 60 characters) overrides the default `Salary Payment <MM>/<YYYY>` text.

### Validation Rules

1. At least one payslip must exist for the company/month/year.
2. Every included employee requires `bank_name`, `bank_code`, `branch_code`, and `account_number`.
3. Filtering by `bankCodes` must yield at least one record.
4. Requests failing validation return `422` (missing metadata) or `404` (no payslips/mismatched filters).

## CSV Layouts

### CIPS (Common Interbank Payment System)

Header: `RecordType,BankCode,BranchCode,AccountNumber,AccountName,Amount,Currency,Narrative,Reference`

| Column | Description |
| --- | --- |
| `RecordType` | Always `D` for detail rows. |
| `BankCode` | 4-digit Sri Lankan bank code (e.g., `7056`). |
| `BranchCode` | 3-digit branch code sourced from employee metadata. |
| `AccountNumber` | Employee account number (spaces removed). |
| `AccountName` | Employee full name. |
| `Amount` | Net pay rounded to 2 decimals. |
| `Currency` | Always `LKR`. |
| `Narrative` | Default `Salary Payment <MM>/<YYYY>` or provided narration. |
| `Reference` | `<CompanyName>-NNNN` detail sequence for reconciliation. |

#### Sample (CIPS)

```text
RecordType,BankCode,BranchCode,AccountNumber,AccountName,Amount,Currency,Narrative,Reference
D,7056,001,7056000001,Test Employee,46000.00,LKR,Salary Payment 09/2025,Simpala Tech Pvt Ltd-0001
```

### SLIPS (Sri Lanka Interbank Payment System)

Header: `Sequence,BankCode,BranchCode,AccountNumber,AccountName,Amount,Narrative,NIC`

| Column | Description |
| --- | --- |
| `Sequence` | 1-based running number. |
| `BankCode` | 4-digit Sri Lankan bank code (e.g., `7010`). |
| `BranchCode` | 3-digit branch code. |
| `AccountNumber` | Employee account number. |
| `AccountName` | Employee full name. |
| `Amount` | Net pay rounded to 2 decimals. |
| `Narrative` | Same behaviour as CIPS. |
| `NIC` | Employee NIC/passport number for bank reference. |

#### Sample (SLIPS)

```text
Sequence,BankCode,BranchCode,AccountNumber,AccountName,Amount,Narrative,NIC
1,7010,123,7010000002,Test Employee 2,52000.00,Salary Payment 09/2025,NIC123456789
```

## Audit Trail & Storage

* Each export inserts a row into `BankFileExport` with checksum (`SHA-256`), record totals, and file metadata.
* Responses surface the export ID via headers for quick cross-referencing.
* CSV content is not stored on disk by default; storage path remains `NULL` until an external storage provider is configured.

## Error Handling

| Status | Condition |
| --- | --- |
| `401` | Missing or invalid JWT. |
| `403` | Authenticated user lacks OWNER/ADMIN role. |
| `404` | No payslips found for the supplied month/year (or filters removed all records). |
| `422` | Employee bank metadata missing for at least one selected record. |
| `500` | Unexpected server error (logged with correlation ID). |

## Operational Checks

* Verify employee records include structured bank metadata (`bank_*` fields) before running exports.
* For dry runs, target a staging database and inspect the exported CSV plus the `BankFileExport` row.
* Automations can poll `BankFileExport` to retrieve metadata or re-trigger exports as needed.

