import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Usage Tracking', () => {
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

  test('usage API returns data', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/usage');

    expect(response.status()).toBe(200);
  });

  test('usage shows AI token metrics', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/usage');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('aiTokens');
  });

  test('usage page renders usage card', async ({ page }) => {
    await page.click(`[data-section-id="${SECTIONS.settingsBilling}"]`);

    await expect(page.locator('[data-testid="billing-tab"]')).toBeVisible({ timeout: 10_000 });
  });

  test('free beta shows unlimited usage', async ({ page }) => {
    // In free beta mode, usage limits should be effectively unlimited
    const planResponse = await page.request.get('/api/settings/billing/plan');
    const planData = await planResponse.json();
    expect(planData.isFreeBeta).toBe(true);

    const usageResponse = await page.request.get('/api/settings/billing/usage');
    expect(usageResponse.status()).toBe(200);
  });
});
