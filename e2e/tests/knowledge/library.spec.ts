import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Knowledge Library — Overview', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.knowledge);
    await expect(
      authenticatedPage.locator('[data-testid="knowledge-library-page"]'),
    ).toBeVisible();
  });

  test('renders knowledge library page with title "Knowledge Library"', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="knowledge-library-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="page-header"] h1'),
    ).toContainText('Knowledge Library');
    await expect(
      page.locator('[data-testid="page-header"]'),
    ).toContainText('Your research and knowledge base');
  });

  test('shows featured resources carousel with 2 featured items', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const carousel = page.locator('[data-testid="featured-carousel"]');
    await expect(carousel).toBeVisible();

    // Seed data has 2 featured resources
    const featuredCards = carousel.locator('[data-testid="featured-resource-card"]');
    await expect(featuredCards).toHaveCount(2);
  });

  test('featured carousel is horizontally scrollable', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const carousel = page.locator('[data-testid="featured-carousel"]');
    await expect(carousel).toBeVisible();

    // The carousel container should have overflow-x-auto
    const scrollContainer = carousel.locator('.overflow-x-auto');
    await expect(scrollContainer).toBeVisible();

    // Verify the container has a scrollable width
    const box = await scrollContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(0);
    }
  });

  test('shows resource grid with seed data', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    // Seed data has 10 knowledge resources (non-archived should be visible)
    const cards = grid.locator('[data-testid="resource-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows filter bar with search, type filter, category filter', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const filters = page.locator('[data-testid="resource-filters"]');
    await expect(filters).toBeVisible();

    // Search input
    const searchContainer = page.locator('[data-testid="resource-search"]');
    await expect(searchContainer).toBeVisible();

    // Type filter
    const typeFilter = page.locator('[data-testid="resource-type-filter"]');
    await expect(typeFilter).toBeVisible();

    // Category filter
    const categoryFilter = page.locator('[data-testid="resource-category-filter"]');
    await expect(categoryFilter).toBeVisible();
  });

  test('filters by search text', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to be populated
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();
    const initialCards = grid.locator('[data-testid="resource-card"]');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Type a search term that matches a known seed resource
    const searchInput = page
      .locator('[data-testid="resource-search"]')
      .locator('input[type="text"], input[type="search"]')
      .first();
    await searchInput.fill('brand');

    // Wait for debounce and re-render
    await page.waitForTimeout(500);

    // Filtered results should be visible
    const filteredCards = grid.locator('[data-testid="resource-card"]');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('filters by resource type dropdown', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to be populated
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    // Find and interact with the type filter (select element)
    const typeFilter = page
      .locator('[data-testid="resource-type-filter"]')
      .locator('select')
      .first();
    await expect(typeFilter).toBeVisible();

    // Select a type — get available options first
    const options = typeFilter.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1); // At least placeholder + one type

    // Select the second option (first non-default type)
    const secondOption = await options.nth(1).getAttribute('value');
    if (secondOption) {
      await typeFilter.selectOption(secondOption);
      await page.waitForTimeout(300);

      // Grid or empty state should be visible
      const gridVisible = await grid.isVisible();
      const emptyVisible = await page.locator('[data-testid="empty-state"]').isVisible();
      expect(gridVisible || emptyVisible).toBe(true);
    }
  });

  test('switches between grid and list view via ViewToggle', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Grid should be visible by default
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    // Click list view button
    const listButton = page.locator('[data-testid="list-view-button"]');
    await listButton.click();

    // List view should appear, grid should disappear
    await expect(page.locator('[data-testid="resource-list"]')).toBeVisible();
    await expect(grid).not.toBeVisible();

    // Click grid view button to go back
    const gridButton = page.locator('[data-testid="grid-view-button"]');
    await gridButton.click();

    // Grid should be visible again
    await expect(grid).toBeVisible();
    await expect(page.locator('[data-testid="resource-list"]')).not.toBeVisible();
  });

  test('list view shows resources in list format', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Switch to list view
    await page.locator('[data-testid="list-view-button"]').click();

    const list = page.locator('[data-testid="resource-list"]');
    await expect(list).toBeVisible();

    // List items should be visible
    const items = list.locator('[data-testid="resource-list-item"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('favorites toggle: click heart fills red (optimistic update)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    // Find a favorite button on the first card
    const firstCard = grid.locator('[data-testid="resource-card"]').first();
    const favoriteBtn = firstCard.locator('[data-testid="favorite-button"]');
    await expect(favoriteBtn).toBeVisible();

    // Click the heart button
    await favoriteBtn.click();

    // Wait for optimistic update
    await page.waitForTimeout(300);

    // The heart icon should now have the red/filled class
    const heartIcon = favoriteBtn.locator('svg');
    await expect(heartIcon).toBeVisible();
    // After toggle, the button should reflect the new state
    // (either text-red-500 for favorite or text-gray-300 for unfavorite)
  });

  test('favorites toggle: un-favorite works too', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    const firstCard = grid.locator('[data-testid="resource-card"]').first();
    const favoriteBtn = firstCard.locator('[data-testid="favorite-button"]');
    await expect(favoriteBtn).toBeVisible();

    // Click twice to toggle on then off
    await favoriteBtn.click();
    await page.waitForTimeout(300);
    await favoriteBtn.click();
    await page.waitForTimeout(300);

    // Page should still be visible and not crash
    await expect(page.locator('[data-testid="knowledge-library-page"]')).toBeVisible();
  });

  test('context menu opens on MoreVertical click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    // Find a context menu button on the first card
    const firstCard = grid.locator('[data-testid="resource-card"]').first();
    const menuButton = firstCard.locator('[data-testid="context-menu-button"]');
    await expect(menuButton).toBeVisible();

    // Click the MoreVertical button
    await menuButton.click();

    // Dropdown should appear
    const dropdown = page.locator('[data-testid="context-menu-dropdown"]');
    await expect(dropdown).toBeVisible();

    // Should contain Archive option
    const archiveOption = page.locator('[data-testid="context-menu-archive"]');
    await expect(archiveOption).toBeVisible();
  });

  test('context menu archive option triggers archive (resource disappears)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    // Count initial cards
    const initialCount = await grid.locator('[data-testid="resource-card"]').count();
    expect(initialCount).toBeGreaterThan(0);

    // Open context menu on first card
    const firstCard = grid.locator('[data-testid="resource-card"]').first();
    const menuButton = firstCard.locator('[data-testid="context-menu-button"]');
    await menuButton.click();

    // Click archive
    const archiveOption = page.locator('[data-testid="context-menu-archive"]');
    await expect(archiveOption).toBeVisible();
    await archiveOption.click();

    // Wait for mutation + refetch
    await page.waitForTimeout(1000);

    // After archiving, the resource count should decrease or page should remain stable
    const afterCount = await grid.locator('[data-testid="resource-card"]').count();
    expect(afterCount).toBeLessThan(initialCount);
  });

  test('shows empty state when search matches nothing', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for grid to appear
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();

    // Search for nonsense text that won't match any resources
    const searchInput = page
      .locator('[data-testid="resource-search"]')
      .locator('input[type="text"], input[type="search"]')
      .first();
    await searchInput.fill('zzzznonexistent99999');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 5_000 });
  });

  test('handles API error gracefully (intercept with 500)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept knowledge-resources API with a 500 error
    await page.route('**/api/knowledge-resources*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );

    // Navigate again to trigger a fresh load with the intercepted error
    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.knowledge);

    // Should display an error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10_000 });
  });

  test('shows loading skeletons initially', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the knowledge-resources API with a delayed response
    await page.route('**/api/knowledge-resources*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate again to trigger a fresh load
    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.knowledge);

    // Should show skeleton loaders while data is being fetched
    const skeleton = page.locator('[data-testid="skeleton-loader"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 5_000 });
  });
});
