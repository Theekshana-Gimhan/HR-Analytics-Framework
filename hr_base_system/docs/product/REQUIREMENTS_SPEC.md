# Simpala HR - Detailed Functional Specifications

**Status**: Draft
**Owner**: Business Analyst
**Last Updated**: 2026-02-03

This document provides the precise, developer-ready requirements for the features outlined in `TEAM_TASKS.md`.

---

## 1. Profile Requirements (M1.7)

### 1.1 User Stories
- **US-1.1**: As a User, I can change my password from the settings menu so that I can secure my account.
- **US-1.2**: As a User, I can view my payslips for the past 12 months so that I can verify my earnings.
- **US-1.3**: As an Employee, I can update my Emergency Contact details so that HR has the correct contact in case of emergency.
- **US-1.4**: As an Employee, I can view my Bank Details (read-only) to ensure my salary is deposited correctly.

### 1.2 Data Schema: Employee Profile
The following fields are mandatory for the Employee Profile entity.

| Field Name | Type | Required? | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `firstName` | String | Yes | Min 2 chars | Legal First Name |
| `lastName` | String | Yes | Min 2 chars | Legal Last Name |
| `nic` | String | Yes | Valid NIC Format (Old/New) | National Identity Card Number |
| `dateOfBirth` | Date | Yes | Age >= 16 | Date of Birth |
| `personalEmail`| Email | No | Valid Email | Personal contact email |
| `phoneMobile` | String | Yes | Valid Mobile Number | Primary contact number |
| `addressPermanent`| String | Yes | Min 10 chars | Permanent Home Address |
| `addressCurrent` | String | No | - | Current Residing Address (if different) |
| `emergencyContactName` | String | Yes | Min 2 chars | Name of emergency contact |
| `emergencyContactPhone`| String | Yes | Valid Mobile Number | Phone of emergency contact |
| `emergencyContactRelation`| Enum | Yes | (Spouse, Parent, Sibling, Friend, Other) | Relationship to employee |

### 1.3 Bank Details (Payroll)
These fields are critical for the `BankFileService`.

| Field Name | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `bankName` | Enum/String | Yes | Official Bank Name (e.g., "Commercial Bank") |
| `bankCode` | String | Yes | 4-digit Bank Code (e.g., "7004") |
| `branchName` | String | Yes | Branch Name |
| `branchCode` | String | Yes | 3-digit Branch Code (e.g., "001") |
| `accountNumber`| String | Yes | Numeric only (length varies by bank) |
| `accountName` | String | Yes | Name as per Bank Account |

---

## 2. Leave Concepts & Logic (M2.1)

### 2.1 Leave Types
- **Annual Leave**: 14 Days. Accrues monthly (1.16 days). Can be carried forward (Max 5 days).
- **Casual Leave**: 7 Days. Accrues monthly (0.58 days). usage limitation: Max 2 consecutive days.
- **Medical Leave**: 7 Days. Accrues monthly. Requires 'Medical Certificate' upload if > 2 days.

### 2.2 Validation Logic (Decision Table)

| Scenario | Leave Type | Condition | System Action | Error Message |
| :--- | :--- | :--- | :--- | :--- |
| **Friday Booking** | Casual | Employee applies for Friday | **Warning** | "Casual Leave is typically for urgent personal matters. Verify with policy." (Soft validation) |
| **Consecutive Days**| Casual | > 2 Days requested | **Block** | "Casual Leave cannot exceed 2 consecutive days. Use Annual Leave." |
| **Medical Proof** | Medical | > 2 Days requested AND No Document | **Block** | "Medical Certificate required for leave > 2 days." |
| **Probation** | Annual | Employee Status = PROBATION | **Block** | "Annual Leave is not available during probation. Use Casual/No-Pay." |
| **Insufficient Balance**| Any | Request > Balance | **Block** | "Insufficient leave balance. Available: [X]" |
| **Overlap** | Any | Dates overlap with existing APPROVED/PENDING request | **Block** | "Duplicate leave request detected for these dates." |

---

## 3. Payroll Specifications (M2.6)

### 3.1 Bank Output Formats
The system must generate strict fixed-width text files or CSVs.

#### SLIPS (Sri Lanka Interbank Payment System) Standard
Structure:
1.  **Header Record**: Originating Bank, Date, Total Amount, Total Count.
2.  **Detail Records**: One per employee.
    - `Reference` (12 chars)
    - `Bank Code` (4 chars)
    - `Branch Code` (3 chars)
    - `Account Number` (12 chars, padded)
    - `Amount` (12 digits, implied decimal)
    - `Name` (20 chars, truncated)
3.  **Trailer Record**: Checksums.

### 3.2 Tax Calculation (PAYE 2025 Slabs) - *Example*
*Note: Always verify with latest IRD circulars.*
- **Tax Free Threshold**: 100,000 LKR / month.
- **Slab 1**: Next 41,667 @ 6%
- **Slab 2**: Next 41,667 @ 12%
- **Slab 3**: Next 41,667 @ 18%
- **Slab 4**: Next 41,667 @ 24%
- **Slab 5**: Next 41,667 @ 30%
- **Balance**: @ 36%

---

## 4. Tenant & Admin Specifications (M3.2)

### 4.1 Roles & Permissions Matrix
| Feature | Super Admin | Company Owner | HR Manager | Employee |
| :--- | :---: | :---: | :---: | :---: |
| **Create Company** | âœ… | âŒ | âŒ | âŒ |
| **Edit Company Settings**| âœ… | âœ… | âŒ | âŒ |
| **Create User** | âœ… | âœ… | âœ… | âŒ |
| **View Audit Logs** | âœ… | âœ… | âŒ | âŒ |
| **Approve Leave** | âœ… | âœ… | âœ… | âŒ |
| **View Own Payslip** | âœ… | âœ… | âœ… | âœ… |
| **Run Payroll** | âŒ | âœ… | âœ… | âŒ |

### 4.2 Company Onboarding Workflow
1.  **Registration**: User signs up with Company Name, Admin Email.
2.  **Provisioning**: System creates `Tenant` record, creates `User` (Owner), seeds default `LeaveTypes`.
3.  **Setup Wizard**:
    - Step 1: Upload Logo.
    - Step 2: Set Work Week (Mon-Fri).
    - Step 3: Add First Employee.


