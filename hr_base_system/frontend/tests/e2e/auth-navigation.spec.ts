import { test, expect } from '@playwright/test';

const mockLoginResponse = {
  token: 'mock-token',
  user: {
    id: 99,
    email: 'admin@simpala.test',
    role: 'ADMIN',
    firstName: 'Sasha',
    lastName: 'Perera',
  },
};

const mockEmployees = {
  items: [
    {
      id: 1,
      first_name: 'Anika',
      last_name: 'Fernando',
      job_title: 'HR Manager',
      phone_number: '+94 71 555 0101',
      address: 'Colombo 05',
    },
  ],
};

const mockDashboardStats = {
  totalEmployees: 10,
  activeEmployees: 8,
  pendingLeaves: 2,
  upcomingLeaves: [],
};

const mockLiquidity = {
  totalCost: 500000,
  breakdown: {
    accruedBasic: 400000,
    epfEtf: 100000,
  },
};

test.describe('Authentication and navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLoginResponse),
      });
    });

    await page.route('**/employees?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEmployees),
      });
    });

    await page.route('**/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardStats),
      });
    });

    await page.route('**/dashboard/liquidity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLiquidity),
      });
    });
  });

  test('signs in and views the employee directory', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/work email/i).fill('admin@simpala.test');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // App redirects to dashboard first
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Navigate to employees page from dashboard
    await page.getByRole('link', { name: /manage employees/i }).click();
    await page.waitForURL('**/employees');

    await expect(page.getByRole('main').getByRole('heading', { name: /employees/i })).toBeVisible();
    await expect(page.getByText(/Anika Fernando/)).toBeVisible();
    await expect(page.getByText(/HR Manager/)).toBeVisible();
  });
});
