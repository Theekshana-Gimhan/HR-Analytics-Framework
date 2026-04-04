
# **Solution Architecture: Simpala HR MVP**

*   **Version:** 1.0
*   **Date:** September 23, 2025
*   **Author:** Gemini AI (Solution Architect)

This document provides a detailed architectural design for the Simpala HR platform, expanding on the initial Technical Specification.

---

### **1. Architectural Vision & Style**

For the MVP, we will adopt a **Pragmatic Monolith** architecture. This choice is deliberate to prioritize development speed, simplicity of deployment, and ease of initial maintenance.

*   **Why a Monolith First?**
    *   **Speed:** A single codebase and deployment pipeline allows the team to build and iterate on core features much faster than a distributed microservices architecture.
    *   **Simplicity:** Reduces the cognitive overhead for a small development team. There is no need to manage inter-service communication, distributed transactions, or separate deployment pipelines for multiple services.
    *   **Cost-Effective:** A monolithic deployment is initially cheaper to host and manage.

*   **Path to Microservices:** The monolith will be designed with clear logical boundaries between modules (Core HR, Leave, Attendance, Payroll). This modular design will make it significantly easier to refactor and extract services into a microservices architecture in the future as the product scales and the team grows.

### **2. System Components Deep Dive**

![System Architecture Diagram](https://i.imgur.com/example-diagram.png)  
*(Note: A proper diagram would be generated and linked here)*

#### **2.1. Frontend: React Single Page Application (SPA)**
*   **Framework:** React.js
*   **State Management:** React Context for simple state sharing (e.g., logged-in user). For more complex state, a library like Zustand or Redux Toolkit will be considered.
*   **UI Component Library:** Material-UI (MUI) to enforce Material Design principles, ensuring a modern, responsive, and mobile-first UI.
*   **Responsibilities:**
    *   Render the user interface.
    *   Handle all user interactions.
    *   Manage client-side state.
    *   Communicate with the backend via RESTful API calls.
    *   Perform client-side validation for a more responsive user experience.

#### **2.2. Backend: Node.js Monolith**
*   **Framework:** Express.js
*   **Language:** TypeScript for type safety and improved code quality.
*   **Responsibilities:**
    *   **API Layer:** Expose RESTful endpoints for the frontend.
    *   **Authentication & Authorization:** Secure the API and handle user access.
    *   **Caching Layer:** In-memory LRU cache (`lru-cache`) with a `CacheProvider` interface for future Redis migration. Express middleware auto-caches GET responses by `companyId` with TTL-based expiration and mutation-triggered invalidation.
    *   **Business Logic Layer:** Contain the core application logic, separated by modules:
        *   `CoreHRService`: Manages employee data (CRUD operations).
        *   `LeaveService`: Manages leave policies, applications, and balances.
        *   `AttendanceService`: Processes attendance data.
        *   `PayrollService`: The most critical component. Orchestrates the entire payroll run, calculates salaries, taxes, and statutory deductions.
    *   **Data Access Layer (DAL):** Use an ORM like Prisma or TypeORM to interact with the PostgreSQL database, abstracting away raw SQL queries.

#### **2.3. Database: PostgreSQL**
*   **Hosting:** To be hosted on Amazon RDS for managed backups, scaling, and reliability.
*   **Preliminary Data Model (Simplified):**
    *   `Company`: (id, name, address)
    *   `User`: (id, company_id, email, password_hash, role: 'owner' | 'admin' | 'employee')
    *   `Employee`: (id, user_id, first_name, last_name, nic, job_title, salary, bank_details, ...)
    *   `LeaveType`: (id, company_id, name: 'Annual' | 'Casual' | 'Medical', default_balance)
    *   `LeaveRequest`: (id, employee_id, leave_type_id, start_date, end_date, status: 'pending' | 'approved' | 'rejected')
    *   `AttendanceRecord`: (id, employee_id, date, status: 'present' | 'absent')
    *   `Payslip`: (id, employee_id, month, year, gross_pay, epf_employee, epf_employer, etf, paye, net_pay, ...)

### **3. API Design (Illustrative)**

All APIs will be versioned (e.g., `/api/v1/...`).

*   `POST /api/v1/auth/login` - Authenticate a user, return JWT.
*   `GET /api/v1/employees` - Get a list of all employees.
*   `POST /api/v1/employees` - Create a new employee.
*   `GET /api/v1/employees/:id` - Get details for a single employee.
*   `POST /api/v1/leave/requests` - Submit a new leave request.
*   `PUT /api/v1/leave/requests/:id/status` - Approve or reject a leave request.
*   `POST /api/v1/payroll/run` - Initiate a new monthly payroll run.
*   `GET /api/v1/payroll/payslips/:id` - Download a specific payslip PDF.

### **4. Security Architecture**

*   **Authentication:** User authentication will be handled using JSON Web Tokens (JWT). Upon successful login, a short-lived access token and a long-lived refresh token will be issued.
*   **Authorization:** Role-Based Access Control (RBAC) will be implemented via middleware in the backend. Routes and services will be protected based on user roles (e.g., only an 'admin' or 'owner' can run payroll).
*   **Data Security:**
    *   **In Transit:** All traffic will be forced over HTTPS (SSL/TLS).
    *   **At Rest:** Sensitive fields in the database (e.g., employee NIC, bank account numbers) will be encrypted using symmetric encryption (e.g., AES-256). Document uploads to S3 will also be encrypted at rest.

### **5. Deployment & Infrastructure (AWS)**

1.  **User Request:** A user accesses the Simpala HR domain via Route 53.
2.  **CDN:** The request is routed to CloudFront, which serves the static React frontend assets.
3.  **Load Balancer:** API calls from the frontend are directed to an Application Load Balancer (ALB).
4.  **Compute:** The ALB distributes traffic across multiple EC2 instances running the Dockerized Node.js application in an Auto Scaling Group.
5.  **Database:** The application reads/writes from a primary PostgreSQL instance on RDS. A read replica can be added later for scalability.
6.  **Storage:** Employee documents are uploaded to and served from a private S3 bucket, with access brokered by the backend to ensure security.

### **6. Observability**

*   **Logging:** A structured logging library (like Winston or Pino) will be used in the Node.js application. Logs will be aggregated in AWS CloudWatch for centralized analysis and searching.
*   **Monitoring:** Key application and infrastructure metrics (CPU utilization, memory, API latency, error rates) will be monitored via CloudWatch Dashboards. Cache statistics (hit rate, size, hits/misses) are exposed via the `/health` endpoint.
*   **Alerting:** CloudWatch Alarms will be configured to automatically notify the development team via SNS (Simple Notification Service) of critical issues, such as high error rates, application downtime, or unusual resource utilization.

