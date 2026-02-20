import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Checkout Flow', () => {
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

  test('billing plan endpoint accessible', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/plan');

    expect(response.status()).toBe(200);
  });

  test('billing page shows current plan', async ({ page }) => {
    await page.click(`[data-section-id="${SECTIONS.settingsBilling}"]`);

    await expect(page.locator('[data-testid="billing-tab"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="plan-name"]')).toBeVisible({ timeout: 10_000 });
  });

  test('payment methods API accessible', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/payment-methods');

    expect(response.status()).toBe(200);
  });

  test('invoice history API accessible', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/invoices');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.invoices || data)).toBe(true);
  });
});
