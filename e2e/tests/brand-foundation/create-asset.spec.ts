import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Brand Foundation — Create Asset', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.brand);
    await expect(
      authenticatedPage.locator('[data-testid="brand-foundation-page"]'),
    ).toBeVisible();
  });

  test('opens create modal', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Click the "Add Asset" button in the header
    await page.getByRole('button', { name: /add asset/i }).click();

    // Verify the modal is visible
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-asset-form"]')).toBeVisible();
  });

  test('form validates required fields', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Try to submit the empty form
    await page.locator('[data-testid="create-asset-submit"]').click();

    // Form should not close — modal should still be visible
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Should show validation error(s) for required fields
    // Name and category are required
    const modal = page.locator('[data-testid="create-asset-modal"]');
    const hasError =
      (await modal.locator('[role="alert"]').count()) > 0 ||
      (await modal.locator('.text-red-500, .text-red-600, .text-destructive').count()) > 0 ||
      (await modal.locator(':text("required")').count()) > 0;
    expect(hasError).toBe(true);
  });

  test('creates asset with name and category', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Fill in required fields
    const nameInput = page.locator('[data-testid="create-asset-name"]');
    await nameInput.fill('E2E Test Asset');

    const categorySelect = page.locator('[data-testid="create-asset-category"]');
    // Select first available category option
    const options = categorySelect.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit the form
    await page.locator('[data-testid="create-asset-submit"]').click();

    // Modal should close after successful creation
    await expect(page.locator('[data-testid="create-asset-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test('creates asset with all fields', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Fill in all fields
    const nameInput = page.locator('[data-testid="create-asset-name"]');
    await nameInput.fill('E2E Full Asset');

    const categorySelect = page.locator('[data-testid="create-asset-category"]');
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Fill description if field exists
    const descriptionField = page.locator(
      '[data-testid="create-asset-modal"] textarea',
    );
    if ((await descriptionField.count()) > 0) {
      await descriptionField.first().fill(
        'This is a detailed description for the E2E test asset with all fields filled in.',
      );
    }

    // Submit
    await page.locator('[data-testid="create-asset-submit"]').click();

    // Modal should close after successful creation
    await expect(page.locator('[data-testid="create-asset-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test('closes modal on cancel', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Click Cancel button
    const cancelButton = page
      .locator('[data-testid="create-asset-modal"]')
      .getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Modal should be hidden
    await expect(page.locator('[data-testid="create-asset-modal"]')).not.toBeVisible();
  });

  test('handles special characters in name', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Fill name with special characters
    const nameInput = page.locator('[data-testid="create-asset-name"]');
    await nameInput.fill('Brand "Test" <Asset> & Partners');

    const categorySelect = page.locator('[data-testid="create-asset-category"]');
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit
    await page.locator('[data-testid="create-asset-submit"]').click();

    // Should succeed without crashing
    await expect(page.locator('[data-testid="create-asset-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });

    // Brand foundation page should still be visible
    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible();
  });

  test('handles long description', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Fill required fields
    const nameInput = page.locator('[data-testid="create-asset-name"]');
    await nameInput.fill('E2E Long Description Asset');

    const categorySelect = page.locator('[data-testid="create-asset-category"]');
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Fill description with 500+ characters
    const longDescription = 'A'.repeat(600);
    const descriptionField = page.locator(
      '[data-testid="create-asset-modal"] textarea',
    );
    if ((await descriptionField.count()) > 0) {
      await descriptionField.first().fill(longDescription);
    }

    // Submit
    await page.locator('[data-testid="create-asset-submit"]').click();

    // Should succeed or show a validation error — not crash
    const modalStillVisible = await page
      .locator('[data-testid="create-asset-modal"]')
      .isVisible();
    const pageStillVisible = await page
      .locator('[data-testid="brand-foundation-page"]')
      .isVisible();
    expect(pageStillVisible).toBe(true);
    // If modal is still visible, it should be showing a validation message, not a crash
  });

  test('shows loading state during creation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the POST API with a delay
    await page.route('**/api/brand-assets', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Fill required fields
    await page.locator('[data-testid="create-asset-name"]').fill('E2E Loading Test');
    const categorySelect = page.locator('[data-testid="create-asset-category"]');
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit
    await page.locator('[data-testid="create-asset-submit"]').click();

    // Submit button should show loading state (disabled or loading text/spinner)
    const submitBtn = page.locator('[data-testid="create-asset-submit"]');
    const isDisabled = await submitBtn.isDisabled();
    const hasLoadingText =
      (await submitBtn.textContent())?.toLowerCase().includes('loading') ||
      (await submitBtn.textContent())?.toLowerCase().includes('creating') ||
      (await submitBtn.textContent())?.toLowerCase().includes('bezig');
    expect(isDisabled || hasLoadingText).toBe(true);
  });

  test('handles API error during creation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept POST with a 500 error
    await page.route('**/api/brand-assets', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      }
      return route.continue();
    });

    // Open the create modal
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    // Fill required fields
    await page.locator('[data-testid="create-asset-name"]').fill('E2E Error Test');
    const categorySelect = page.locator('[data-testid="create-asset-category"]');
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit
    await page.locator('[data-testid="create-asset-submit"]').click();

    // Should show an error message — modal should remain open
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible({
      timeout: 5_000,
    });

    // Look for error indication within the modal
    const modal = page.locator('[data-testid="create-asset-modal"]');
    const hasError =
      (await modal.locator('[data-testid="error-message"]').count()) > 0 ||
      (await modal.locator('[role="alert"]').count()) > 0 ||
      (await modal.locator('.text-red-500, .text-red-600, .text-destructive').count()) > 0;
    expect(hasError).toBe(true);
  });

  test('asset appears in grid after creation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const uniqueName = `E2E Grid Verify ${Date.now()}`;

    // Count initial cards
    const grid = page.locator('[data-testid="asset-grid"]');
    await expect(grid).toBeVisible();
    const initialCount = await grid.locator('[data-testid="brand-asset-card"]').count();

    // Open the create modal and create an asset
    await page.getByRole('button', { name: /add asset/i }).click();
    await expect(page.locator('[data-testid="create-asset-modal"]')).toBeVisible();

    await page.locator('[data-testid="create-asset-name"]').fill(uniqueName);
    const categorySelect = page.locator('[data-testid="create-asset-category"]');
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    await page.locator('[data-testid="create-asset-submit"]').click();

    // Wait for modal to close
    await expect(page.locator('[data-testid="create-asset-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });

    // Wait for grid to update
    await page.waitForTimeout(1000);

    // The new asset should appear in the grid
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });
});
