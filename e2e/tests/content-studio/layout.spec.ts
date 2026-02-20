import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Content Studio — Layout', () => {
  let deliverableId: string;

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });

    // Find a deliverable from a campaign that has deliverables
    const campaignsRes = await page.request.get('/api/campaigns');
    const campaignsData = await campaignsRes.json();
    const campaigns = campaignsData.campaigns ?? campaignsData;
    expect(campaigns.length).toBeGreaterThan(0);
    const campaign = campaigns.find(
      (c: { deliverableCount?: number }) => (c.deliverableCount ?? 0) > 0,
    ) ?? campaigns[0];

    const deliverablesRes = await page.request.get(`/api/campaigns/${campaign.id}/deliverables`);
    const deliverables = await deliverablesRes.json();
    const deliverablesList = deliverables.deliverables ?? deliverables;
    expect(deliverablesList.length).toBeGreaterThan(0);
    deliverableId = deliverablesList[0].id;
  });

  test('studio state loads for deliverable', async ({ page }) => {
    const response = await page.request.get(`/api/studio/${deliverableId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const deliverable = data.deliverable ?? data.studio ?? data;
    expect(deliverable).toHaveProperty('title');
    expect(typeof deliverable.title).toBe('string');
  });

  test('studio returns campaign context', async ({ page }) => {
    const response = await page.request.get(`/api/studio/${deliverableId}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const campaignTitle =
      data.campaign?.title ??
      (data.deliverable ?? data.studio ?? data).campaignTitle;
    expect(campaignTitle).toBeDefined();
  });

  test('auto-save endpoint works', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/auto-save`, {
      data: { prompt: 'e2e test prompt' },
    });
    expect(response.status()).toBe(200);
  });

  test('update studio fields', async ({ page }) => {
    const response = await page.request.patch(`/api/studio/${deliverableId}`, {
      data: { prompt: 'updated prompt' },
    });
    expect(response.status()).toBe(200);
  });
});
