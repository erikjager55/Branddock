import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Personas — Create', () => {
  const createdPersonaIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up created personas
    for (const id of createdPersonaIds) {
      await page.request.delete(`/api/personas/${id}`).catch(() => {});
    }
    createdPersonaIds.length = 0;
  });

  test('create persona via API with minimal data', async ({ page }) => {
    const response = await page.request.post('/api/personas', {
      data: { name: 'E2E Minimal Persona' },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.persona.id).toBeDefined();
    expect(data.persona.name).toBe('E2E Minimal Persona');
    createdPersonaIds.push(data.persona.id);
  });

  test('persona name is required', async ({ page }) => {
    const response = await page.request.post('/api/personas', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('create persona with full demographics', async ({ page }) => {
    const response = await page.request.post('/api/personas', {
      data: {
        name: 'E2E Full Persona',
        age: '30-35',
        location: 'Amsterdam, Netherlands',
        occupation: 'Product Manager',
      },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.persona.id).toBeDefined();
    expect(data.persona.name).toBe('E2E Full Persona');
    expect(data.persona.age).toBe('30-35');
    expect(data.persona.location).toBe('Amsterdam, Netherlands');
    expect(data.persona.occupation).toBe('Product Manager');
    createdPersonaIds.push(data.persona.id);
  });

  test('created persona appears in list', async ({ page }) => {
    // Create a persona
    const createResponse = await page.request.post('/api/personas', {
      data: { name: 'E2E List Check Persona' },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    createdPersonaIds.push(created.persona.id);

    // Fetch the list and verify the new persona is present
    const listResponse = await page.request.get('/api/personas');
    expect(listResponse.status()).toBe(200);

    const listData = await listResponse.json();
    const names = listData.personas.map((p: { name: string }) => p.name);
    expect(names).toContain('E2E List Check Persona');
  });

  test('create persona page renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to personas
    await page.click(`[data-section-id="${SECTIONS.personas}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Click the add persona button to navigate to create page
    await page.locator('[data-testid="add-persona-button"]').click();

    // Verify the create persona page is visible
    await expect(page.locator('[data-testid="create-persona-page"]')).toBeVisible({ timeout: 10_000 });
  });
});
