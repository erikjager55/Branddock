import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Global Search', () => {
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

  test('search API returns results', async ({ page }) => {
    const response = await page.request.get('/api/search?query=brand');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('results');
  });

  test('quick actions API returns actions', async ({ page }) => {
    const response = await page.request.get('/api/search/quick-actions');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('search button opens search modal', async ({ page }) => {
    await page.click('[data-testid="topnav-search-button"]');
    await expect(page.locator('[data-testid="global-search-modal"]')).toBeVisible({ timeout: 5_000 });
  });

  test('search input accepts text', async ({ page }) => {
    await page.click('[data-testid="topnav-search-button"]');
    await expect(page.locator('[data-testid="global-search-modal"]')).toBeVisible({ timeout: 5_000 });
    const input = page.locator('[data-testid="global-search-input"]');
    await input.fill('test query');
    await expect(input).toHaveValue('test query');
  });

  test('escape closes search modal', async ({ page }) => {
    await page.click('[data-testid="topnav-search-button"]');
    await expect(page.locator('[data-testid="global-search-modal"]')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="global-search-modal"]')).not.toBeVisible({ timeout: 5_000 });
  });
});
