import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --host',
        port: 3000,
        reuseExistingServer: !isCI,
        env: {
          ...process.env,
          VITE_API_BASE_URL:
            process.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1',
        },
      },
});
