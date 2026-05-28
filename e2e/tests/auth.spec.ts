import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'password123';

test.describe('Authentication', () => {
  test('shows login page when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /login|войти/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login|войти/i }).click();
    await expect(page.locator('[role="alert"], .u-notification')).toBeVisible({ timeout: 5000 });
  });
});
