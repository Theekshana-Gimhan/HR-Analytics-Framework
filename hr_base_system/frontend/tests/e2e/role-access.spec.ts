import { test, expect } from '@playwright/test';

test.describe('Navigation access by role', () => {
  test('EMPLOYEE role should not see Payroll nav item', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 't', user: { id: 2, email: 'emp@test.local', role: 'EMPLOYEE' } }),
      });
    });

    await page.goto('/');
    await page.getByLabel(/work email/i).fill('emp@test.local');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByRole('link', { name: /payroll/i })).toHaveCount(0);
  });
});
