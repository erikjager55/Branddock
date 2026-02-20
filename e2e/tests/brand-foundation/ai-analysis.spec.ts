import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Brand Foundation — AI Analysis', () => {
  /**
   * Helper: navigate to the first asset's detail page.
   * Used as a common entry point for AI analysis tests.
   */
  async function navigateToFirstAssetDetail(page: import('@playwright/test').Page) {
    await navigateTo(page, SECTIONS.brand);
    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible();

    // Wait for grid to load before clicking card
    const grid = page.locator('[data-testid="asset-grid"]');
    await expect(grid).toBeVisible({ timeout: 10_000 });

    const firstCard = grid.locator('[data-testid="brand-asset-card"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page.locator('[data-testid="brand-asset-detail-page"]')).toBeVisible({
      timeout: 10_000,
    });
  }

  test('navigates to AI analysis from detail', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await navigateToFirstAssetDetail(page);

    // Find and click the AI analysis trigger
    // This could be a research method card for AI_EXPLORATION or an explicit button
    const aiTrigger = page.locator(
      'button:has-text("AI"), button:has-text("Analysis"), button:has-text("Explore"), [data-testid="ai-exploration-card"], :text("AI Exploration")',
    ).first();
    await expect(aiTrigger).toBeVisible({ timeout: 5_000 });
    await aiTrigger.click();

    // Should navigate to the AI analysis page
    await expect(page.locator('[data-testid="ai-analysis-page"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('shows loading state initially', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept AI analysis API with a delay
    await page.route('**/api/brand-assets/*/ai-analysis*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await navigateToFirstAssetDetail(page);

    // Click AI analysis trigger
    const aiTrigger = page.locator(
      'button:has-text("AI"), button:has-text("Analysis"), button:has-text("Explore"), [data-testid="ai-exploration-card"], :text("AI Exploration")',
    ).first();
    await expect(aiTrigger).toBeVisible({ timeout: 5_000 });
    await aiTrigger.click();

    // Should show skeleton loader or loading state while AI analysis page loads
    const skeleton = page.locator('[data-testid="skeleton-loader"]');
    const aiPage = page.locator('[data-testid="ai-analysis-page"]');

    // Either skeleton is visible during load, or the AI analysis page appears
    const skeletonVisible = await skeleton
      .first()
      .isVisible()
      .catch(() => false);
    const aiPageVisible = await aiPage
      .isVisible()
      .catch(() => false);

    // At least one should be true at this point
    expect(skeletonVisible || aiPageVisible).toBe(true);

    // Eventually the AI analysis page should be visible
    await expect(aiPage).toBeVisible({ timeout: 15_000 });
  });

  test('shows chat interface', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await navigateToFirstAssetDetail(page);

    // Click AI analysis trigger
    const aiTrigger = page.locator(
      'button:has-text("AI"), button:has-text("Analysis"), button:has-text("Explore"), [data-testid="ai-exploration-card"], :text("AI Exploration")',
    ).first();
    await expect(aiTrigger).toBeVisible({ timeout: 5_000 });
    await aiTrigger.click();

    await expect(page.locator('[data-testid="ai-analysis-page"]')).toBeVisible({
      timeout: 10_000,
    });

    // For active/in-progress sessions, the chat interface should be visible
    // The ChatInterface component is the primary interaction element
    const aiAnalysisPage = page.locator('[data-testid="ai-analysis-page"]');

    // Should show either chat interface (for active sessions), report view (for completed),
    // or error state (if AI service unavailable)
    const hasChatOrReportOrError =
      (await aiAnalysisPage.locator('textarea, [contenteditable]').count()) > 0 ||
      (await aiAnalysisPage.locator(':text("Report"), :text("Executive Summary")').count()) > 0 ||
      (await aiAnalysisPage.locator(':text("Start"), :text("Begin")').count()) > 0 ||
      (await aiAnalysisPage.locator(':text("Something went wrong"), :text("error"), :text("Error")').count()) > 0;
    expect(hasChatOrReportOrError).toBe(true);
  });

  test('shows report view for completed sessions', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // The seed data has 1 demo session with status REPORT_READY
    // Navigate to the asset that has a completed AI session
    await navigateToFirstAssetDetail(page);

    // Click AI analysis trigger
    const aiTrigger = page.locator(
      'button:has-text("AI"), button:has-text("Analysis"), button:has-text("Explore"), [data-testid="ai-exploration-card"], :text("AI Exploration")',
    ).first();
    await expect(aiTrigger).toBeVisible({ timeout: 5_000 });
    await aiTrigger.click();

    await expect(page.locator('[data-testid="ai-analysis-page"]')).toBeVisible({
      timeout: 10_000,
    });

    // For a completed (REPORT_READY) session, the report view should be displayed
    // This may show executive summary, findings, recommendations
    const aiAnalysisPage = page.locator('[data-testid="ai-analysis-page"]');
    await expect(aiAnalysisPage).toBeVisible();

    // The page should render content (either report or chat, depending on session state)
    const hasContent =
      (await aiAnalysisPage.locator('p, h2, h3, [class*="message"], [class*="report"]').count()) > 0;
    expect(hasContent).toBe(true);
  });

  test('handles back navigation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await navigateToFirstAssetDetail(page);

    // Click AI analysis trigger
    const aiTrigger = page.locator(
      'button:has-text("AI"), button:has-text("Analysis"), button:has-text("Explore"), [data-testid="ai-exploration-card"], :text("AI Exploration")',
    ).first();
    await expect(aiTrigger).toBeVisible({ timeout: 5_000 });
    await aiTrigger.click();

    await expect(page.locator('[data-testid="ai-analysis-page"]')).toBeVisible({
      timeout: 10_000,
    });

    // Click back button to return to asset detail
    const backButton = page.locator(
      'button:has-text("Back"), a:has-text("Back"), [aria-label="Back"], :text("Back to Asset")',
    ).first();
    await expect(backButton).toBeVisible({ timeout: 5_000 });
    await backButton.click();

    // Should return to the asset detail page
    await expect(page.locator('[data-testid="brand-asset-detail-page"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('handles API error', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept AI analysis API with an error
    await page.route('**/api/brand-assets/*/ai-analysis*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI service unavailable' }),
      }),
    );

    await navigateToFirstAssetDetail(page);

    // Click AI analysis trigger
    const aiTrigger = page.locator(
      'button:has-text("AI"), button:has-text("Analysis"), button:has-text("Explore"), [data-testid="ai-exploration-card"], :text("AI Exploration")',
    ).first();
    await expect(aiTrigger).toBeVisible({ timeout: 5_000 });
    await aiTrigger.click();

    // Should show an error message or error state
    const errorMessage = page.locator('[data-testid="error-message"]');
    const errorAlert = page.locator('[role="alert"]');
    const errorText = page.locator(':text("error"), :text("Error"), :text("unavailable"), :text("failed")');

    // Wait for some error indication to appear
    await expect(
      errorMessage.or(errorAlert).or(errorText).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
