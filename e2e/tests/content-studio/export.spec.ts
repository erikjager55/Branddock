import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Content Studio — Export', () => {
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

  test('export content as text', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/export`, {
      data: { format: 'txt' },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.downloadUrl ?? data.url).toBeDefined();
  });

  test('export content as markdown', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/export`, {
      data: { format: 'md' },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.downloadUrl ?? data.url).toBeDefined();
  });

  test('export content as html', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/export`, {
      data: { format: 'html' },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.downloadUrl ?? data.url).toBeDefined();
  });

  test('export content as docx', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/export`, {
      data: { format: 'docx' },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.downloadUrl ?? data.url).toBeDefined();
  });
});
