import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Campaigns — Quick Content', () => {
  const createdIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test.afterEach(async ({ page }) => {
    for (const id of createdIds) {
      await page.request.delete(`/api/campaigns/${id}`).catch(() => {});
    }
    createdIds.length = 0;
  });

  test('create quick content via API', async ({ page }) => {
    const response = await page.request.post('/api/campaigns/quick', {
      data: {
        contentType: 'blog-article',
        contentCategory: 'written',
        prompt: 'E2E test quick content',
      },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    const campaign = data.campaign ?? data;
    expect(campaign.id).toBeDefined();

    // Track for cleanup
    createdIds.push(campaign.id);
  });

  test('quick content requires contentType', async ({ page }) => {
    const response = await page.request.post('/api/campaigns/quick', {
      data: {
        prompt: 'test',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('quick content requires prompt', async ({ page }) => {
    const response = await page.request.post('/api/campaigns/quick', {
      data: {
        contentType: 'blog-article',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('prompt suggestions endpoint works', async ({ page }) => {
    const response = await page.request.get('/api/campaigns/quick/prompt-suggestions');
    expect(response.status()).toBe(200);

    const data = await response.json();
    const suggestions = data.suggestions ?? data;
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  test('convert quick to strategic', async ({ page }) => {
    // Create quick content first
    const createResponse = await page.request.post('/api/campaigns/quick', {
      data: {
        contentType: 'blog-article',
        contentCategory: 'written',
        prompt: 'E2E convert test quick content',
      },
    });
    expect(createResponse.status()).toBe(201);

    const createData = await createResponse.json();
    const campaign = createData.campaign ?? createData;
    const quickId = campaign.id;
    createdIds.push(quickId);

    // Convert to strategic (requires campaignName in body)
    const convertResponse = await page.request.post(`/api/campaigns/quick/${quickId}/convert`, {
      data: { campaignName: 'Converted E2E Campaign' },
    });
    expect(convertResponse.status()).toBe(200);

    const convertData = await convertResponse.json();
    expect(convertData).toBeDefined();
  });

  test('quick content appears in campaign list', async ({ page }) => {
    // Create quick content
    const createResponse = await page.request.post('/api/campaigns/quick', {
      data: {
        contentType: 'blog-article',
        contentCategory: 'written',
        prompt: 'E2E list verification quick content',
      },
    });
    expect(createResponse.status()).toBe(201);

    const createData = await createResponse.json();
    const campaign = createData.campaign ?? createData;
    const quickId = campaign.id;
    createdIds.push(quickId);

    // Verify it appears in the QUICK campaign list
    const listResponse = await page.request.get('/api/campaigns?type=QUICK');
    expect(listResponse.status()).toBe(200);

    const listData = await listResponse.json();
    expect(Array.isArray(listData.campaigns)).toBe(true);

    const found = listData.campaigns.some(
      (c: { id: string }) => c.id === quickId,
    );
    expect(found).toBe(true);
  });
});
