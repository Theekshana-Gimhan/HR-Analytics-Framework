### Documentation
- [Technical Documentation](docs/technical/) - Architecture, Specifications, Threat Models
- [Product Documentation](docs/product/) - Requirements, Roadmap, Personas
- [Operations Documentation](docs/ops/) - Deployment, Seeding, Secrets
- [Planning Documentation](docs/planning/) - Project Plans, Task Histories
- [QA Documentation](docs/QA/) - Testing Strategy, Bug Reports

For a complete index of all documentation, please refer to [docs/README.md](docs/README.md).
# Simpala HR Monorepo

This is the monorepo for the Simpala HR project, containing both the backend and frontend applications, along with shared packages and operations scripts.

## Project Structure

- **`SimpalaHR/backend`**: The Node.js/Express backend application.
- **`SimpalaHR/frontend`**: The React/Vite frontend application.
- **`packages/types`**: Shared TypeScript types used by both frontend and backend.
- **`ops`**: DevOps configuration, database migrations, and Cloud Build files.
- **`scripts`**: Utility scripts for deployment, testing, and seeding.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Docker (optional, for local containerized development)

### Installation

Install dependencies for all workspaces from the root:

```bash
npm install
```

### Running Locally

To run both backend and frontend in development mode:

```bash
# Start Backend (in a separate terminal)
cd SimpalaHR/backend
npm run dev

# Start Frontend (in a separate terminal)
cd SimpalaHR/frontend
npm run dev
```

## Deployment

Deployment scripts are located in the `scripts` directory. Refer to individual `README.md` files in `SimpalaHR/backend` and `SimpalaHR/frontend` for specific deployment instructions.
