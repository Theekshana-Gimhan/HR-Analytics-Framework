# Simpala HR Frontend (Vite + React)

The frontend client is built with [Vite](https://vitejs.dev/) and React 19. It consumes the Simpala HR backend APIs and is designed with a mobile-first approach.

## Prerequisites

- Node.js 20+
- npm 10+

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server on <http://localhost:3000>
- `npm run build` — create a production build in `dist`
- `npm run preview` — preview the production build locally
- `npm run test` — run unit/integration tests with Vitest
- `npm run lint` — run ESLint across the project
- `npm run typecheck` — validate TypeScript types without emitting output
- `npm run e2e` — run Playwright smoke tests headlessly (auto-starts Vite dev server)
- `npm run e2e:ui` — open the Playwright UI runner for interactive debugging
- `npm run e2e:report` — reopen the HTML report from the last E2E run

## Project Structure

```text
src/
  app/
    layout/        # App shell, error boundary, protected layout
    providers/     # Theme, feedback, and other top-level providers
  components/
    common/        # Reusable building blocks (loaders, etc.)
    ...            # Feature-specific modules
  config/           # environment-aware constants
  lib/              # shared libraries (API client, utils)
  main.tsx          # Vite entry point
```

## Testing

Vitest is configured with jsdom and Testing Library. Global utilities are registered through `src/setupTests.ts`.

```bash
npm run test
```

### Accessibility coverage

- Page-level routes expose skip-navigation support and focusable main content for keyboard users.
- Automated `axe-core` checks run via Vitest (`vitest-axe`) on representative screens; failing tests highlight WCAG violations during development.

### Interaction tests

- Navigation shell behaviour (skip link, active state) is validated with Testing Library to prevent regressions in keyboard flows.

### End-to-end tests

- Playwright powers the browser smoke suite in `tests/e2e`. The default configuration launches Chromium and, when `E2E_BASE_URL` is undefined, automatically boots the Vite dev server.
- Run `npm run e2e` to execute the suite headlessly. Results are captured in an HTML report (`playwright-report`) that you can reopen with `npm run e2e:report`.
- For local debugging, `npm run e2e:ui` starts Playwright's interactive runner.
- To point tests at an existing deployment (or a running backend), export `E2E_BASE_URL` before running the script. Any value skips the dev server bootstrap.
- Network calls to `/auth/login` and `/employees` are mocked in the smoke test so it can run offline, but you can remove the routes to exercise the real API.

## Linting & Formatting

ESLint (flat config) enforces React 19 + TypeScript best practices. Run:

```bash
npm run lint
```

## Performance Optimizations

- Routes are code-split with `React.lazy` in `App.tsx`, deferring feature bundles until navigation.
- `PageLoader` provides a consistent Suspense fallback inside the shell and router.
- `vite.config.ts` defines manual Rollup chunks (React, MUI, Emotion, Axios) to keep the main bundle lean and avoid 500 kB warnings.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL for backend API requests | `http://localhost:3001/api/v1` |
| `VITE_AUTH_STORAGE_KEY` | LocalStorage key for auth token | `token` |

All variables prefixed with `VITE_` are exposed to the client.
