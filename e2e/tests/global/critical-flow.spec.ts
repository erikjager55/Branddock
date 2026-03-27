import { test, expect } from '@playwright/test';
import { TEST_USERS, SECTIONS } from '../../fixtures/test-data';
import { navigateTo } from '../../helpers/navigation';

test.describe('Critical Flow: Login → Dashboard → Brand Asset → AI Exploration → Campaign', () => {
  test('complete critical user journey', async ({ page }) => {
    // ─── Step 1: Login ─────────────────────────────────────────
    await page.goto('/');
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();

    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-password"]').fill(TEST_USERS.owner.password);
    await page.locator('[data-testid="login-submit"]').click();

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    // Dismiss onboarding wizard if visible
    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    if (await wizard.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const skipBtn = page.locator('[data-testid="onboarding-wizard"] button', {
        hasText: /skip|get started|close/i,
      });
      if (await skipBtn.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
        await skipBtn.first().click();
      }
    }

    // ─── Step 2: Dashboard is rendered ─────────────────────────
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Verify key dashboard elements are present
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // ─── Step 3: Navigate to Brand Foundation ──────────────────
    await navigateTo(page, SECTIONS.brand);
    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible({
      timeout: 10_000,
    });

    // Verify brand assets are loaded (seed data has 12+ assets)
    const assetGrid = page.locator('[data-testid="asset-grid"]');
    await expect(assetGrid).toBeVisible({ timeout: 10_000 });
    const assetCards = assetGrid.locator('[data-testid="brand-asset-card"]');
    const assetCount = await assetCards.count();
    expect(assetCount).toBeGreaterThan(0);

    // ─── Step 4: Open a Brand Asset Detail ─────────────────────
    // Click the first brand asset card to navigate to detail
    await assetCards.first().click();

    // The detail page should render (either via page-shell or asset detail testid)
    const detailPage = page.locator('[data-testid="brand-asset-detail-page"]');
    await expect(detailPage).toBeVisible({ timeout: 10_000 });

    // ─── Step 5: AI Exploration section is accessible ──────────
    // The sidebar should show research methods including AI Exploration
    const aiExplorationButton = page.locator(
      '[data-testid="research-method-ai-exploration"], [data-testid="ai-exploration-button"], button:has-text("AI Exploration")',
    );
    // AI Exploration button must exist and be visible on the detail page
    await expect(aiExplorationButton.first()).toBeVisible({ timeout: 5_000 });

    // ─── Step 6: Navigate to Campaigns ─────────────────────────
    await navigateTo(page, SECTIONS.activeCampaigns);

    // Campaigns page should load (uses PageShell)
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    // Verify campaign cards are loaded from seed data
    const campaignCards = page.locator('[data-testid^="campaign-card-"]');
    const campaignCount = await campaignCards.count();
    expect(campaignCount).toBeGreaterThan(0);
  });

  test('login persists across navigation', async ({ page }) => {
    // Login via API (faster)
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    // Dismiss onboarding if present
    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    if (await wizard.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const skipBtn = page.locator('[data-testid="onboarding-wizard"] button', {
        hasText: /skip|get started|close/i,
      });
      if (await skipBtn.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
        await skipBtn.first().click();
      }
    }

    // Navigate through multiple sections — session should persist
    await navigateTo(page, SECTIONS.brand);
    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible({
      timeout: 10_000,
    });

    await navigateTo(page, SECTIONS.personas);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    await navigateTo(page, SECTIONS.products);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    await navigateTo(page, SECTIONS.activeCampaigns);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    // Navigate back to dashboard
    await navigateTo(page, SECTIONS.dashboard);
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10_000 });

    // Should NOT be redirected to auth page
    await expect(page.locator('[data-testid="auth-page"]')).not.toBeVisible();
  });
});
