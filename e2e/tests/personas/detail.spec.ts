import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE } from '../../fixtures/test-data';

test.describe('Personas — Detail', () => {
  let personaId: string;
  const createdPersonaIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });

    // Get the first persona from the list to use in tests
    const listResponse = await page.request.get('/api/personas');
    const listData = await listResponse.json();
    personaId = listData.personas[0].id;
  });

  test.afterEach(async ({ page }) => {
    // Clean up any personas created during tests
    for (const id of createdPersonaIds) {
      await page.request.delete(`/api/personas/${id}`).catch(() => {});
    }
    createdPersonaIds.length = 0;
  });

  test('persona detail loads with demographics', async ({ page }) => {
    const response = await page.request.get(`/api/personas/${personaId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.name).toBeDefined();
    expect(typeof data.name).toBe('string');
    expect(typeof data.validationPercentage).toBe('number');
  });

  test('update persona demographics', async ({ page }) => {
    const response = await page.request.patch(`/api/personas/${personaId}`, {
      data: { location: 'Berlin, Germany' },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.persona.location).toBe('Berlin, Germany');
  });

  test('lock persona toggles isLocked', async ({ page }) => {
    const response = await page.request.patch(`/api/personas/${personaId}/lock`, {
      data: { locked: true },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.isLocked).toBe(true);
  });

  test('unlock persona', async ({ page }) => {
    // First lock it
    await page.request.patch(`/api/personas/${personaId}/lock`, {
      data: { locked: true },
    });

    // Then unlock it
    const response = await page.request.patch(`/api/personas/${personaId}/lock`, {
      data: { locked: false },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.isLocked).toBe(false);
  });

  test('persona research methods are present', async ({ page }) => {
    const response = await page.request.get(`/api/personas/${personaId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.researchMethods)).toBe(true);
    expect(data.researchMethods).toHaveLength(4);
  });

  test('delete persona via API', async ({ page }) => {
    // Create a persona specifically for deletion
    const createResponse = await page.request.post('/api/personas', {
      data: { name: 'E2E Delete Target' },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    const deleteId = created.persona.id;

    // Delete it
    const deleteResponse = await page.request.delete(`/api/personas/${deleteId}`);
    expect(deleteResponse.status()).toBe(200);

    // Verify it no longer exists
    const fetchResponse = await page.request.get(`/api/personas/${deleteId}`);
    expect(fetchResponse.status()).toBe(404);
  });

  test('accessing non-existent persona returns 404', async ({ page }) => {
    const response = await page.request.get('/api/personas/non-existent-id-12345');
    expect(response.status()).toBe(404);
  });
});
