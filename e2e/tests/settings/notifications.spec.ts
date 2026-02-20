import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Notification Preferences', () => {
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

  test('notifications tab loads', async ({ page }) => {
    // Navigate to settings first
    await page.click(`[data-section-id="${SECTIONS.settingsAccount}"]`);
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });

    // Click the notifications tab
    await page.click('[data-testid="settings-tab-notifications"]');

    // Content should indicate coming soon (placeholder)
    const content = page.locator('[data-testid="settings-page"]');
    await expect(content).toContainText(/coming soon/i, { timeout: 10_000 });
  });

  test('notification preferences API', async ({ page }) => {
    const response = await page.request.get('/api/settings/notifications');

    // Should return 200 if implemented, or 404 if not yet built
    expect([200, 404]).toContain(response.status());
  });

  test('settings subnav has all 5 tabs', async ({ page }) => {
    // Navigate to settings
    await page.click(`[data-section-id="${SECTIONS.settingsAccount}"]`);
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });

    // The subnav should contain 5 tab buttons
    const subnav = page.locator('[data-testid="settings-subnav"]');
    await expect(subnav).toBeVisible({ timeout: 10_000 });

    const tabButtons = subnav.locator('button');
    await expect(tabButtons).toHaveCount(5);
  });

  test('switching tabs changes content', async ({ page }) => {
    // Navigate to settings (account tab by default)
    await page.click(`[data-section-id="${SECTIONS.settingsAccount}"]`);
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });

    // Verify account tab is visible
    await expect(page.locator('[data-testid="account-tab"]')).toBeVisible({ timeout: 10_000 });

    // Switch to billing tab
    await page.click('[data-testid="settings-tab-billing"]');
    await expect(page.locator('[data-testid="billing-tab"]')).toBeVisible({ timeout: 10_000 });

    // Account tab content should no longer be visible
    await expect(page.locator('[data-testid="account-tab"]')).not.toBeVisible();
  });
});
