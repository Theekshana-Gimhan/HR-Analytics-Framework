# Simpala HR Internal Documentation

This directory contains all project documentation, organized by domain.

## Structure
- **[Product](product/)**: Requirements, User Personas, Feature Lists, Roadmaps.
- **[Technical](technical/)**: System Architecture, API Specs, Database Design, Security.
- **[Operations (Ops)](ops/)**: Deployment Guides, Runbooks, Configuration.
- **[Quality Assurance (QA)](QA/)**: Test Strategies, Bug Reports.
- **[Planning](planning/)**: Execution Plans, Project Status, Sprint Logs.
- **[Archive](archive/)**: Deprecated or superseded documentation.

------

## Getting Started

### [Product Requirements Document Simpala HR.md](./product/Product%20Requirements%20Document%20Simpala%20HR.md) - **START HERE**

**Purpose**: Complete product vision, features, Sri Lankan compliance requirements, and business rules  
**When to use**: 
- Understanding business requirements and scope
- Sri Lankan payroll calculations (EPF, ETF, PAYE)
- Leave types and statutory minimums
- Compliance validation

---

## Architecture & Design

### [SOLUTION_ARCHITECTURE.md](./technical/SOLUTION_ARCHITECTURE.md)
**Purpose**: System architecture diagrams, component interactions, and data flows  
**When to use**:
- Understanding system structure and boundaries
- Database schema and relationships
- API architecture and authentication flows
- Multi-tenancy design

### [TECHNICAL_SPECIFICATION.md](./technical/TECHNICAL_SPECIFICATION.md)
**Purpose**: Technology stack, infrastructure decisions, and non-functional requirements  
**When to use**:
- Understanding tech stack (React 19, Express, Prisma, GCP)
- Performance and security requirements
- Infrastructure setup and scaling considerations

---

## Development Planning

### [ROADMAP.md](./product/ROADMAP.md)
**Purpose**: Development plan with priorities, timelines, and sprint status  
**When to use**:
- Planning next sprint or task
- Understanding project phases and dependencies
- Getting current delivery status summary

### [SPRINT_DELIVERY_REPORT.md](./planning/SPRINT_DELIVERY_REPORT.md)
**Purpose**: Detailed record of Sprint 1/2/3 deliverables, endpoints added, and bugs fixed  
**When to use**:
- Reviewing what was shipped in each sprint
- Understanding API changes and new fields
- Checking bug-fix rationale

### [API_REFERENCE_SPRINTS_1_3.md](./technical/API_REFERENCE_SPRINTS_1_3.md)
**Purpose**: Full API reference for all endpoints added in Sprints 1–3  
**When to use**:
- Integrating with new attendance, correction, emergency contact, or self-service balance endpoints
- Understanding request/response shapes for new features

### [TESTING_STRATEGY.md](./QA/TESTING_STRATEGY.md)
**Purpose**: Testing approach, tools, and coverage targets  
**When to use**:
- Writing new tests
- Understanding test infrastructure
- Setting up CI/CD testing
- Coverage goals and metrics

### [COMPLETE_FEATURE_LIST.md](./product/COMPLETE_FEATURE_LIST.md)
**Purpose**: Comprehensive list of all implemented and planned features
**When to use**:
- Feature inventory and status tracking
- Understanding what's built vs what's planned

---

## Supporting Documentation

### [USER_PERSONAS.md](./product/USER_PERSONAS.md)
**Purpose**: User roles, needs, and pain points  
**When to use**:
- Understanding user requirements
- Designing UX/UI
- Prioritizing features
- Writing user stories

### [MVP_SCOPE.md](./MVP_SCOPE.md)
**Purpose**: Original MVP scope and feature definitions  
**When to use**:
- Understanding project origins
- Scope validation
- Feature prioritization decisions

---

## Deployment & Operations

### [DEPLOYMENT_GUIDE.md](./ops/DEPLOYMENT_GUIDE.md)
**Purpose**: Production deployment procedures and environment configuration
**When to use**:
- Deploying to production or staging
- Environment variable setup
- Database migration procedures

### [FAST_DEPLOYMENT.md](./ops/FAST_DEPLOYMENT.md)
**Purpose**: Quick deployment workflows for active development
**When to use**:
- Rapid dev environment updates (5-7 min)
- Bypassing full CI/CD for quick testing
- Using `quick-deploy.ps1` scripts

### [SECRETS_SETUP.md](./ops/SECRETS_SETUP.md)
**Purpose**: Secret management and environment variable configuration
**When to use**:
- Setting up new environments
- Managing API keys and credentials
- Configuring Cloud Run secrets

### [GEMINI.md](./GEMINI.md)
**Purpose**: AI assistant conversation history and decisions  
**When to use**:
- Understanding implementation decisions
- Historical context
- Troubleshooting rationale

---

## Testing & Quality

### [DEVELOPER_TESTING_GUIDE.md](./QA/DEVELOPER_TESTING_GUIDE.md)
**Purpose**: Local testing workflows and debugging techniques
**When to use**:
- Running tests locally
- Debugging test failures
- Setting up test databases

### [E2E_TESTING_GUIDE.md](./QA/E2E_TESTING_GUIDE.md)
**Purpose**: Playwright E2E testing setup, credentials, and troubleshooting
**When to use**:
- Running end-to-end tests
- Testing against deployed environments
- Debugging UI automation issues
- Understanding test credentials and user roles

---

## Development Setup

### [DATABASE_SEEDING_GUIDE.md](./ops/DATABASE_SEEDING_GUIDE.md)
**Purpose**: Database setup, seeding strategies, and test data management
**When to use**:
- Setting up local development database
- Understanding seed data structure
- Creating realistic test scenarios

---

## Reference & Features

### [BANK_FILE_EXPORTS.md](./technical/BANK_FILE_EXPORTS.md)
**Purpose**: Sri Lankan bank file format specifications (CIPS, SLIPS)
**When to use**:
- Implementing payroll bank file exports
- Understanding bank file formats

---

## Quick Navigation by Role

### For Developers
1. **Starting a new task**: [ROADMAP.md](./product/ROADMAP.md)
2. **Understanding codebase**: [TECHNICAL_SPECIFICATION.md](./technical/TECHNICAL_SPECIFICATION.md) + [SOLUTION_ARCHITECTURE.md](./technical/SOLUTION_ARCHITECTURE.md)
3. **Writing tests**: [TESTING_STRATEGY.md](./QA/TESTING_STRATEGY.md)

### For Project Managers
1. **Sprint planning**: [ROADMAP.md](./product/ROADMAP.md)
2. **Status updates**: [documentation_status.md](./documentation_status.md)

### For Designers
1. **User needs**: [USER_PERSONAS.md](./product/USER_PERSONAS.md)
2. **Feature requirements**: [Product Requirements Document Simpala HR.md](./product/Product%20Requirements%20Document%20Simpala%20HR.md)
3. **Technical constraints**: [TECHNICAL_SPECIFICATION.md](./technical/TECHNICAL_SPECIFICATION.md)

---

## Archive
The archive/ folder contains historical documentation.

