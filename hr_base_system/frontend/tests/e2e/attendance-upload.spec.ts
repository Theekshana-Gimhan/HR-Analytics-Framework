import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('Attendance upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 't', user: { id: 1, email: 'admin@test.local', role: 'ADMIN' } }),
      });
    });

    await page.route('**/attendance/bulk', async (route) => {
      if (route.request().method() === 'POST') {
        const url = new URL(route.request().url());
        // Simulate success
        if (url) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
          return;
        }
      }
      await route.continue();
    });
  });

  test('uploads a CSV successfully', async ({ page }) => {
    // Prepare temp CSV
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-att-'));
    const filePath = path.join(dir, 'attendance.csv');
    fs.writeFileSync(filePath, 'employee_id,date,status\n1,2025-10-01,PRESENT\n');

    await page.goto('/');
    await page.getByLabel(/work email/i).fill('admin@test.local');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.getByRole('link', { name: /attendance/i }).click();
    await expect(page.getByRole('main').getByRole('heading', { name: /attendance/i })).toBeVisible();

    // Select CSV and upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /select csv/i }).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(filePath);

    await page.getByRole('button', { name: /upload file/i }).click();
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible();
  });

  test('shows error when no file selected', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/work email/i).fill('admin@test.local');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.getByRole('link', { name: /attendance/i }).click();
    await expect(page.getByRole('main').getByRole('heading', { name: /attendance/i })).toBeVisible();

    await page.getByRole('button', { name: /upload file/i }).click();
    await expect(page.getByText(/please choose a csv file/i)).toBeVisible();
  });
});
