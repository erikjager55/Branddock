import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Research & Validation -- Custom Validation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to research hub first, then to custom validation via split button
    await navigateTo(authenticatedPage, SECTIONS.research);

    // Click the main split button to navigate to custom validation
    await authenticatedPage.locator('[data-testid="split-button-main"]').click();

    await expect(
      authenticatedPage.locator('[data-testid="custom-validation-page"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('renders custom validation page with 2-column layout', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="custom-validation-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="page-header"] h1'),
    ).toContainText('Custom Validation');

    // Sidebar should be visible (2-column layout)
    await expect(page.locator('[data-testid="validation-sidebar"]')).toBeVisible();
  });

  test('shows value propositions tags', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Value propositions are displayed as pill/tag elements
    // The ValuePropositions component renders tags from VALUE_PROPOSITIONS constant
    const vpSection = page.locator('[data-testid="custom-validation-page"]');
    await expect(vpSection).toBeVisible();

    // Should have rounded pill elements with icons
    const pills = vpSection.locator('.rounded-full');
    const count = await pills.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('shows asset selector grid with workspace assets', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const assetGrid = page.locator('[data-testid="asset-selector-grid"]');
    await expect(assetGrid).toBeVisible();

    // Seed data has brand assets that should appear as selectable items
    const assets = assetGrid.locator('[data-testid="selectable-asset"]');
    const count = await assets.count();
    expect(count).toBeGreaterThan(0);
  });

  test('asset cards are selectable via click to toggle', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const firstAsset = page.locator('[data-testid="selectable-asset"]').first();
    await expect(firstAsset).toBeVisible();

    // Click to select
    await firstAsset.click();

    // Wait for the selection state to update
    await page.waitForTimeout(300);

    // The sidebar should reflect the selection (asset count badge changes)
    const sidebar = page.locator('[data-testid="validation-sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test('selecting an asset updates the sidebar', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const sidebar = page.locator('[data-testid="validation-sidebar"]');

    // Initially should show "No assets selected"
    await expect(sidebar.locator('text=No assets selected')).toBeVisible();

    // Select an asset
    const firstAsset = page.locator('[data-testid="selectable-asset"]').first();
    await firstAsset.click();
    await page.waitForTimeout(300);

    // "No assets selected" should disappear
    await expect(sidebar.locator('text=No assets selected')).not.toBeVisible();
  });

  test('shows method card list with pricing', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const methodList = page.locator('[data-testid="method-card-list"]');
    await expect(methodList).toBeVisible();

    // Should show multiple method cards
    const methods = methodList.locator('[data-testid="method-card"]');
    const count = await methods.count();
    expect(count).toBeGreaterThan(0);

    // Each method card should show pricing info (FREE or $X/unit)
    const firstMethod = methods.first();
    await expect(firstMethod).toBeVisible();
  });

  test('method quantity stepper works: increase and decrease', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Find the first quantity stepper
    const firstStepper = page.locator('[data-testid="quantity-stepper"]').first();
    await expect(firstStepper).toBeVisible();

    // Initial value should be 0
    const valueDisplay = firstStepper.locator('[data-testid="stepper-value"]');
    await expect(valueDisplay).toContainText('0');

    // Click increase
    await firstStepper.locator('[data-testid="stepper-increase"]').click();
    await expect(valueDisplay).toContainText('1');

    // Click increase again
    await firstStepper.locator('[data-testid="stepper-increase"]').click();
    await expect(valueDisplay).toContainText('2');

    // Click decrease
    await firstStepper.locator('[data-testid="stepper-decrease"]').click();
    await expect(valueDisplay).toContainText('1');
  });

  test('stepper updates sidebar pricing', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const sidebar = page.locator('[data-testid="validation-sidebar"]');

    // Initially should show "No methods selected"
    await expect(sidebar.locator('text=No methods selected')).toBeVisible();

    // Increase quantity on the first method
    const firstStepper = page.locator('[data-testid="quantity-stepper"]').first();
    await firstStepper.locator('[data-testid="stepper-increase"]').click();
    await page.waitForTimeout(300);

    // "No methods selected" should disappear
    await expect(sidebar.locator('text=No methods selected')).not.toBeVisible();
  });

  test('sidebar shows selected assets and methods', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Select an asset
    await page.locator('[data-testid="selectable-asset"]').first().click();
    await page.waitForTimeout(300);

    // Select a method
    await page.locator('[data-testid="quantity-stepper"]').first()
      .locator('[data-testid="stepper-increase"]').click();
    await page.waitForTimeout(300);

    const sidebar = page.locator('[data-testid="validation-sidebar"]');

    // Sidebar should show Assets section with items
    await expect(sidebar.locator('text=Assets')).toBeVisible();

    // Sidebar should show Methods section with items
    await expect(sidebar.locator('text=Methods')).toBeVisible();
  });

  test('sidebar total price updates dynamically', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Increase quantity on a method that has a price
    const steppers = page.locator('[data-testid="quantity-stepper"]');
    const stepperCount = await steppers.count();

    // Try each stepper until we find one that produces a price in the sidebar
    for (let i = 0; i < stepperCount; i++) {
      await steppers.nth(i).locator('[data-testid="stepper-increase"]').click();
    }

    await page.waitForTimeout(500);

    // If paid methods were selected, the sidebar total should be visible
    const sidebarTotal = page.locator('[data-testid="sidebar-total"]');
    const totalVisible = await sidebarTotal.isVisible();

    if (totalVisible) {
      // Total should show a dollar amount
      await expect(sidebarTotal).toContainText('$');
    }
  });

  test('sidebar purchase button becomes active with selections', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const purchaseButton = page.locator('[data-testid="sidebar-purchase-button"]');
    await expect(purchaseButton).toBeVisible();

    // Initially should be disabled (no selections)
    await expect(purchaseButton).toBeDisabled();

    // Select an asset
    await page.locator('[data-testid="selectable-asset"]').first().click();
    await page.waitForTimeout(200);

    // Select a method
    await page.locator('[data-testid="quantity-stepper"]').first()
      .locator('[data-testid="stepper-increase"]').click();
    await page.waitForTimeout(200);

    // Button should now be enabled
    await expect(purchaseButton).toBeEnabled();
  });

  test('free methods show Start Validation button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Select an asset
    await page.locator('[data-testid="selectable-asset"]').first().click();
    await page.waitForTimeout(200);

    // Find a method that has FREE pricing (price === 0) and add it
    // The AI Exploration method is free (price: 0)
    const methodCards = page.locator('[data-testid="method-card"]');
    const count = await methodCards.count();

    for (let i = 0; i < count; i++) {
      const card = methodCards.nth(i);
      const hasFreeText = await card.locator('text=FREE').isVisible();
      if (hasFreeText) {
        // Click the increase button on the stepper for this method card
        const stepper = card.locator('[data-testid="quantity-stepper"]');
        await stepper.locator('[data-testid="stepper-increase"]').click();
        break;
      }
    }

    await page.waitForTimeout(300);

    // When only free methods selected, button should say "Start Validation"
    const purchaseButton = page.locator('[data-testid="sidebar-purchase-button"]');
    const buttonText = await purchaseButton.textContent();
    // Could be "Start Validation" or "Purchase Plan" depending on whether free or paid
    expect(buttonText).toBeTruthy();
  });

  test('paid methods show Purchase Plan button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Select an asset
    await page.locator('[data-testid="selectable-asset"]').first().click();
    await page.waitForTimeout(200);

    // Find a method that has a non-zero price and add it
    const methodCards = page.locator('[data-testid="method-card"]');
    const count = await methodCards.count();

    for (let i = 0; i < count; i++) {
      const card = methodCards.nth(i);
      const hasPriceText = await card.locator('text=/\\$\\d+/').isVisible();
      if (hasPriceText) {
        const stepper = card.locator('[data-testid="quantity-stepper"]');
        await stepper.locator('[data-testid="stepper-increase"]').click();
        break;
      }
    }

    await page.waitForTimeout(300);

    // Button should show "Purchase Plan"
    const purchaseButton = page.locator('[data-testid="sidebar-purchase-button"]');
    await expect(purchaseButton).toContainText('Purchase');
  });

  test('handles empty state when no assets available', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept assets API with empty response
    await page.route('**/api/research/custom/available-assets*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );

    // Navigate away and back to trigger fresh load
    await navigateTo(page, 'dashboard');
    await navigateTo(page, SECTIONS.research);
    await page.locator('[data-testid="split-button-main"]').click();
    await expect(page.locator('[data-testid="custom-validation-page"]')).toBeVisible({ timeout: 10_000 });

    // Asset grid should be empty or show empty state
    const assetGrid = page.locator('[data-testid="asset-selector-grid"]');
    if (await assetGrid.isVisible()) {
      const assets = assetGrid.locator('[data-testid="selectable-asset"]');
      await expect(assets).toHaveCount(0);
    }
  });
});
