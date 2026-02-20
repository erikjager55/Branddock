import { test, expect } from '@playwright/test';
import { TEST_USERS, SECTIONS } from '../../fixtures/test-data';

test.describe('Business Strategy — Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });
  });

  test('strategy overview page loads with seed data', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
    await page.click(`[data-section-id="${SECTIONS.businessStrategy}"]`);

    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="strategy-grid"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('strategy stats are displayed', async ({ page }) => {
    const response = await page.request.get('/api/strategies/stats');
    expect(response.ok()).toBe(true);

    const stats = await response.json();
    expect(stats).toHaveProperty('active');
    expect(stats).toHaveProperty('onTrack');
    expect(stats).toHaveProperty('atRisk');
    expect(stats).toHaveProperty('currentPeriod');
  });

  test('strategy list returns seed strategies via API', async ({ page }) => {
    const response = await page.request.get('/api/strategies');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    const strategies = Array.isArray(body) ? body : body.strategies;
    expect(strategies.length).toBeGreaterThanOrEqual(1);
  });

  test('create strategy via API works', async ({ page }) => {
    const response = await page.request.post('/api/strategies', {
      data: {
        name: `E2E Test Strategy ${Date.now()}`,
        description: 'Created by E2E overview test',
        type: 'GROWTH',
      },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.strategy).toBeDefined();
    expect(body.strategy.name).toContain('E2E Test Strategy');

    // Cleanup
    if (body.strategy?.id) {
      await page.request.delete(`/api/strategies/${body.strategy.id}`).catch(() => {});
    }
  });

  test('strategy name is required', async ({ page }) => {
    const response = await page.request.post('/api/strategies', {
      data: {
        name: '',
        description: 'Missing name test',
        type: 'GROWTH',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('add strategy button is visible on page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
    await page.click(`[data-section-id="${SECTIONS.businessStrategy}"]`);

    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="add-strategy-button"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('member can access strategy API', async ({ page }) => {
    // Login as member instead
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.member.email,
        password: TEST_USERS.member.password,
      },
    });

    const response = await page.request.get('/api/strategies');
    expect(response.status()).toBe(200);
  });
});
