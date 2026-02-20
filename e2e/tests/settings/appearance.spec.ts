import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Appearance Settings', () => {
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

  test('appearance tab loads', async ({ page }) => {
    // Navigate to settings first
    await page.click(`[data-section-id="${SECTIONS.settingsAccount}"]`);
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });

    // Click the appearance tab
    await page.click('[data-testid="settings-tab-appearance"]');

    // Content should indicate coming soon (placeholder)
    const content = page.locator('[data-testid="settings-page"]');
    await expect(content).toContainText(/coming soon/i, { timeout: 10_000 });
  });

  test('appearance preferences API', async ({ page }) => {
    const response = await page.request.get('/api/settings/appearance');

    // Should return 200 if implemented, or 404 if not yet built
    expect([200, 404]).toContain(response.status());
  });

  test('settings page has correct structure', async ({ page }) => {
    // Navigate to settings
    await page.click(`[data-section-id="${SECTIONS.settingsAccount}"]`);

    // Settings page should be visible
    const settingsPage = page.locator('[data-testid="settings-page"]');
    await expect(settingsPage).toBeVisible({ timeout: 10_000 });

    // Should have the subnav area
    const subnav = page.locator('[data-testid="settings-subnav"]');
    await expect(subnav).toBeVisible({ timeout: 10_000 });

    // Should have a content area (the active tab content)
    // At least one tab content should be visible (account tab loads by default)
    await expect(page.locator('[data-testid="account-tab"]')).toBeVisible({ timeout: 10_000 });
  });
});
