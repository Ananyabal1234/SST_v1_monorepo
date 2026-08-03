import { test, expect } from '@playwright/test';

const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const qaPass = process.env.SST_QA_PASSWORD || 'TestUser123!';

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test.describe('Smoke / role landing (P1)', () => {
  test('TC-SMK-002: login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Talent Analytics' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('TC-SMK-012: invalid login shows error', async ({ page }) => {
    await signIn(page, 'nobody@sst.test', 'WrongPass123!');
    await expect(page.locator('.login-error')).toContainText(/Invalid credentials/i);
  });

  test('TC-SMK-003: admin login reaches dashboard with Users tab', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'SEED_ADMIN_* required');
    await signIn(page, adminEmail!, adminPassword!);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Request', exact: true })).toBeVisible();
  });

  test('TC-SMK-004: sales login shows Add Request / Requirements / Task History', async ({
    page,
  }) => {
    await signIn(page, 'qa.sales@sst.test', qaPass);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: 'Add Request', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Requirements', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Task History', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toHaveCount(0);
  });

  test('TC-SMK-006: TA login shows Assign Task only (secondary)', async ({ page }) => {
    await signIn(page, 'qa.ta@sst.test', qaPass);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: 'Assign Task', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Request', exact: true })).toHaveCount(0);
  });

  test('TC-SMK-007: TA Lead shows Requirements & Pipeline + Assign Task', async ({ page }) => {
    await signIn(page, 'qa.talead@sst.test', qaPass);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('button', { name: 'Requirements & Pipeline', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assign Task', exact: true })).toBeVisible();
  });

  test('TC-SMK-008: HR login shows Offer and Onboarding', async ({ page }) => {
    await signIn(page, 'qa.hr@sst.test', qaPass);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: 'Offer', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Onboarding', exact: true })).toBeVisible();
  });
});
