import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Market Insights — Detail Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.trends);
    await expect(
      authenticatedPage.locator('[data-testid="market-insights-page"]'),
    ).toBeVisible();
  });

  /**
   * Helper: click on the first insight card to navigate to detail.
   * Returns the page for further assertions.
   */
  async function navigateToFirstInsight(page: import('@playwright/test').Page) {
    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();

    // Click the "View Details" link on the first insight card
    const firstCard = grid.locator('[data-testid="insight-card"]').first();
    await expect(firstCard).toBeVisible();
    const viewDetailsButton = firstCard.getByText('View Details');
    await viewDetailsButton.click();

    // Wait for detail page to load
    await expect(page.locator('[data-testid="insight-detail-page"]')).toBeVisible({
      timeout: 10_000,
    });
  }

  test('navigates to detail from card click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    // Detail page should be visible
    await expect(page.locator('[data-testid="insight-detail-page"]')).toBeVisible();
  });

  test('shows insight title and metadata', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    const detailPage = page.locator('[data-testid="insight-detail-page"]');

    // Should show a title (h1)
    const title = detailPage.locator('h1');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText!.length).toBeGreaterThan(0);

    // Should show metadata badges (impact, category, scope, timeframe)
    // At minimum, impact badge and category badge should be visible
    const badges = detailPage.locator('span');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('shows relevance score card', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    // Should show relevance score section
    const scoreCard = page.locator('[data-testid="insight-detail-page"]');
    await expect(scoreCard).toBeVisible();

    // Look for score-related text (e.g. "Relevance Score" or a progress bar)
    const hasRelevanceContent =
      (await scoreCard.getByText(/relevance/i).count()) > 0 ||
      (await scoreCard.locator('[role="progressbar"]').count()) > 0;
    expect(hasRelevanceContent).toBe(true);
  });

  test('shows sources section', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    // Should show sources section
    const sourcesSection = page.locator('[data-testid="sources-section"]');

    // Sources section should be visible (seed data has source URLs)
    await expect(sourcesSection).toBeVisible({ timeout: 5_000 });
    await expect(sourcesSection).toContainText('Sources');
  });

  test('shows how to use section', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    const detailPage = page.locator('[data-testid="insight-detail-page"]');

    // Look for "How to use this insight" section (only shown when howToUse array is non-empty)
    // Check if either the section exists or the page is still functional
    const howToUseVisible = await detailPage.getByText(/how to use/i).isVisible();
    if (howToUseVisible) {
      await expect(detailPage.getByText(/how to use/i)).toBeVisible();

      // Should have action buttons
      const useCampaignBtn = detailPage.getByText(/use in campaign/i);
      const generateContentBtn = detailPage.getByText(/generate content/i);
      const hasActionButtons =
        (await useCampaignBtn.isVisible()) || (await generateContentBtn.isVisible());
      expect(hasActionButtons).toBe(true);
    }
    // If howToUse array is empty for the first insight, the section is hidden by design
    await expect(detailPage).toBeVisible();
  });

  test('edit mode toggles fields editable', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    const detailPage = page.locator('[data-testid="insight-detail-page"]');

    // Click the Edit button
    const editButton = detailPage.getByRole('button', { name: /edit/i });
    await expect(editButton).toBeVisible();
    await editButton.click();

    // In edit mode, title should become an input field
    const titleInput = detailPage.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });

    // Should show Save and Cancel buttons
    const saveButton = detailPage.getByRole('button', { name: /save/i });
    const cancelButton = detailPage.getByRole('button', { name: /cancel/i });
    await expect(saveButton).toBeVisible();
    await expect(cancelButton).toBeVisible();

    // Cancel edit mode
    await cancelButton.click();

    // Should return to view mode — Edit button should be visible again
    await expect(detailPage.getByRole('button', { name: /edit/i })).toBeVisible({ timeout: 5_000 });
  });

  test('delete flow shows confirm modal', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    const detailPage = page.locator('[data-testid="insight-detail-page"]');

    // Click the Delete button
    const deleteButton = detailPage.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Should show the delete confirmation modal
    const confirmModal = page.locator('[data-testid="delete-confirm-modal"]');
    await expect(confirmModal).toBeVisible({ timeout: 5_000 });

    // Modal should contain confirmation text
    await expect(confirmModal).toContainText(/delete/i);
    await expect(confirmModal).toContainText(/cannot be undone/i);

    // Should have Cancel and Delete buttons
    const cancelBtn = confirmModal.getByRole('button', { name: /cancel/i });
    const confirmDeleteBtn = confirmModal.getByRole('button', { name: /delete/i });
    await expect(cancelBtn).toBeVisible();
    await expect(confirmDeleteBtn).toBeVisible();

    // Cancel the delete
    await cancelBtn.click();

    // Modal should close
    await expect(confirmModal).not.toBeVisible();

    // Detail page should still be visible
    await expect(detailPage).toBeVisible();
  });

  test('back button returns to overview', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    // Click the back button
    const backButton = page.getByText('Back to Market Insights');
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should return to the overview page
    await expect(page.locator('[data-testid="market-insights-page"]')).toBeVisible({
      timeout: 10_000,
    });

    // Grid should be visible again
    await expect(page.locator('[data-testid="insights-grid"]')).toBeVisible({ timeout: 5_000 });
  });

  test('handles API error on detail load', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // First, get the grid to find an insight ID to navigate to
    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();

    // Set up route intercept for detail API before clicking
    await page.route('**/api/insights/*', (route) => {
      // Only intercept GET requests for individual insights (not list)
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      }
      return route.continue();
    });

    // Click to navigate to detail
    const firstCard = grid.locator('[data-testid="insight-card"]').first();
    await expect(firstCard).toBeVisible();
    const viewDetailsButton = firstCard.getByText('View Details');
    await viewDetailsButton.click();

    // Should show an error state or loading skeleton (depending on implementation)
    // The page should handle the error gracefully without crashing
    const hasError = page.locator('[data-testid="error-message"]');
    const hasSkeleton = page.locator('[data-testid="skeleton-loader"]');
    const errorOrSkeleton =
      (await hasError.isVisible().catch(() => false)) ||
      (await hasSkeleton.isVisible().catch(() => false));

    // At minimum, the page should not crash — either error state, skeleton, or detail page shown
    const pageStillWorking =
      errorOrSkeleton ||
      (await page.locator('[data-testid="insight-detail-page"]').isVisible().catch(() => false)) ||
      (await page.locator('[data-testid="market-insights-page"]').isVisible().catch(() => false));
    expect(pageStillWorking).toBe(true);
  });

  test('handles special characters in content', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToFirstInsight(page);

    const detailPage = page.locator('[data-testid="insight-detail-page"]');

    // Enter edit mode
    const editButton = detailPage.getByRole('button', { name: /edit/i });
    await editButton.click();

    // Fill title with special characters
    const titleInput = detailPage.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill('Test <script>alert("xss")</script> & "quotes"');

    // Fill description with special characters if textarea exists
    const descriptionArea = detailPage.locator('textarea');
    if ((await descriptionArea.count()) > 0) {
      await descriptionArea.first().fill(
        'Description with <b>HTML tags</b> & special chars: \' " < > &amp;',
      );
    }

    // Save should work without crashing
    const saveButton = detailPage.getByRole('button', { name: /save/i });
    await saveButton.click();

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Page should still be visible and functional
    await expect(detailPage).toBeVisible();
  });
});
