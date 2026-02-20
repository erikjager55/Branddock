import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Billing Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login via API
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });

    // Navigate to app and wait for dashboard
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
  });

  test('billing tab loads', async ({ page }) => {
    // Navigate via sidebar click to billing settings
    await page.click(`[data-section-id="${SECTIONS.settingsBilling}"]`);

    // Settings page and billing tab should be visible
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="billing-tab"]')).toBeVisible({ timeout: 10_000 });
  });

  test('billing plan API returns free beta', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/plan');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('isFreeBeta');
    expect(data.isFreeBeta).toBe(true);
  });

  test('current plan shows Free Beta', async ({ page }) => {
    // Navigate to billing settings
    await page.click(`[data-section-id="${SECTIONS.settingsBilling}"]`);
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="billing-tab"]')).toBeVisible({ timeout: 10_000 });

    // Plan name should contain "Free Beta"
    const planName = page.locator('[data-testid="plan-name"]');
    await expect(planName).toBeVisible({ timeout: 10_000 });
    await expect(planName).toContainText('Free Beta');
  });

  test('billing usage API', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/usage');

    expect(response.status()).toBe(200);
  });

  test('invoice history API', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/invoices');

    expect(response.status()).toBe(200);
  });
});
