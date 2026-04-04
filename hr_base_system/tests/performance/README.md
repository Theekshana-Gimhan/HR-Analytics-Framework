# Performance Testing with k6

This directory contains k6 performance test scripts for the Simpala HR Backend.

## Prerequisites

1.  **Install k6**:
    - **Windows**: `winget install gnu.k6` or download the MSI from [k6.io](https://k6.io/docs/getting-started/installation/).
    - **Mac**: `brew install k6`
    - **Linux**: See official docs for your distribution.

## Test Scripts

- `smoke.js`: A minimal load test used to verify the system's health and baseline performance under any load.
- `load.js`: Simulates a typical peak workday with ramping virtual users (VUs) up to 50 concurrent users.
- `stress.js`: Pushes the system to its limits (100+ VUs) to identify the breaking point and recovery behavior.

## How to Run

Before running, ensure you have the backend URL and valid credentials.

### 1. Set Environment Variables
The scripts use environment variables for configuration. You can set them in your terminal or pass them via `-e`.

Example variables:
- `BASE_URL`: The API root (e.g., `https://simpalahr-backend-dev-wxbl5wur4q-uc.a.run.app`)
- `ADMIN_EMAIL`: Email for authentication (default: `admin@simpala.lk`)
- `ADMIN_PASSWORD`: Password (default: `password123`)

### 2. Execute Tests

**Smoke Test**:
```bash
k6 run smoke.js -e BASE_URL=http://localhost:3001
```

**Load Test**:
```bash
k6 run load.js -e BASE_URL=https://your-api-url.com
```

**Stress Test**:
```bash
k6 run stress.js -e BASE_URL=https://your-api-url.com
```

## Metrics to Watch

- **p(95) Latency**: Should be < 500ms for typical requests.
- **Error Rate**: Should be < 1%.
- **Throughput (RPS)**: Requests per second the system can handle stably.
