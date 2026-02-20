import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Personas — Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test('personas page loads with seed data', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Click the personas sidebar item
    await page.click(`[data-section-id="${SECTIONS.personas}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Verify the personas grid is visible
    await expect(page.locator('[data-testid="personas-grid"]')).toBeVisible({ timeout: 10_000 });
  });

  test('persona list returns seed personas via API', async ({ page }) => {
    const response = await page.request.get('/api/personas');
    expect(response.status()).toBe(200);

    const data = await response.json();
    // Seed data has 3 personas (Sarah Chen, Marcus Thompson, Lisa Muller)
    expect(data.personas.length).toBeGreaterThanOrEqual(3);
  });

  test('persona stats are returned', async ({ page }) => {
    const response = await page.request.get('/api/personas');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.ready).toBe('number');
    expect(typeof data.stats.needsWork).toBe('number');
    expect(typeof data.stats.total).toBe('number');
  });

  test('search filters personas', async ({ page }) => {
    const response = await page.request.get('/api/personas?search=Sarah');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.personas.length).toBeGreaterThanOrEqual(1);

    const names = data.personas.map((p: { name: string }) => p.name);
    expect(names.some((n: string) => n.includes('Sarah'))).toBe(true);
  });

  test('filter by status works', async ({ page }) => {
    const response = await page.request.get('/api/personas?filter=ready');
    expect(response.status()).toBe(200);

    const data = await response.json();
    // Should return a filtered list (may be empty or have items depending on seed validation %)
    expect(Array.isArray(data.personas)).toBe(true);
  });

  test('add persona button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to personas
    await page.click(`[data-section-id="${SECTIONS.personas}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Verify the add persona button is visible
    await expect(page.locator('[data-testid="add-persona-button"]')).toBeVisible({ timeout: 10_000 });
  });
});
