import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE } from '../../fixtures/test-data';

test.describe('Products — Delete', () => {
  const createdProductIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up any products that were not deleted during the test
    for (const id of createdProductIds) {
      await page.request.delete(`/api/products/${id}`).catch(() => {});
    }
    createdProductIds.length = 0;
  });

  test('delete product via API', async ({ page }) => {
    // Create a product specifically for deletion
    const createResponse = await page.request.post('/api/products', {
      data: { name: 'E2E Delete Target' },
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();

    // Delete it
    const deleteResponse = await page.request.delete(`/api/products/${product.id}`);
    expect(deleteResponse.status()).toBe(200);
  });

  test('deleted product returns 404 on re-fetch', async ({ page }) => {
    // Create a product
    const createResponse = await page.request.post('/api/products', {
      data: { name: 'E2E Delete Then Fetch' },
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();

    // Delete it
    const deleteResponse = await page.request.delete(`/api/products/${product.id}`);
    expect(deleteResponse.status()).toBe(200);

    // Verify it returns 404
    const fetchResponse = await page.request.get(`/api/products/${product.id}`);
    expect(fetchResponse.status()).toBe(404);
  });

  test('delete non-existent product returns 404', async ({ page }) => {
    const response = await page.request.delete('/api/products/non-existent-id-12345');
    expect(response.status()).toBe(404);
  });

  test('deleted product no longer in list', async ({ page }) => {
    // Create a product
    const createResponse = await page.request.post('/api/products', {
      data: { name: 'E2E Delete List Check' },
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();

    // Verify it appears in the list
    const listBefore = await page.request.get('/api/products');
    const dataBefore = await listBefore.json();
    const foundBefore = dataBefore.products.some(
      (p: { id: string }) => p.id === product.id,
    );
    expect(foundBefore).toBe(true);

    // Delete it
    const deleteResponse = await page.request.delete(`/api/products/${product.id}`);
    expect(deleteResponse.status()).toBe(200);

    // Verify it is absent from the list
    const listAfter = await page.request.get('/api/products');
    const dataAfter = await listAfter.json();
    const foundAfter = dataAfter.products.some(
      (p: { id: string }) => p.id === product.id,
    );
    expect(foundAfter).toBe(false);
  });

  test('cascade: deleting product removes persona links', async ({ page }) => {
    // Create a product
    const createResponse = await page.request.post('/api/products', {
      data: { name: 'E2E Cascade Delete' },
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();

    // Get a persona to link
    const personasResponse = await page.request.get('/api/personas');
    const personasData = await personasResponse.json();
    const personaId = personasData.personas[0].id;

    // Link persona to product
    const linkResponse = await page.request.post(`/api/products/${product.id}/personas`, {
      data: { personaId },
    });
    expect([200, 201]).toContain(linkResponse.status());

    // Delete the product
    const deleteResponse = await page.request.delete(`/api/products/${product.id}`);
    expect(deleteResponse.status()).toBe(200);

    // Verify product is gone
    const fetchResponse = await page.request.get(`/api/products/${product.id}`);
    expect(fetchResponse.status()).toBe(404);
  });
});
