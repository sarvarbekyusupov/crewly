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

test.describe('Jobs', () => {
  test('navigates to jobs list', async ({ page }) => {
    await page.getByRole('link', { name: /jobs|вакансии/i }).first().click();
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('create job form loads', async ({ page }) => {
    await page.goto('/jobs/create');
    await expect(page.getByLabel(/title|название/i)).toBeVisible();
    await expect(page.getByLabel(/description|описание/i)).toBeVisible();
  });

  test('creates a job', async ({ page }) => {
    await page.goto('/jobs/create');
    await page.getByLabel(/title|название/i).fill('E2E Test Job');
    await page.getByLabel(/description|описание/i).fill('Automated test job description');
    await page.getByRole('button', { name: /create|создать/i }).click();
    await expect(page).toHaveURL(/\/jobs\/[a-z0-9-]+/);
  });
});
