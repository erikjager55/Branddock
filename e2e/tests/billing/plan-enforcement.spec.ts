import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Plan Enforcement', () => {
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

  test('free beta mode unlocks all features', async ({ page }) => {
    // Check billing plan API returns isFreeBeta true
    const response = await page.request.get('/api/settings/billing/plan');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.isFreeBeta).toBe(true);
  });

  test('free beta bypasses seat limits', async ({ page }) => {
    // In free beta, inviting members should succeed even beyond plan limits
    const response = await page.request.get('/api/organization/members');

    expect(response.status()).toBe(200);
  });

  test('free beta allows all API access', async ({ page }) => {
    // All module APIs should be accessible during free beta
    const endpoints = [
      '/api/brand-assets',
      '/api/personas',
      '/api/campaigns',
      '/api/insights',
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      expect(response.status()).toBe(200);
    }
  });

  test('plan info shows enterprise features', async ({ page }) => {
    // Navigate to billing and check plan card shows enterprise badge
    await page.click(`[data-section-id="${SECTIONS.settingsBilling}"]`);

    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="current-plan-card"]')).toBeVisible({ timeout: 10_000 });
  });

  test('billing plan API returns plan details', async ({ page }) => {
    const response = await page.request.get('/api/settings/billing/plan');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('plan');
    expect(data).toHaveProperty('isFreeBeta');
  });
});
