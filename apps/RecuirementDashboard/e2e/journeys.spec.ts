import { test, expect } from '@playwright/test';

/**
 * J1–J3 UI smoke: open the primary screen for each journey role.
 * Full form fills stay in the manual catalog / API integration suite.
 */
test.describe('J1–J3 journey screens (P1 smoke)', () => {
  const qaPass = process.env.SST_QA_PASSWORD || 'TestUser123!';

  async function signIn(
    page: import('@playwright/test').Page,
    email: string,
  ) {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(qaPass);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }

  test('J1: Sales can open Add Request', async ({ page }) => {
    await signIn(page, 'qa.sales@sst.test');
    await page.getByRole('button', { name: 'Add Request', exact: true }).click();
    await expect(page.getByText(/Add Recruitment Request|Recruitment Request/i)).toBeVisible();
  });

  test('J2: TA can open Assign Task', async ({ page }) => {
    await signIn(page, 'qa.ta@sst.test');
    await page.getByRole('button', { name: 'Assign Task', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Assign Task', exact: true })).toBeVisible();
  });

  test('J3: HR can open Offer then Onboarding', async ({ page }) => {
    await signIn(page, 'qa.hr@sst.test');
    await page.getByRole('button', { name: 'Offer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Offer', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Onboarding', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Onboarding', exact: true })).toBeVisible();
  });
});
