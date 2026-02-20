import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE } from '../../fixtures/test-data';

test.describe('Personas — Duplicate', () => {
  let personaId: string;
  const createdPersonaIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });

    // Get the first persona from the list
    const listResponse = await page.request.get('/api/personas');
    const listData = await listResponse.json();
    personaId = listData.personas[0].id;
  });

  test.afterEach(async ({ page }) => {
    // Clean up duplicated/created personas
    for (const id of createdPersonaIds) {
      await page.request.delete(`/api/personas/${id}`).catch(() => {});
    }
    createdPersonaIds.length = 0;
  });

  test('duplicate persona via API', async ({ page }) => {
    const response = await page.request.post(`/api/personas/${personaId}/duplicate`);
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.persona.id).toBeDefined();
    expect(data.persona.id).not.toBe(personaId);
    createdPersonaIds.push(data.persona.id);
  });

  test('duplicated persona has " (Copy)" in name', async ({ page }) => {
    // Get the original persona name
    const originalResponse = await page.request.get(`/api/personas/${personaId}`);
    const original = await originalResponse.json();

    // Duplicate
    const dupResponse = await page.request.post(`/api/personas/${personaId}/duplicate`);
    expect(dupResponse.status()).toBe(201);
    const duplicated = await dupResponse.json();
    createdPersonaIds.push(duplicated.persona.id);

    expect(duplicated.persona.name).toContain('(Copy)');
    expect(duplicated.persona.name).toContain(original.name);
  });

  test('duplicated persona has reset research methods', async ({ page }) => {
    // Duplicate
    const dupResponse = await page.request.post(`/api/personas/${personaId}/duplicate`);
    expect(dupResponse.status()).toBe(201);
    const duplicated = await dupResponse.json();
    createdPersonaIds.push(duplicated.persona.id);

    // Fetch the duplicated persona detail to get research methods
    const detailResponse = await page.request.get(`/api/personas/${duplicated.persona.id}`);
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();

    // All research methods should be reset to AVAILABLE
    expect(Array.isArray(detail.researchMethods)).toBe(true);
    for (const method of detail.researchMethods) {
      expect(method.status).toBe('AVAILABLE');
    }
  });

  test('duplicated persona is not locked', async ({ page }) => {
    // Lock the original first
    await page.request.patch(`/api/personas/${personaId}/lock`, {
      data: { locked: true },
    });

    // Duplicate
    const dupResponse = await page.request.post(`/api/personas/${personaId}/duplicate`);
    expect(dupResponse.status()).toBe(201);
    const duplicated = await dupResponse.json();
    createdPersonaIds.push(duplicated.persona.id);

    expect(duplicated.persona.isLocked).toBe(false);

    // Unlock the original to restore state
    await page.request.patch(`/api/personas/${personaId}/lock`, {
      data: { locked: false },
    });
  });

  test('delete original does not affect duplicate', async ({ page }) => {
    // Create a new persona to use as original (so we do not delete seed data)
    const createResponse = await page.request.post('/api/personas', {
      data: { name: 'E2E Duplicate Source' },
    });
    expect(createResponse.status()).toBe(201);
    const original = await createResponse.json();

    // Duplicate it
    const dupResponse = await page.request.post(`/api/personas/${original.persona.id}/duplicate`);
    expect(dupResponse.status()).toBe(201);
    const duplicated = await dupResponse.json();
    createdPersonaIds.push(duplicated.persona.id);

    // Delete the original
    const deleteResponse = await page.request.delete(`/api/personas/${original.persona.id}`);
    expect(deleteResponse.status()).toBe(200);

    // The duplicate should still exist and be accessible
    const dupDetailResponse = await page.request.get(`/api/personas/${duplicated.persona.id}`);
    expect(dupDetailResponse.status()).toBe(200);

    const dupDetail = await dupDetailResponse.json();
    expect(dupDetail.name).toContain('E2E Duplicate Source');
  });
});
