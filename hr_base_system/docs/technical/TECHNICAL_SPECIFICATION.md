
# **Technical Specification: Simpala HR MVP**

*   **Version:** 1.0
*   **Date:** September 23, 2025

This document outlines the high-level technical architecture, non-functional requirements, and technology stack for the Simpala HR Minimum Viable Product (MVP).

---

### **1. Guiding Principles**

*   **Simplicity & Maintainability:** The architecture must be straightforward to enable rapid development, easy maintenance, and future scalability.
*   **Cloud-Native:** The system will be designed to run entirely on cloud infrastructure to ensure scalability, reliability, and accessibility.
*   **Mobile-First:** The user experience is optimized for mobile browsers, dictating a responsive and lightweight frontend architecture.

### **2. High-Level Architecture**

The system will be based on a modern, decoupled web application architecture.

*   **Frontend (Client-Side):** A Single Page Application (SPA) that communicates with the backend via a RESTful API.
*   **Backend (Server-Side):** A monolithic application that handles all business logic, data processing, and API endpoints. A microservices architecture is out of scope for the MVP but may be considered in the future.
*   **Database:** A relational database to store all application data, including user profiles, leave records, and payroll information.
*   **Infrastructure:** The entire system will be deployed and hosted on a major cloud provider.

### **3. Proposed Technology Stack**

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React (with a UI kit like Material-UI or Ant Design) | Component-based architecture for rapid UI development. Strong community support and mobile-responsive capabilities. Adheres to the "Vibrant & Modern UI" principle. |
| **Backend** | Node.js with Express.js | Efficient, non-blocking I/O is well-suited for a web application with many concurrent users. JavaScript on the backend allows for code-sharing and a unified development language. |
| **Database** | PostgreSQL | A robust, open-source relational database with strong support for data integrity, which is critical for financial and HR data. |
| **Caching** | In-Memory LRU (lru-cache) | Zero-cost application-level cache with TTL and LRU eviction. Provider interface allows swap to Redis when scaling to multiple instances. |
| **API** | RESTful API with JSON | Standard, well-understood protocol for communication between the frontend and backend. |
| **Deployment** | Docker | Containerizing the application will ensure consistency across development, testing, and production environments. |
| **Cloud Provider** | Amazon Web Services (AWS) | Provides a comprehensive suite of managed services (e.g., RDS for PostgreSQL, EC2/ECS for hosting, S3 for document storage) that reduces operational overhead. |

### **4. Non-Functional Requirements (NFRs)**

These are critical to the success of the product, especially given the mission-critical nature of payroll.

*   **Security:**
    *   All communication between the client and server must be encrypted using HTTPS (SSL/TLS).
    *   All sensitive employee data (e.g., personal identification, bank details) must be encrypted at rest in the database.
    *   Passwords must be securely hashed using a modern algorithm (e.g., bcrypt).
    *   Implement proper authorization checks on all API endpoints to prevent unauthorized data access.

*   **Performance:**
    *   API response times should be under 500ms for typical requests. Frequently accessed endpoints (dashboard, leave types, employee list) are cached in-memory with TTLs of 60s–5min, targeting <50ms for cache hits.
    *   The application frontend should achieve a First Contentful Paint (FCP) of under 2.5 seconds on a standard 3G mobile connection.

*   **Reliability:**
    *   The system must achieve **99.8% uptime**.
    *   Regular, automated backups of the database are mandatory.
    *   A monitoring and alerting system must be in place to notify the development team of any critical errors or downtime.

*   **Scalability:**
    *   The architecture must be horizontally scalable. The backend application should be stateless, allowing for multiple instances to run behind a load balancer.
    *   The database should be provisioned on a managed service (like AWS RDS) that allows for easy scaling.

### **5. Data & Integration**

*   **Document Storage:** Employee documents (as per REQ-1.2) will be stored securely in a cloud object storage service like Amazon S3, with access controlled via the backend.
*   **CSV Upload:** The system must provide a robust CSV parsing feature for bulk attendance uploads (REQ-3.1).
*   **Bank File Generation:** The system generates CIPS/SLIPS compatible CSV exports for salary disbursement (REQ-4.4), including validation of employee bank metadata and persistence of export audit records.

### **6. Leave Balance Tracking**

* **Data Model:** Introduces `EmployeeLeaveBalance` for the current accrued/used totals per leave type and `LeaveBalanceTransaction` for an immutable audit trail (`ACCRUAL`, `USAGE`, `ADJUSTMENT`, `REVERSAL`).
* **Accrual Logic:** Leave balances sync from employment start date using leave-type metadata (`default_balance`, `requires_anniversary`). Carry-forward values are preserved and new transactions capture every automated change.
* **Service Integration:** Leave application and approval flows now initialize balances, validate availability before approval, and emit usage/reversal transactions inside a single Prisma transaction.
* **API Surface:** Added `GET /api/v1/employees/{id}/leave-balance` (self-access for employees, administrative access for OWNER/ADMIN roles) returning normalized accrual, usage, carried-forward, and availability figures per leave type.

### **7. Bank File Export Service**

* **Data Model:** `BankFileExport` captures every generated file with `fileType (CIPS|SLIPS)`, `bankCode` (or `MULTI` for mixed batches), `month/year`, `totalRecords`, `totalAmount`, `checksum`, `fileName`, and the generating user/company. Employee records now persist structured bank metadata (`bank_name`, `bank_code`, `branch_code`, `account_number`).
* **Service Flow:** `POST /api/v1/payroll/bank-file` (ADMIN/OWNER) validates month/year/file type, optionally filters by bank codes, enforces complete bank metadata, and aggregates approved payslips for the period. CSV output is streamed to the client with audit headers while the database row is written inside the same transaction.
* **Formats:**
    * **CIPS** â€” Header: `RecordType,BankCode,BranchCode,AccountNumber,AccountName,Amount,Currency,Narrative,Reference`; each detail row starts with `D`, uses `LKR` as currency, and embeds a company-scoped reference.
    * **SLIPS** â€” Header: `Sequence,BankCode,BranchCode,AccountNumber,AccountName,Amount,Narrative,NIC`; rows include a sequential transaction ID and employee NIC for downstream bank reconciliation.
* **Validation:** Requests fail with `422` if any targeted employee record lacks required bank metadata, `404` if no payslips exist, and `404` when filters yield zero matches. Narration defaults to `Salary Payment <MM>/<YYYY>` but is overrideable (max 60 chars).
* **Security & Auditing:** Responses include `X-Export-Id`, `X-Total-Records`, and `X-Total-Amount` headers. SHA-256 checksums provide tamper detection, and Winston logging records all export events with company/user context.

