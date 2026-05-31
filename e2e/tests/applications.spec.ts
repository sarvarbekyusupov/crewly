import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'password123';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /login|войти/i }).click();
  await page.waitForURL(/\/dashboard/);
});

test.describe('Applications Pipeline', () => {
  test('navigates to applications list', async ({ page }) => {
    await page.getByRole('link', { name: /applications|отклики/i }).first().click();
    await expect(page).toHaveURL(/\/applications/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('verifies bulk action bar triggers on selection', async ({ page }) => {
    await page.goto('/applications');

    // Find checkboxes inside table rows to select multiple candidates
    const checkboxes = page.locator('table input[type="checkbox"]');
    if (await checkboxes.count() >= 2) {
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      // Verify bulk action bar becomes visible
      await expect(page.locator('[role="toolbar"]')).toBeVisible({ timeout: 5000 });
    }
  });
});
