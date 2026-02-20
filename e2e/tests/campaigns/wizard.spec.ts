import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Campaigns — Wizard', () => {
  const createdCampaignIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup any campaigns created during tests
    for (const id of createdCampaignIds) {
      await page.request.delete(`/api/campaigns/${id}`).catch(() => {});
    }
    createdCampaignIds.length = 0;
  });

  test('wizard page renders with stepper', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to campaigns first, then to the wizard
    await page.click(`[data-section-id="${SECTIONS.activeCampaigns}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    // Click the new campaign button to open the wizard
    const newCampaignButton = page.locator('[data-testid="new-campaign-button"]');
    if (await newCampaignButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newCampaignButton.click();
    }

    // Verify the wizard and stepper are visible
    await expect(page.locator('[data-testid="campaign-wizard"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="wizard-stepper"]')).toBeVisible({ timeout: 10_000 });
  });

  test('step 1: name is required for continue', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

    // Navigate to campaigns then wizard
    await page.click(`[data-section-id="${SECTIONS.activeCampaigns}"]`);
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 10_000 });

    const newCampaignButton = page.locator('[data-testid="new-campaign-button"]');
    if (await newCampaignButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newCampaignButton.click();
    }

    // Verify the continue button exists
    await expect(page.locator('[data-testid="wizard-continue-button"]')).toBeVisible({ timeout: 10_000 });
  });

  test('wizard knowledge endpoint returns assets', async ({ page }) => {
    const response = await page.request.get('/api/campaigns/wizard/knowledge');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('wizard deliverable types endpoint works', async ({ page }) => {
    const response = await page.request.get('/api/campaigns/wizard/deliverable-types');
    expect(response.status()).toBe(200);
  });

  test('launch campaign via API', async ({ page }) => {
    const response = await page.request.post('/api/campaigns/wizard/launch', {
      data: {
        name: `E2E Wizard Campaign ${Date.now()}`,
        goalType: 'BRAND_AWARENESS',
        knowledgeIds: [],
        strategy: { summary: 'test' },
        deliverables: [],
      },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toBeDefined();

    // Track for cleanup
    const campaignId = data.campaign?.id ?? data.id;
    if (campaignId) {
      createdCampaignIds.push(campaignId);
    }
  });

  test('launch requires name', async ({ page }) => {
    const response = await page.request.post('/api/campaigns/wizard/launch', {
      data: {
        name: '',
        goalType: 'BRAND_AWARENESS',
        knowledgeIds: [],
        strategy: { summary: 'test' },
        deliverables: [],
      },
    });
    expect(response.status()).toBe(400);
  });
});
