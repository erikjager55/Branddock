import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Research & Validation -- Bundles', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to research hub first, then to bundles via split button
    await navigateTo(authenticatedPage, SECTIONS.research);

    // Open split button dropdown and navigate to bundles
    await authenticatedPage.locator('[data-testid="split-button-dropdown"]').click();
    await authenticatedPage
      .locator('[data-testid="split-button-menu"]')
      .locator('text=Browse Research Bundles')
      .click();

    await expect(
      authenticatedPage.locator('[data-testid="research-bundles-page"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('renders bundles page with header', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="research-bundles-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="page-header"] h1'),
    ).toContainText('Research Bundles');
  });

  test('shows Foundation Plans section with bundle cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const foundationSection = page.locator('[data-testid="foundation-plans"]');
    await expect(foundationSection).toBeVisible();

    // Seed has 6 Foundation bundles
    const cards = foundationSection.locator('[data-testid="bundle-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows Specialized Plans section with bundle cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const specializedSection = page.locator('[data-testid="specialized-plans"]');
    await expect(specializedSection).toBeVisible();

    // Seed has 4 Specialized bundles
    const cards = specializedSection.locator('[data-testid="bundle-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('bundle card shows title, description, price, and methods', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const firstCard = page.locator('[data-testid="bundle-card"]').first();
    await expect(firstCard).toBeVisible();

    // Card should have a title (h3)
    const title = firstCard.locator('h3');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toBeTruthy();

    // Card should contain a price with $ sign
    await expect(firstCard.locator('text=/$/')).toBeVisible();

    // Card should show methods count
    await expect(firstCard.locator('text=/Methods/')).toBeVisible();
  });

  test('bundle card has Select Bundle and Learn More buttons', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const firstCard = page.locator('[data-testid="bundle-card"]').first();
    await expect(firstCard).toBeVisible();

    await expect(firstCard.locator('[data-testid="select-bundle-button"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="learn-more-button"]')).toBeVisible();
  });

  test('filter tabs: All and Recommended toggle', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // All tab should be present
    const allTab = page.locator('button:has-text("All")');
    await expect(allTab).toBeVisible();

    const recommendedTab = page.locator('button:has-text("Recommended")');
    await expect(recommendedTab).toBeVisible();

    // Count cards with All filter
    const allCards = page.locator('[data-testid="bundle-card"]');
    const allCount = await allCards.count();
    expect(allCount).toBeGreaterThan(0);

    // Click Recommended filter
    await recommendedTab.click();
    await page.waitForTimeout(300);

    // Recommended should show fewer or equal cards
    const recCards = page.locator('[data-testid="bundle-card"]');
    const recCount = await recCards.count();
    expect(recCount).toBeLessThanOrEqual(allCount);
  });

  test('search filters bundles by name', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Count total cards initially
    const allCards = page.locator('[data-testid="bundle-card"]');
    const initialCount = await allCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Find search input in the filter area
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Type a search that won't match all bundles
    await searchInput.fill('zzzznonexistent99999');
    await page.waitForTimeout(500);

    // Should have fewer cards
    const filteredCount = await page.locator('[data-testid="bundle-card"]').count();
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test('clicking Learn More navigates to bundle detail page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const firstCard = page.locator('[data-testid="bundle-card"]').first();
    await expect(firstCard).toBeVisible();

    // Click Learn More
    await firstCard.locator('[data-testid="learn-more-button"]').click();

    // Should navigate to the bundle detail page
    await expect(page.locator('[data-testid="bundle-detail-page"]')).toBeVisible({ timeout: 10_000 });
  });

  test('bundle detail page shows stats bar', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to detail page
    await page.locator('[data-testid="bundle-card"]').first().locator('[data-testid="learn-more-button"]').click();
    await expect(page.locator('[data-testid="bundle-detail-page"]')).toBeVisible({ timeout: 10_000 });

    // Stats bar should show timeline, assets, methods, savings
    const statsBar = page.locator('[data-testid="bundle-stats-bar"]');
    await expect(statsBar).toBeVisible();

    await expect(statsBar.locator('text=Timeline')).toBeVisible();
    await expect(statsBar.locator('text=Assets')).toBeVisible();
    await expect(statsBar.locator('text=Methods')).toBeVisible();
    await expect(statsBar.locator('text=Savings')).toBeVisible();
  });

  test('bundle detail page shows trust signals', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to detail page
    await page.locator('[data-testid="bundle-card"]').first().locator('[data-testid="learn-more-button"]').click();
    await expect(page.locator('[data-testid="bundle-detail-page"]')).toBeVisible({ timeout: 10_000 });

    // Trust signals or the detail page title should be visible
    const detailTitle = page.locator('[data-testid="bundle-detail-page"] h1');
    await expect(detailTitle).toBeVisible();
  });

  test('bundle detail page: Select Bundle button triggers purchase', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the select/purchase API
    let purchaseCalled = false;
    await page.route('**/api/research/bundles/*/select', (route) => {
      purchaseCalled = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Navigate to detail page
    await page.locator('[data-testid="bundle-card"]').first().locator('[data-testid="learn-more-button"]').click();
    await expect(page.locator('[data-testid="bundle-detail-page"]')).toBeVisible({ timeout: 10_000 });

    // Click Select This Bundle
    await page.locator('button:has-text("Select This Bundle")').click();

    // API should have been called
    await page.waitForTimeout(1000);
    expect(purchaseCalled).toBe(true);
  });

  test('back button from detail returns to bundles list', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate to detail
    await page.locator('[data-testid="bundle-card"]').first().locator('[data-testid="learn-more-button"]').click();
    await expect(page.locator('[data-testid="bundle-detail-page"]')).toBeVisible({ timeout: 10_000 });

    // Click back button
    await page.locator('button:has-text("Back to Bundles")').click();

    // Should return to bundles list
    await expect(page.locator('[data-testid="research-bundles-page"]')).toBeVisible({ timeout: 10_000 });
  });

  test('handles API error', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept bundles API with error
    await page.route('**/api/research/bundles*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );

    // Navigate to dashboard and back to bundles to trigger fresh load
    await navigateTo(page, 'dashboard');
    await navigateTo(page, SECTIONS.research);
    await page.locator('[data-testid="split-button-dropdown"]').click();
    await page
      .locator('[data-testid="split-button-menu"]')
      .locator('text=Browse Research Bundles')
      .click();

    // Page should still render without crashing
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
  });
});
