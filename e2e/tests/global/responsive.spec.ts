import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Responsive Layout', () => {
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

  test('desktop layout shows sidebar and top nav', async ({ page }) => {
    // Default viewport is desktop size
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="top-nav"]')).toBeVisible({ timeout: 10_000 });
  });

  test('tablet viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    // App should still be functional at tablet size
    await expect(page.locator('[data-testid="top-nav"]')).toBeVisible({ timeout: 10_000 });
  });

  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // App should still render at mobile size
    await expect(page.locator('[data-testid="top-nav"]')).toBeVisible({ timeout: 10_000 });
  });

  test('large desktop viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="top-nav"]')).toBeVisible({ timeout: 10_000 });
  });
});
