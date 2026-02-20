import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Campaigns — Content Library', () => {
  const createdIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test.afterEach(async ({ page }) => {
    for (const id of createdIds) {
      await page.request.delete(`/api/campaigns/${id}`).catch(() => {});
    }
    createdIds.length = 0;
  });

  test('content library API returns items', async ({ page }) => {
    const response = await page.request.get('/api/content-library');
    expect(response.status()).toBe(200);

    const data = await response.json();
    const items = data.items ?? data;
    expect(Array.isArray(items)).toBe(true);
  });

  test('content library stats', async ({ page }) => {
    const response = await page.request.get('/api/content-library/stats');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('totalContent');
    expect(data).toHaveProperty('complete');
    expect(data).toHaveProperty('inProgress');
    expect(typeof data.totalContent).toBe('number');
    expect(typeof data.complete).toBe('number');
    expect(typeof data.inProgress).toBe('number');
  });

  test('filter by type', async ({ page }) => {
    const response = await page.request.get('/api/content-library?type=blog-article');
    expect(response.status()).toBe(200);

    const data = await response.json();
    const items = data.items ?? data;
    expect(Array.isArray(items)).toBe(true);
  });

  test('filter by status', async ({ page }) => {
    const response = await page.request.get('/api/content-library?status=COMPLETED');
    expect(response.status()).toBe(200);

    const data = await response.json();
    const items = data.items ?? data;
    expect(Array.isArray(items)).toBe(true);
  });

  test('toggle favorite', async ({ page }) => {
    // Get the first item from the content library
    const listResponse = await page.request.get('/api/content-library');
    expect(listResponse.status()).toBe(200);

    const listData = await listResponse.json();
    const items = listData.items ?? listData;
    expect(Array.isArray(items)).toBe(true);

    if (items.length === 0) {
      test.skip();
      return;
    }

    const firstItemId = items[0].id;

    // Toggle favorite on
    const favoriteResponse = await page.request.patch(`/api/content-library/${firstItemId}/favorite`);
    expect(favoriteResponse.status()).toBe(200);

    // Toggle favorite back off
    const unfavoriteResponse = await page.request.patch(`/api/content-library/${firstItemId}/favorite`);
    expect(unfavoriteResponse.status()).toBe(200);
  });

  test('content library page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to content library via sidebar
    const sidebarLink = page.locator('[data-section-id="content-library"]');
    if (await sidebarLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sidebarLink.click();
    } else {
      // Fallback: navigate programmatically via campaigns section first
      await page.click(`[data-section-id="${SECTIONS.activeCampaigns}"]`);
      await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });
    }

    // Verify the create content button is visible
    await expect(
      page.locator('[data-testid="create-content-button"]'),
    ).toBeVisible({ timeout: 10_000 });
  });
});
