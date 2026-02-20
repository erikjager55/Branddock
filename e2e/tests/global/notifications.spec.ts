import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Notifications', () => {
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

  test('notification count API returns count', async ({ page }) => {
    const response = await page.request.get('/api/notifications/count');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('count');
    expect(typeof data.count).toBe('number');
  });

  test('notifications list API returns data', async ({ page }) => {
    const response = await page.request.get('/api/notifications');
    expect(response.status()).toBe(200);
  });

  test('notifications button visible in top nav', async ({ page }) => {
    await expect(page.locator('[data-testid="topnav-notifications-button"]')).toBeVisible({ timeout: 10_000 });
  });

  test('mark all notifications as read', async ({ page }) => {
    const response = await page.request.post('/api/notifications/mark-all-read');
    expect(response.status()).toBe(200);

    // Count should now be 0
    const countResponse = await page.request.get('/api/notifications/count');
    const countData = await countResponse.json();
    expect(countData.count).toBe(0);
  });

  test('clear all notifications', async ({ page }) => {
    const response = await page.request.delete('/api/notifications/clear');
    expect(response.status()).toBe(200);
  });
});
