import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Campaigns — Detail', () => {
  let strategicCampaignId: string;
  const cleanupEndpoints: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });

    // Find the first STRATEGIC campaign from the list
    const listResponse = await page.request.get('/api/campaigns?type=STRATEGIC');
    const listData = await listResponse.json();
    expect(listData.campaigns.length).toBeGreaterThan(0);
    strategicCampaignId = listData.campaigns[0].id;
  });

  test.afterEach(async ({ page }) => {
    // Cleanup any entities created during tests
    for (const endpoint of cleanupEndpoints) {
      await page.request.delete(endpoint).catch(() => {});
    }
    cleanupEndpoints.length = 0;
  });

  test('strategic campaign detail loads via API', async ({ page }) => {
    const response = await page.request.get(`/api/campaigns/${strategicCampaignId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const campaign = data.campaign ?? data;
    expect(campaign.title ?? campaign.name).toBeDefined();
    expect(typeof (campaign.title ?? campaign.name)).toBe('string');
  });

  test('campaign deliverables returns list', async ({ page }) => {
    const response = await page.request.get(`/api/campaigns/${strategicCampaignId}/deliverables`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const deliverables = data.deliverables ?? data;
    expect(Array.isArray(deliverables)).toBe(true);
  });

  test('add deliverable via API', async ({ page }) => {
    const createResponse = await page.request.post(`/api/campaigns/${strategicCampaignId}/deliverables`, {
      data: {
        title: 'E2E Deliverable',
        contentType: 'blog-article',
      },
    });
    expect(createResponse.status()).toBe(201);

    const createData = await createResponse.json();
    const deliverable = createData.deliverable ?? createData;
    expect(deliverable.id).toBeDefined();

    // Cleanup
    cleanupEndpoints.push(`/api/campaigns/${strategicCampaignId}/deliverables/${deliverable.id}`);
  });

  test('update deliverable status', async ({ page }) => {
    // Create a deliverable first
    const createResponse = await page.request.post(`/api/campaigns/${strategicCampaignId}/deliverables`, {
      data: {
        title: 'E2E Status Update Deliverable',
        contentType: 'blog-article',
      },
    });
    expect(createResponse.status()).toBe(201);

    const createData = await createResponse.json();
    const deliverable = createData.deliverable ?? createData;
    const deliverableId = deliverable.id;

    // Update status to IN_PROGRESS
    const patchResponse = await page.request.patch(
      `/api/campaigns/${strategicCampaignId}/deliverables/${deliverableId}`,
      {
        data: { status: 'IN_PROGRESS' },
      },
    );
    expect(patchResponse.status()).toBe(200);

    // Cleanup
    cleanupEndpoints.push(`/api/campaigns/${strategicCampaignId}/deliverables/${deliverableId}`);
  });

  test('delete deliverable', async ({ page }) => {
    // Create a deliverable specifically for deletion
    const createResponse = await page.request.post(`/api/campaigns/${strategicCampaignId}/deliverables`, {
      data: {
        title: 'E2E Delete Target Deliverable',
        contentType: 'blog-article',
      },
    });
    expect(createResponse.status()).toBe(201);

    const createData = await createResponse.json();
    const deliverable = createData.deliverable ?? createData;
    const deliverableId = deliverable.id;

    // Delete it
    const deleteResponse = await page.request.delete(
      `/api/campaigns/${strategicCampaignId}/deliverables/${deliverableId}`,
    );
    expect(deleteResponse.status()).toBe(200);
  });

  test('knowledge assets for campaign', async ({ page }) => {
    const response = await page.request.get(`/api/campaigns/${strategicCampaignId}/knowledge`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const assets = data.assets ?? data.knowledgeAssets ?? data;
    expect(Array.isArray(assets)).toBe(true);
  });

  test('campaign strategy endpoint', async ({ page }) => {
    const response = await page.request.get(`/api/campaigns/${strategicCampaignId}/strategy`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
  });
});
