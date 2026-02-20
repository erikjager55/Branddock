import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Brand Foundation — Overview', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.brand);
  });

  test('renders brand foundation page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="page-header"] h1'),
    ).toContainText('Brand Foundation');
    await expect(
      page.locator('[data-testid="page-header"]'),
    ).toContainText('Your core brand assets and identity');
  });

  test('shows 4 stat cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const statsContainer = page.locator('[data-testid="brand-stats"]');
    await expect(statsContainer).toBeVisible();

    // Should contain exactly 4 StatCard elements
    const statCards = statsContainer.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4);
  });

  test('shows asset grid with seed data', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const grid = page.locator('[data-testid="asset-grid"]');
    await expect(grid).toBeVisible();

    // Seed data has 13 brand assets
    const cards = grid.locator('[data-testid="brand-asset-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows filter bar', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const filters = page.locator('[data-testid="asset-filters"]');
    await expect(filters).toBeVisible();

    // Should contain a search input
    const searchInput = filters.locator('input[type="text"], input[type="search"]');
    await expect(searchInput.first()).toBeVisible();
  });

  test('filters assets by search', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to be populated
    const grid = page.locator('[data-testid="asset-grid"]');
    await expect(grid).toBeVisible();
    const initialCards = grid.locator('[data-testid="brand-asset-card"]');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a search term that matches a known seed asset
    const searchInput = page
      .locator('[data-testid="asset-filters"]')
      .locator('input[type="text"], input[type="search"]')
      .first();
    await searchInput.fill('brand');

    // Wait for debounce and re-render
    await page.waitForTimeout(500);

    // Filtered results should be visible
    const filteredCards = grid.locator('[data-testid="brand-asset-card"]');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('filters assets by category', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to be populated
    const grid = page.locator('[data-testid="asset-grid"]');
    await expect(grid).toBeVisible();

    // Find and interact with the category filter (select element)
    const categoryFilter = page
      .locator('[data-testid="asset-filters"]')
      .locator('select')
      .first();
    await expect(categoryFilter).toBeVisible();

    // Select a category — get available options first
    const options = categoryFilter.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1); // At least "All" + one category

    // Select the second option (first non-default category)
    const secondOption = await options.nth(1).getAttribute('value');
    if (secondOption) {
      await categoryFilter.selectOption(secondOption);
      await page.waitForTimeout(300);

      // Grid should still be visible with filtered results
      await expect(grid).toBeVisible();
    }
  });

  test('shows loading skeletons initially', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the brand-assets API with a delayed response
    await page.route('**/api/brand-assets*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate again to trigger a fresh load
    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.brand);

    // Should show skeleton loaders while data is being fetched
    const skeleton = page.locator('[data-testid="skeleton-loader"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 5_000 });
  });

  test('shows empty state when no results', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to appear
    const grid = page.locator('[data-testid="asset-grid"]');
    await expect(grid).toBeVisible();

    // Search for nonsense text that won't match any assets
    const searchInput = page
      .locator('[data-testid="asset-filters"]')
      .locator('input[type="text"], input[type="search"]')
      .first();
    await searchInput.fill('zzzznonexistent99999');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 5_000 });
  });

  test('handles API error', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept brand-assets API with a 500 error
    await page.route('**/api/brand-assets*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );

    // Navigate again to trigger a fresh load with the intercepted error
    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.brand);

    // Should display an error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10_000 });
  });

  test('handles long asset names gracefully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid
    const grid = page.locator('[data-testid="asset-grid"]');
    await expect(grid).toBeVisible();

    // Verify cards have text truncation (line-clamp) — no overflow
    const firstCard = grid.locator('[data-testid="brand-asset-card"]').first();
    await expect(firstCard).toBeVisible();

    // Check that the card has bounded dimensions (no horizontal overflow)
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    if (cardBox) {
      expect(cardBox.width).toBeLessThan(800); // Cards should be reasonably sized
      expect(cardBox.width).toBeGreaterThan(100);
    }
  });

  test('handles special characters in search', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for the page to be ready
    await expect(page.locator('[data-testid="asset-filters"]')).toBeVisible();

    const searchInput = page
      .locator('[data-testid="asset-filters"]')
      .locator('input[type="text"], input[type="search"]')
      .first();

    // Type XSS-style special characters
    await searchInput.fill('<script>alert("xss")</script>');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Page should not crash — brand foundation page should still be visible
    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible();

    // Should show empty state (no matching results) or still show filtered results
    // The important thing is no crash or JS error
    const emptyState = page.locator('[data-testid="empty-state"]');
    const grid = page.locator('[data-testid="asset-grid"]');
    const eitherVisible =
      (await emptyState.isVisible()) || (await grid.isVisible());
    expect(eitherVisible).toBe(true);
  });
});
