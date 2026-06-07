import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_CANDIDATE_EMAIL ?? 'candidate@example.com';
const TEST_PASSWORD = process.env.E2E_CANDIDATE_PASSWORD ?? 'password123';

test.describe('Candidate Portal', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/candidate/dashboard');
    await expect(page).toHaveURL(/\/candidate\/login/);
  });

  test('logs in and loads candidate dashboard', async ({ page }) => {
    await page.goto('/candidate/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /login|войти|вход/i }).click();
    await expect(page).toHaveURL(/\/candidate\/dashboard/);
  });

  test('navigates to profile and preferences', async ({ page }) => {
    // Perform candidate login
    await page.goto('/candidate/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /login|войти|вход/i }).click();
    await page.waitForURL(/\/candidate\/dashboard/);

    // Nav to profile
    await page.getByRole('link', { name: /profile|профиль/i }).first().click();
    await expect(page).toHaveURL(/\/candidate\/profile/);

    // Nav to preferences
    await page.getByRole('link', { name: /preferences|предпочтения/i }).first().click();
    await expect(page).toHaveURL(/\/candidate\/preferences/);
  });
});
