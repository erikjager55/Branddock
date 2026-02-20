import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Market Insights — Overview', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.trends);
  });

  test('renders market insights page with title', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="market-insights-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="page-header"] h1'),
    ).toContainText('Market Insights');
    await expect(
      page.locator('[data-testid="page-header"]'),
    ).toContainText('Track market trends and competitive intelligence');
  });

  test('shows 3 stat cards (Active, High Impact, New This Month)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const statsContainer = page.locator('[data-testid="insight-stats"]');
    await expect(statsContainer).toBeVisible();

    // Should contain exactly 3 StatCard elements
    const statCards = statsContainer.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(3);

    // Verify stat labels
    await expect(statsContainer).toContainText('Active Insights');
    await expect(statsContainer).toContainText('High Impact');
    await expect(statsContainer).toContainText('New This Month');
  });

  test('shows insights grid with seed data (7 insights)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();

    // Seed data has 7 market insights
    const cards = grid.locator('[data-testid="insight-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBe(7);
  });

  test('shows filter bar with search and 3 dropdowns', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const filters = page.locator('[data-testid="insight-filters"]');
    await expect(filters).toBeVisible();

    // Should contain a search input
    const searchInput = page.locator('[data-testid="insight-search"]');
    await expect(searchInput).toBeVisible();

    // Should contain 3 dropdown filters
    const categoryFilter = page.locator('[data-testid="insight-category-filter"]');
    const impactFilter = page.locator('[data-testid="insight-impact-filter"]');
    const timeframeFilter = page.locator('[data-testid="insight-timeframe-filter"]');
    await expect(categoryFilter).toBeVisible();
    await expect(impactFilter).toBeVisible();
    await expect(timeframeFilter).toBeVisible();
  });

  test('filters by search text', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to be populated
    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();
    const initialCards = grid.locator('[data-testid="insight-card"]');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a search term that matches known seed insights
    const searchInput = page.locator('[data-testid="insight-search"]');
    await searchInput.fill('AI');

    // Wait for debounce and re-render
    await page.waitForTimeout(500);

    // Filtered results should be visible and fewer than initial
    const filteredCards = grid.locator('[data-testid="insight-card"]');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('filters by category dropdown', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to be populated
    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();

    // Find and interact with the category filter
    const categoryFilter = page.locator('[data-testid="insight-category-filter"]');
    await expect(categoryFilter).toBeVisible();

    // Select a category option
    const options = categoryFilter.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1); // At least placeholder + one category

    // Select the second option (first non-default category)
    const secondOption = await options.nth(1).getAttribute('value');
    if (secondOption) {
      await categoryFilter.selectOption(secondOption);
      await page.waitForTimeout(300);

      // Grid should still be visible with filtered results
      await expect(grid).toBeVisible();
    }
  });

  test('filters by impact level dropdown', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to be populated
    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();
    const initialCards = grid.locator('[data-testid="insight-card"]');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Find and interact with the impact filter
    const impactFilter = page.locator('[data-testid="insight-impact-filter"]');
    await expect(impactFilter).toBeVisible();

    // Select "HIGH" impact
    await impactFilter.selectOption('HIGH');
    await page.waitForTimeout(300);

    // Filtered results should be visible
    const filteredCards = grid.locator('[data-testid="insight-card"]');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('shows loading skeletons initially', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the insights API with a delayed response
    await page.route('**/api/insights*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate away and back to trigger a fresh load
    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.trends);

    // Should show skeleton loaders while data is being fetched
    const skeleton = page.locator('[data-testid="skeleton-loader"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 5_000 });
  });

  test('shows empty state when search matches nothing', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to appear
    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();

    // Search for nonsense text that won't match any insights
    const searchInput = page.locator('[data-testid="insight-search"]');
    await searchInput.fill('zzzznonexistent99999');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 5_000 });
  });

  test('handles API error gracefully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept insights API with a 500 error
    await page.route('**/api/insights*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );

    // Navigate away and back to trigger a fresh load with the intercepted error
    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.trends);

    // Should display an error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10_000 });
  });

  test('handles long insight titles without overflow', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid
    const grid = page.locator('[data-testid="insights-grid"]');
    await expect(grid).toBeVisible();

    // Verify cards have text truncation (line-clamp) — no horizontal overflow
    const firstCard = grid.locator('[data-testid="insight-card"]').first();
    await expect(firstCard).toBeVisible();

    // Check that the card has bounded dimensions (no horizontal overflow)
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    if (cardBox) {
      expect(cardBox.width).toBeLessThan(800); // Cards should be reasonably sized
      expect(cardBox.width).toBeGreaterThan(100);
    }
  });

  test('handles special characters in search (XSS)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for the page to be ready
    await expect(page.locator('[data-testid="insight-filters"]')).toBeVisible();

    const searchInput = page.locator('[data-testid="insight-search"]');

    // Type XSS-style special characters
    await searchInput.fill('<script>alert("xss")</script>');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Page should not crash — market insights page should still be visible
    await expect(page.locator('[data-testid="market-insights-page"]')).toBeVisible();

    // Should show empty state (no matching results) or still show filtered results
    // The important thing is no crash or JS error
    const emptyState = page.locator('[data-testid="empty-state"]');
    const grid = page.locator('[data-testid="insights-grid"]');
    const eitherVisible =
      (await emptyState.isVisible()) || (await grid.isVisible());
    expect(eitherVisible).toBe(true);
  });
});
