import { test, expect } from '@playwright/test';

test.describe('Leave request flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: { id: 1, email: 'user@test.local', role: 'ADMIN' },
        }),
      });
    });

    await page.route('**/leave/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 1, name: 'Annual', description: 'Annual leave allocation' },
            { id: 2, name: 'Casual', description: 'Casual leave' },
          ],
        }),
      });
    });

    await page.route('**/leave/requests', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 999, status: 'PENDING' }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('submits a leave request and shows success', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel(/work email/i).fill('user@test.local');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    // Wait for navigation after login
    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /leave/i }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main').getByRole('heading', { name: /leave/i })).toBeVisible();

    await page.getByLabel(/leave type id/i).fill('1');
    await page.getByLabel(/start date/i).fill('2025-10-16');
    await page.getByLabel(/end date/i).fill('2025-10-16');
    await page.getByRole('button', { name: /submit request/i }).click();

    await expect(page.getByText(/leave request submitted for approval/i)).toBeVisible();
  });
});
