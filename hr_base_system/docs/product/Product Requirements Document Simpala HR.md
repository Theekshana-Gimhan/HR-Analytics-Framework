c# **Product Requirements Document: Simpala HR**

* **Version:** 1.0  
* **Date:** September 23, 2025  
* **Status:** Draft 
* **Stakeholders:** Development Team, Product Management, Co-founders

### **1\. Introduction & Vision**

#### **1.1. Overview**

This document outlines the product requirements for **Simpala HR**, a new, cloud-based Human Resources (HR) management system designed specifically for Small and Medium Businesses (SMBs) in Sri Lanka.

#### **1.2. Vision**

To become the default, simple, and affordable HR platform for SMBs in Sri Lanka, empowering them to manage their workforce efficiently and remain compliant with local labor laws without the complexity and cost of enterprise-grade software.

#### **1.3. The Problem**

Sri Lankan SMBs (10-100 employees) are the backbone of the economy but are critically underserved by HR technology. They face a significant dilemma:

* **International HR Systems** are prohibitively expensive, overly complex, and lack crucial Sri Lankan localizations (e.g., statutory payroll, leave policies).  
* **Local Enterprise-grade Systems** are powerful but still too costly and complex for a small business without a dedicated HR department.  
* The **Status Quo** is a chaotic mix of Excel spreadsheets, paper forms, and manual calculations, which is inefficient, prone to human error, and creates significant compliance risks regarding EPF, ETF, and PAYE regulations.

#### **1.4. The Opportunity**

There is a clear market gap for a solution that is:

* **Affordable:** Priced for the SMB budget.  
* **Simple:** Intuitive and easy to use for non-HR professionals (like business owners or admin managers).  
* **Hyper-Localized:** Built from the ground up to handle Sri Lankan labor laws and business norms automatically.

### **2\. Target Audience & User Personas**

Our primary users are the individuals within an SMB who are tasked with HR responsibilities, often in addition to their main role.

* **Persona 1: Nimal Perera, The Business Owner**  
  * **Role:** Owner of a 30-employee light manufacturing business.  
  * **Goals:** Ensure the business is compliant, reduce administrative overhead, control costs, and get a clear overview of his workforce (who is on leave, monthly salary costs).  
  * **Frustrations:** Wasting time on administrative paperwork, worrying about making costly mistakes with EPF/ETF payments, and the lack of a single source of truth for employee information.  
* **Persona 2: Anusha Silva, The Admin Manager**  
  * **Role:** Admin & Accounts Manager for a 50-person digital marketing agency. She is the "power user."  
  * **Goals:** Run monthly payroll accurately and on time, manage employee leave requests efficiently, maintain up-to-date employee records, and generate statutory reports without hassle.  
  * **Frustrations:** Manual data entry across multiple spreadsheets, chasing employees for leave forms, the tedious and error-prone process of calculating payroll with varying allowances and deductions.

### **3\. Goals & Objectives**

* **Product Goal:** Launch a Minimum Viable Product (MVP) that solves the most critical HR pain points for Sri Lankan SMBs: **Payroll & Leave Management**.  
* **Business Goal:** Acquire 100 paying SMB customers within 6 months of public launch.  
* **User Goal:** Reduce the time spent on monthly payroll processing by at least 80% compared to manual methods.

### **4\. Features & Requirements (MVP)**

The MVP will focus on four core, interconnected modules.

#### **4.1. Module 1: Core HR (Employee Database)**

This is the foundation of the system, providing a single source of truth for all employee data.

* **EPIC-01: Employee Profiles**  
  * **REQ-1.1 (User Story):** As Anusha, I want to create a comprehensive profile for each new employee, including personal details, contact information, job role, salary, and bank details, so all information is centralized and secure.  
  * **REQ-1.2 (User Story):** As Anusha, I want to upload and store important documents (e.g., National ID copy, appointment letter, certificates) to an employee's profile, so I can eliminate physical paperwork.  
  * **REQ-1.3 (User Story):** As Nimal, I want to see a simple, searchable directory of all employees with their basic contact information and job title.

#### **4.2. Module 2: Leave Management**

