import { test, expect } from '@playwright/test';

test('Login shows error toast on invalid credentials', async ({ page }) => {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid credentials' }),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

  await page.getByLabel(/work email/i).fill('nope@test.local');
  await page.getByLabel(/password/i).fill('wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByText(/login failed/i)).toBeVisible();
});
