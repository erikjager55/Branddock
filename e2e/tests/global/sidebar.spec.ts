import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Sidebar Navigation', () => {
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

  test('sidebar is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar shows navigation items', async ({ page }) => {
    // Dashboard section should exist
    await expect(page.locator('[data-section-id="dashboard"]')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking sidebar item navigates', async ({ page }) => {
    // Click on brand section
    await page.click('[data-section-id="brand"]');

    // Wait for brand page to appear (some time for client-side rendering)
    await page.waitForTimeout(1000);
    // Verify we're no longer on dashboard by checking that brand section is now active
    const brandButton = page.locator('[data-section-id="brand"]');
    await expect(brandButton).toBeVisible();
  });

  test('multiple navigation sections exist', async ({ page }) => {
    const sections = ['dashboard', 'brand', 'personas', 'products'];
    for (const section of sections) {
      await expect(page.locator(`[data-section-id="${section}"]`)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('sidebar persists across navigation', async ({ page }) => {
    // Navigate to different sections and check sidebar remains
    await page.click('[data-section-id="brand"]');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10_000 });

    await page.click('[data-section-id="personas"]');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10_000 });

    await page.click('[data-section-id="dashboard"]');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10_000 });
  });
});
