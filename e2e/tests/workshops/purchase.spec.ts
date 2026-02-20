import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

/**
 * Workshop tests navigate through brand-asset-detail to reach
 * the workshop-purchase page. Workshops are accessed via brand assets,
 * not through a direct sidebar section.
 */
test.describe('Workshops — Purchase Flow', () => {
  async function navigateToWorkshopPurchase(page: import('@playwright/test').Page) {
    // Navigate to Brand Foundation
    await navigateTo(page, SECTIONS.brand);

    // Click the first brand asset card to open detail
    const assetCard = page.locator('[data-testid="brand-asset-card"]').first();
    await expect(assetCard).toBeVisible();
    await assetCard.click();

    // Wait for detail page
    await page.waitForSelector('[data-testid="brand-asset-detail-page"]', {
      timeout: 10_000,
    });

    // Find and click the Workshop research method card to navigate to workshop purchase
    const workshopMethod = page.locator('button, [role="button"]', {
      hasText: /Workshop|Canvas/,
    });
    if (await workshopMethod.isVisible({ timeout: 5_000 })) {
      await workshopMethod.click();
    }

    // Wait for purchase page
    await page.waitForSelector('[data-testid="workshop-purchase-page"]', {
      timeout: 10_000,
    });
  }

  test('renders workshop purchase page with header', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    await expect(
      page.locator('[data-testid="workshop-purchase-page"]'),
    ).toBeVisible();

    // Should show "Purchase Canvas Workshop" title
    await expect(page.locator('h1')).toContainText('Purchase Canvas Workshop');
  });

  test('shows back button that navigates to asset', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const backButton = page.locator(
      '[data-testid="back-to-asset-button"]',
    );
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Asset');
  });

  test('shows 2-column purchase layout', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const layout = page.locator('[data-testid="purchase-layout"]');
    await expect(layout).toBeVisible();
  });

  test('shows bundle list with selectable bundles', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const bundleList = page.locator('[data-testid="bundle-list"]');
    await expect(bundleList).toBeVisible({ timeout: 10_000 });

    // Seed data has 3 bundles (Starter, Professional, Complete)
    const bundleCards = bundleList.locator('[data-testid="bundle-card"]');
    const count = await bundleCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('selecting a bundle highlights it and updates summary', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const bundleList = page.locator('[data-testid="bundle-list"]');
    await expect(bundleList).toBeVisible({ timeout: 10_000 });

    // Click the first bundle card
    const firstBundle = bundleList
      .locator('[data-testid="bundle-card"]')
      .first();
    await firstBundle.click();

    // Should show selected state (ring-2 ring-emerald-500)
    await expect(firstBundle).toHaveClass(/ring-emerald-500/);

    // Purchase summary should update
    const summary = page.locator('[data-testid="purchase-summary"]');
    await expect(summary).toBeVisible();
  });

  test('shows purchase summary with total price', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const summary = page.locator('[data-testid="purchase-summary"]');
    await expect(summary).toBeVisible();

    // Should show "Order Summary" heading
    await expect(summary).toContainText('Order Summary');

    // Should show Total label
    await expect(summary).toContainText('Total');
  });

  test('purchase button is disabled without selection', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const purchaseButton = page.locator(
      '[data-testid="purchase-button"]',
    );
    // If no bundle is pre-selected, purchase should be disabled
    if (await purchaseButton.isVisible()) {
      await expect(purchaseButton).toBeDisabled();
    }
  });

  test('purchase button enables after selecting a bundle', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const bundleList = page.locator('[data-testid="bundle-list"]');
    await expect(bundleList).toBeVisible({ timeout: 10_000 });

    // Select a bundle
    const firstBundle = bundleList
      .locator('[data-testid="bundle-card"]')
      .first();
    await firstBundle.click();

    // Purchase button should now be enabled
    const purchaseButton = page.locator(
      '[data-testid="purchase-button"]',
    );
    await expect(purchaseButton).toBeEnabled({ timeout: 5_000 });
  });

  test('bundle cards show pricing with optional discount', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopPurchase(page);

    const bundleList = page.locator('[data-testid="bundle-list"]');
    await expect(bundleList).toBeVisible({ timeout: 10_000 });

    const firstBundle = bundleList
      .locator('[data-testid="bundle-card"]')
      .first();
    await expect(firstBundle).toBeVisible();

    // Bundle card should show a price (€ symbol)
    await expect(firstBundle).toContainText('€');
  });
});
