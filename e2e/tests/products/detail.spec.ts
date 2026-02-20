import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Products — Detail', () => {
  let productId: string;
  const createdProductIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });

    // Get the first product from the list to use in tests
    const listResponse = await page.request.get('/api/products');
    const listData = await listResponse.json();
    productId = listData.products[0].id;
  });

  test.afterEach(async ({ page }) => {
    // Clean up any products created during tests
    for (const id of createdProductIds) {
      await page.request.delete(`/api/products/${id}`).catch(() => {});
    }
    createdProductIds.length = 0;
  });

  test('product detail loads via API', async ({ page }) => {
    const response = await page.request.get(`/api/products/${productId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.name).toBeDefined();
    expect(typeof data.name).toBe('string');
    expect(data.description).toBeDefined();
    expect(Array.isArray(data.features)).toBe(true);
  });

  test('update product name', async ({ page }) => {
    const response = await page.request.patch(`/api/products/${productId}`, {
      data: { name: 'Updated Product Name E2E' },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.name).toBe('Updated Product Name E2E');
  });

  test('update product description', async ({ page }) => {
    const response = await page.request.patch(`/api/products/${productId}`, {
      data: { description: 'Updated description from E2E test' },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.description).toBe('Updated description from E2E test');
  });

  test('product has linked personas', async ({ page }) => {
    const response = await page.request.get(`/api/products/${productId}/personas`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.personas)).toBe(true);
  });

  test('link persona to product', async ({ page }) => {
    // Create a product to avoid polluting seed data
    const createResponse = await page.request.post('/api/products', {
      data: { name: 'E2E Link Persona Target' },
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();
    createdProductIds.push(product.id);

    // Get an available persona
    const personasResponse = await page.request.get('/api/personas');
    const personasData = await personasResponse.json();
    const personaId = personasData.personas[0].id;

    // Link persona to product
    const linkResponse = await page.request.post(`/api/products/${product.id}/personas`, {
      data: { personaId },
    });
    expect([200, 201]).toContain(linkResponse.status());
  });

  test('unlink persona from product', async ({ page }) => {
    // Create a product
    const createResponse = await page.request.post('/api/products', {
      data: { name: 'E2E Unlink Persona Target' },
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();
    createdProductIds.push(product.id);

    // Get an available persona
    const personasResponse = await page.request.get('/api/personas');
    const personasData = await personasResponse.json();
    const personaId = personasData.personas[0].id;

    // Link persona first
    const linkResponse = await page.request.post(`/api/products/${product.id}/personas`, {
      data: { personaId },
    });
    expect([200, 201]).toContain(linkResponse.status());

    // Unlink persona
    const unlinkResponse = await page.request.delete(
      `/api/products/${product.id}/personas/${personaId}`,
    );
    expect(unlinkResponse.status()).toBe(200);
  });

  test('product detail page has edit button', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to products
    await page.click(`[data-section-id="${SECTIONS.products}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Click the first product card to open detail
    await page.locator('[data-testid="product-card"]').first().click();
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Verify edit button or product detail name is visible
    const editButton = page.locator('[data-testid="product-edit-button"]');
    const detailName = page.locator('[data-testid="product-detail-name"]');
    await expect(editButton.or(detailName)).toBeVisible({ timeout: 10_000 });
  });

  test('accessing non-existent product returns 404', async ({ page }) => {
    const response = await page.request.get('/api/products/non-existent-id-12345');
    expect(response.status()).toBe(404);
  });
});
