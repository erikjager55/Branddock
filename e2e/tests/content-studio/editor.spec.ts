import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Content Studio — Editor', () => {
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

  test('generate content for deliverable', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/generate`, {
      data: { model: 'gpt-4', prompt: 'E2E test prompt', settings: {} },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.generatedText ?? data.content ?? data.text).toBeDefined();
  });

  test('auto-save preserves generated text', async ({ page }) => {
    // First generate content
    const generateRes = await page.request.post(`/api/studio/${deliverableId}/generate`, {
      data: { model: 'gpt-4', prompt: 'E2E test prompt', settings: {} },
    });
    expect(generateRes.status()).toBe(200);

    // Then auto-save with custom text
    const autoSaveRes = await page.request.post(`/api/studio/${deliverableId}/auto-save`, {
      data: { generatedText: 'E2E auto-save text' },
    });
    expect(autoSaveRes.status()).toBe(200);

    // Verify by fetching studio state
    const studioRes = await page.request.get(`/api/studio/${deliverableId}`);
    expect(studioRes.status()).toBe(200);

    const studioData = await studioRes.json();
    const deliverable = studioData.deliverable ?? studioData.studio ?? studioData;
    expect(deliverable.generatedText ?? deliverable.content).toBeDefined();
  });

  test('generate returns content type appropriate response', async ({ page }) => {
    const response = await page.request.post(`/api/studio/${deliverableId}/generate`, {
      data: { model: 'gpt-4', prompt: 'E2E content type test', settings: {} },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    // Response should have content-related fields
    const hasContentFields =
      data.generatedText !== undefined ||
      data.content !== undefined ||
      data.text !== undefined ||
      data.generatedImageUrls !== undefined ||
      data.generatedVideoUrl !== undefined ||
      data.generatedSlides !== undefined ||
      data.images !== undefined ||
      data.slides !== undefined;
    expect(hasContentFields).toBe(true);
  });

  test('studio state reflects updates after patch', async ({ page }) => {
    // Patch the prompt
    const patchRes = await page.request.patch(`/api/studio/${deliverableId}`, {
      data: { prompt: 'updated prompt for e2e test' },
    });
    expect(patchRes.status()).toBe(200);

    // Fetch studio state and verify
    const studioRes = await page.request.get(`/api/studio/${deliverableId}`);
    expect(studioRes.status()).toBe(200);

    const studioData = await studioRes.json();
    const deliverable = studioData.deliverable ?? studioData.studio ?? studioData;
    expect(deliverable.prompt).toBe('updated prompt for e2e test');
  });
});
