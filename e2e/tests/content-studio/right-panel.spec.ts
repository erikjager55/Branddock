import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Content Studio — Right Panel', () => {
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

  test('quality score returns metrics', async ({ page }) => {
    const response = await page.request.get(`/api/studio/${deliverableId}/quality`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const quality = data.quality ?? data;
    expect(quality).toHaveProperty('overall');
    expect(quality).toHaveProperty('metrics');
    expect(Array.isArray(quality.metrics)).toBe(true);
  });

  test('refresh quality score', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/quality/refresh`);
    expect(response.status()).toBe(200);
  });

  test('improve suggestions endpoint', async ({ page }) => {
    const response = await page.request.get(`/api/studio/${deliverableId}/improve`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const suggestions = data.suggestions ?? data;
    expect(Array.isArray(suggestions)).toBe(true);
  });

  test('version list returns versions', async ({ page }) => {
    const response = await page.request.get(`/api/studio/${deliverableId}/versions`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    const versions = data.versions ?? data;
    expect(Array.isArray(versions)).toBe(true);
  });

  test('create version snapshot', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/versions`);
    const status = response.status();
    expect(status === 200 || status === 201).toBe(true);
  });

  test('research insights for studio', async ({ page }) => {
    const response = await page.request.get(`/api/studio/${deliverableId}/insights`);
    expect(response.status()).toBe(200);
  });
});
