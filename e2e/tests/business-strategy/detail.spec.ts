import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Business Strategy — Detail', () => {
  let strategyId: string;

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });

    // Create a fresh strategy for each test
    const createResponse = await page.request.post('/api/strategies', {
      data: {
        name: `E2E Detail Strategy ${Date.now()}`,
        description: 'Created by E2E detail test',
        type: 'GROWTH',
      },
    });
    const body = await createResponse.json();
    strategyId = body.strategy.id;
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: delete the strategy created in beforeEach
    if (strategyId) {
      await page.request.delete(`/api/strategies/${strategyId}`).catch(() => {});
    }
  });

  test('strategy detail loads via API', async ({ page }) => {
    const response = await page.request.get(`/api/strategies/${strategyId}`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    const strategy = body.strategy ?? body;
    expect(strategy.name).toBeDefined();
    expect(strategy.type).toBeDefined();
    expect(strategy).toHaveProperty('objectives');
  });

  test('strategy context can be updated inline', async ({ page }) => {
    const response = await page.request.patch(`/api/strategies/${strategyId}/context`, {
      data: {
        vision: 'Updated vision from E2E test',
      },
    });
    expect(response.status()).toBe(200);

    // Verify the update persisted
    const detailResponse = await page.request.get(`/api/strategies/${strategyId}`);
    const detail = await detailResponse.json();
    const strategy = detail.strategy ?? detail;
    expect(strategy.vision).toBe('Updated vision from E2E test');
  });

  test('add objective via API', async ({ page }) => {
    const response = await page.request.post(`/api/strategies/${strategyId}/objectives`, {
      data: {
        title: 'E2E Test Objective',
        targetValue: 100,
      },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.objective).toBeDefined();
    expect(body.objective.title).toBe('E2E Test Objective');
  });

  test('add milestone via API', async ({ page }) => {
    const response = await page.request.post(`/api/strategies/${strategyId}/milestones`, {
      data: {
        title: 'E2E Test Milestone',
        date: new Date().toISOString(),
      },
    });
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.milestone).toBeDefined();
    expect(body.milestone.title).toBe('E2E Test Milestone');
  });

  test('archive strategy toggles status', async ({ page }) => {
    const response = await page.request.patch(`/api/strategies/${strategyId}/archive`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const strategy = body.strategy ?? body;
    expect(strategy.status).toBe('ARCHIVED');

    // Toggle back
    const restoreResponse = await page.request.patch(`/api/strategies/${strategyId}/archive`);
    expect(restoreResponse.status()).toBe(200);

    const restoreBody = await restoreResponse.json();
    const restored = restoreBody.strategy ?? restoreBody;
    expect(restored.status).toBe('ACTIVE');
  });

  test('delete strategy returns 200', async ({ page }) => {
    // Create a separate strategy specifically for deletion
    const createResponse = await page.request.post('/api/strategies', {
      data: {
        name: `E2E Delete Target ${Date.now()}`,
        description: 'Will be deleted',
        type: 'BRAND_BUILDING',
      },
    });
    expect(createResponse.status()).toBe(201);

    const createBody = await createResponse.json();
    const deleteTargetId = createBody.strategy.id;

    // Delete it
    const deleteResponse = await page.request.delete(`/api/strategies/${deleteTargetId}`);
    expect(deleteResponse.status()).toBe(200);

    // Verify it no longer exists
    const getResponse = await page.request.get(`/api/strategies/${deleteTargetId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('accessing non-existent strategy returns 404', async ({ page }) => {
    const response = await page.request.get('/api/strategies/non-existent-id');
    expect(response.status()).toBe(404);
  });
});