Automates the entire leave application and approval process with built-in Sri Lankan rules.

* **EPIC-02: Leave Policy & Tracking**  
  * **REQ-2.1 (User Story):** As Anusha, I want to configure standard Sri Lankan leave types (Annual, Casual, Medical) with correct accrual rules as per the Shop & Office Employees Act.  
  * **REQ-2.2 (User Story):** As an employee, I want to apply for leave through a mobile-friendly web interface and see my remaining leave balance.  
  * **REQ-2.3 (User Story):** As Nimal, I want to receive an email notification for leave requests and be able to approve or reject them with one click.  
  * **REQ-2.4 (User Story):** As Anusha, I want to view a company-wide leave calendar to see who is on leave at any given time for better resource planning.

#### **4.3. Module 3: Attendance Management**

Simple tracking to feed into payroll.

* **EPIC-03: Attendance Tracking**  
  * **REQ-3.1 (User Story):** As Anusha, I want to be able to manually mark attendance or bulk-upload attendance data from a simple CSV file (exported from a biometric machine), so I can track no-pay days.  
  * **REQ-3.2 (User Story):** As Anusha, I want the system to automatically flag attendance discrepancies (e.g., an employee marked as present but on approved leave) to prevent payroll errors.

#### **4.4. Module 4: Localized Payroll**

This is the killer feature of the MVP, designed to eliminate the biggest compliance headache.

* **EPIC-04: Automated Payroll Processing**  
  * **REQ-4.1 (User Story):** As Anusha, I want the system to automatically calculate monthly salaries, factoring in fixed allowances, deductions, and any no-pay days from the attendance module.  
  * **REQ-4.2 (User Story):** As Anusha, I want the system to **automatically calculate statutory deductions for EPF (8% employee, 12% employer) and ETF (3% employer)** for all relevant employees.  
  * **REQ-4.3 (User Story):** As Anusha, I want the system to calculate **PAYE (Pay As You Earn) tax** based on the latest government-mandated tax slabs.  
  * **REQ-4.4 (User Story):** As Anusha, I want to run the monthly payroll with one click and generate three key outputs:  
    1. Individual employee payslips (in PDF format).  
    2. A bank-ready salary transfer file (CIPS/SLIPS format).  
    3. Monthly EPF/ETF contribution reports.

### **5\. Design & UX Principles**

* **Simplicity First:** The interface must be clean, uncluttered, and intuitive for users who are not tech-savvy. Avoid jargon.  
* **Mobile-First:** While usable on a desktop, the experience should be optimized for mobile browsers, as many SMB owners and employees will access it via their smartphones.  
* **Guided Workflows:** Key processes like running payroll should be a step-by-step guided experience to prevent errors.  
* **Vibrant & Modern UI:** The look and feel should be professional yet engaging, using the "Energetic & Playful" color palette identified in the market analysis.

### **6\. Non-Functional Requirements**

* **Security:** All user data, especially personal and financial information, must be encrypted both in transit (SSL) and at rest.  
* **Performance:** The application must be fast and responsive, even on slower mobile internet connections common in Sri Lanka.  
* **Reliability:** The system must have an uptime of at least 99.8%. Payroll is a mission-critical function that cannot fail.  
* **Scalability:** The architecture should be able to handle a growing number of SMB clients without performance degradation.

### **7\. Success Metrics (KPIs)**

* **Activation Rate:** % of sign-ups who successfully set up their company and add at least 5 employees.  
* **Feature Adoption:** % of active companies that successfully run their monthly payroll through Simpala HR.  
* **Time-to-Value:** Average time it takes for a new company to run its first payroll.  
* **User Retention / Churn Rate:** % of customers who remain active after 3 months.  
* **Net Promoter Score (NPS):** Measure user satisfaction and likelihood to recommend.

### **8\. Future Roadmap (Out of Scope for MVP)**

The following features will be considered for future releases based on customer feedback and market demand:

* Direct Biometric Device Integration  
* Performance Management (Appraisals & Goals)  
* Recruitment & Onboarding Module  
* Employee Self-Service for profile updates  
* Expense Claims Management  
* Advanced HR Analytics & Reporting

