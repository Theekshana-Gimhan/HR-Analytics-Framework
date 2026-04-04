import { test, expect } from '@playwright/test';

test.describe('Employee list search and pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 't', user: { id: 1, email: 'admin@test.local', role: 'ADMIN' } }),
      });
    });

    // Default first page
    await page.route('**/employees?**', async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search') || '';
      const pageParam = Number(url.searchParams.get('page') || '1');
      if (pageParam === 1 && !search) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              { id: 1, first_name: 'Anika', last_name: 'Fernando', job_title: 'HR Manager', phone_number: '...', address: '...' },
              { id: 2, first_name: 'Bimal', last_name: 'Jayawardena', job_title: 'Engineer', phone_number: '...', address: '...' },
            ],
          }),
        });
      } else if (pageParam === 2 && !search) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              { id: 3, first_name: 'Chamila', last_name: 'Perera', job_title: 'Designer', phone_number: '...', address: '...' },
            ],
          }),
        });
      } else if (search.toLowerCase().includes('anika')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              { id: 1, first_name: 'Anika', last_name: 'Fernando', job_title: 'HR Manager', phone_number: '...', address: '...' },
            ],
          }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
      }
    });
  });

  test('search filters and pagination navigates', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/work email/i).fill('admin@test.local');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.getByRole('link', { name: /employees/i }).click();
    await expect(page.getByRole('main').getByRole('heading', { name: /employees/i })).toBeVisible();

    // First page has Anika and Bimal
    await expect(page.getByText(/Anika Fernando/)).toBeVisible();
    await expect(page.getByText(/Bimal Jayawardena/)).toBeVisible();

    // Next page
    await page.getByRole('button', { name: /next page/i }).click();
    await expect(page.getByText(/Chamila Perera/)).toBeVisible();

    // Search
    await page.getByLabel(/search employees/i).fill('Anika');
    await expect(page.getByText(/Anika Fernando/)).toBeVisible();
    await expect(page.getByText(/Bimal Jayawardena/)).toHaveCount(0);
  });
});
