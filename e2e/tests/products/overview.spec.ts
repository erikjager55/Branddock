import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Products — Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test('products page loads with seed data', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Click the products sidebar item
    await page.click(`[data-section-id="${SECTIONS.products}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Verify the products grid is visible
    await expect(page.locator('[data-testid="products-grid"]')).toBeVisible({ timeout: 10_000 });
  });

  test('product list returns seed products via API', async ({ page }) => {
    const response = await page.request.get('/api/products');
    expect(response.status()).toBe(200);

    const data = await response.json();
    // Seed data has 3 products (Digital Platform Suite, Brand Strategy Consulting, Mobile App Framework)
    expect(data.products.length).toBeGreaterThanOrEqual(3);
  });

  test('product data has expected fields', async ({ page }) => {
    const response = await page.request.get('/api/products');
    expect(response.status()).toBe(200);

    const data = await response.json();
    const product = data.products[0];

    expect(product.name).toBeDefined();
    expect(typeof product.name).toBe('string');
    expect(product.category).toBeDefined();
    expect(Array.isArray(product.features)).toBe(true);
  });

  test('search filters products', async ({ page }) => {
    const response = await page.request.get('/api/products?search=Digital');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.products.length).toBeGreaterThanOrEqual(1);

    const names = data.products.map((p: { name: string }) => p.name);
    expect(names.some((n: string) => n.includes('Digital'))).toBe(true);
  });

  test('add product button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to products
    await page.click(`[data-section-id="${SECTIONS.products}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Verify the add product button is visible
    await expect(page.locator('[data-testid="add-product-button"]')).toBeVisible({ timeout: 10_000 });
  });

  test('member can access products API', async ({ page }) => {
    // Login as member instead of owner
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.member.email, password: TEST_USERS.member.password },
    });

    const response = await page.request.get('/api/products');
    expect(response.status()).toBe(200);
  });
});
