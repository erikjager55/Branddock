import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Campaigns — Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test('campaign list API returns campaigns', async ({ page }) => {
    const response = await page.request.get('/api/campaigns');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.campaigns)).toBe(true);
    expect(data.campaigns.length).toBeGreaterThan(0);
  });

  test('campaign stats returns counts', async ({ page }) => {
    const response = await page.request.get('/api/campaigns/stats');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('active');
    expect(data).toHaveProperty('quick');
    expect(data).toHaveProperty('completed');
    expect(data).toHaveProperty('totalContent');
    expect(typeof data.active).toBe('number');
    expect(typeof data.quick).toBe('number');
    expect(typeof data.completed).toBe('number');
    expect(typeof data.totalContent).toBe('number');
  });

  test('filter by type returns only strategic', async ({ page }) => {
    const response = await page.request.get('/api/campaigns?type=STRATEGIC');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.campaigns)).toBe(true);
    for (const campaign of data.campaigns) {
      expect(campaign.type).toBe('STRATEGIC');
    }
  });

  test('filter by type returns only quick', async ({ page }) => {
    const response = await page.request.get('/api/campaigns?type=QUICK');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.campaigns)).toBe(true);
    for (const campaign of data.campaigns) {
      expect(campaign.type).toBe('QUICK');
    }
  });

  test('overview page loads with campaign cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to campaigns via sidebar
    await page.click(`[data-section-id="${SECTIONS.activeCampaigns}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Verify the campaigns grid is visible
    await expect(page.locator('[data-testid="campaigns-grid"]')).toBeVisible({ timeout: 10_000 });
  });

  test('new campaign and quick content buttons visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to campaigns via sidebar
    await page.click(`[data-section-id="${SECTIONS.activeCampaigns}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Verify both action buttons are visible
    await expect(page.locator('[data-testid="new-campaign-button"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="quick-content-button"]')).toBeVisible({ timeout: 10_000 });
  });

  test('search filter works via API', async ({ page }) => {
    const response = await page.request.get('/api/campaigns?search=nonexistent');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.campaigns)).toBe(true);
    // Searching for a nonexistent term should return empty or filtered results
    expect(data.campaigns.length).toBe(0);
  });
});
