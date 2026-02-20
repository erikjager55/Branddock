import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Products — Analyzer', () => {
  const createdProductIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up any products created during tests
    for (const id of createdProductIds) {
      await page.request.delete(`/api/products/${id}`).catch(() => {});
    }
    createdProductIds.length = 0;
  });

  test('product analyzer page renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to products, then to analyzer
    await page.click(`[data-section-id="${SECTIONS.products}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Click add product to open analyzer
    await page.click('[data-testid="add-product-button"]');
    await page.waitForSelector('[data-testid="product-analyzer"]', { timeout: 10_000 });

    await expect(page.locator('[data-testid="product-analyzer"]')).toBeVisible();
  });

  test('analyzer tabs are accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    await page.click(`[data-section-id="${SECTIONS.products}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    await page.click('[data-testid="add-product-button"]');
    await page.waitForSelector('[data-testid="product-analyzer"]', { timeout: 10_000 });

    // Verify all three analyzer tabs are visible
    await expect(page.locator('[data-testid="analyzer-tab-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="analyzer-tab-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="analyzer-tab-manual"]')).toBeVisible();
  });

  test('create product via API', async ({ page }) => {
    const response = await page.request.post('/api/products', {
      data: {
        name: 'E2E Analyzer Test Product',
        description: 'Created by E2E analyzer test',
        category: 'SaaS',
        features: ['Feature A', 'Feature B'],
      },
    });
    expect(response.status()).toBe(201);

    const product = await response.json();
    createdProductIds.push(product.id);

    expect(product.id).toBeDefined();
    expect(product.name).toBe('E2E Analyzer Test Product');
  });

  test('product name is required', async ({ page }) => {
    const response = await page.request.post('/api/products', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('created product has correct fields', async ({ page }) => {
    const response = await page.request.post('/api/products', {
      data: {
        name: 'E2E Field Validation Product',
        description: 'Testing field correctness',
        category: 'Enterprise',
        features: ['Auth', 'Dashboard', 'Analytics'],
      },
    });
    expect(response.status()).toBe(201);

    const product = await response.json();
    createdProductIds.push(product.id);

    expect(product.name).toBe('E2E Field Validation Product');
    expect(product.category).toBe('Enterprise');
    expect(product.features).toEqual(['Auth', 'Dashboard', 'Analytics']);
  });
});
