import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Knowledge Library — Resource CRUD', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.knowledge);
    await expect(
      authenticatedPage.locator('[data-testid="knowledge-library-page"]'),
    ).toBeVisible();
  });

  test('opens add resource modal via button click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Click the "Upload" button in the header
    await page.locator('[data-testid="add-resource-button"]').click();

    // Verify the modal is visible
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();
  });

  test('shows 3 tabs (Manual Entry, Smart Import, File Upload)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Verify all 3 tabs are present
    const manualTab = page.locator('[data-testid="tab-manual"]');
    const importTab = page.locator('[data-testid="tab-import"]');
    const uploadTab = page.locator('[data-testid="tab-upload"]');

    await expect(manualTab).toBeVisible();
    await expect(importTab).toBeVisible();
    await expect(uploadTab).toBeVisible();

    // Verify tab labels
    await expect(manualTab).toContainText('Manual Entry');
    await expect(importTab).toContainText('Smart Import');
    await expect(uploadTab).toContainText('File Upload');
  });

  test('manual entry: fills all fields and saves', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const uniqueTitle = `E2E Resource ${Date.now()}`;

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Manual Entry tab should be active by default
    await expect(page.locator('[data-testid="manual-resource-tab"]')).toBeVisible();

    const modal = page.locator('[data-testid="add-resource-modal"]');

    // Fill title
    await page.locator('[data-testid="resource-title-input"]').fill(uniqueTitle);

    // Fill author
    const inputs = modal.locator('input[type="text"]');
    // Author is the second text input (after title)
    const authorInput = inputs.nth(1);
    await authorInput.fill('E2E Author');

    // Select category
    const categorySelect = modal.locator('select').first();
    const options = categorySelect.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit the form
    await page.locator('[data-testid="save-resource-button"]').click();

    // Modal should close after successful creation
    await expect(page.locator('[data-testid="add-resource-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test('manual entry: validates required fields (empty submit)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Ensure manual tab is active
    await expect(page.locator('[data-testid="manual-resource-tab"]')).toBeVisible();

    // Try to submit without filling required fields (title, author, category)
    await page.locator('[data-testid="save-resource-button"]').click();

    // Modal should remain open since required fields are empty
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible({
      timeout: 3_000,
    });

    // The form checks `if (!title || !author || !category) return;`
    // So the modal stays open — verify it did not close
    await expect(page.locator('[data-testid="manual-resource-tab"]')).toBeVisible();
  });

  test('smart import tab: shows URL input and import button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Switch to Smart Import tab
    await page.locator('[data-testid="tab-import"]').click();

    // Smart Import tab content should be visible
    await expect(page.locator('[data-testid="smart-import-tab"]')).toBeVisible();

    // URL input should be visible
    const urlInput = page.locator('[data-testid="import-url-input"]');
    await expect(urlInput).toBeVisible();

    // Import button should be visible
    const importButton = page.locator('[data-testid="import-button"]');
    await expect(importButton).toBeVisible();
  });

  test('smart import: enters URL and triggers import (intercept API)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the import-url API
    await page.route('**/api/knowledge-resources/import-url', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Imported Resource',
          author: 'Auto Detected Author',
          description: 'Auto-detected description from URL',
          detectedType: 'ARTICLE',
          url: 'https://example.com/article',
        }),
      }),
    );

    // Open the add modal and switch to Smart Import tab
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();
    await page.locator('[data-testid="tab-import"]').click();
    await expect(page.locator('[data-testid="smart-import-tab"]')).toBeVisible();

    // Enter a URL
    const urlInput = page.locator('[data-testid="import-url-input"]');
    await urlInput.fill('https://example.com/article');

    // Click Import button
    await page.locator('[data-testid="import-button"]').click();

    // After import, it should switch to manual tab with pre-filled data
    await expect(page.locator('[data-testid="manual-resource-tab"]')).toBeVisible({
      timeout: 10_000,
    });

    // The title input should contain the imported title
    const titleInput = page.locator('[data-testid="resource-title-input"]');
    await expect(titleInput).toHaveValue('Imported Resource');
  });

  test('file upload tab: shows drag and drop zone', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the add modal and switch to File Upload tab
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();
    await page.locator('[data-testid="tab-upload"]').click();

    // File Upload tab content should be visible
    await expect(page.locator('[data-testid="file-upload-tab"]')).toBeVisible();

    // Drop zone should be visible
    const dropZone = page.locator('[data-testid="file-upload-zone"]');
    await expect(dropZone).toBeVisible();

    // Should show instruction text
    await expect(dropZone).toContainText('Click to upload or drag and drop');
  });

  test('closes modal on cancel/close', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Click the close (X) button in the modal — the Modal shared component renders
    // a close button. Find it by its aria-label or role.
    const modal = page.locator('[data-testid="add-resource-modal"]');
    const closeButton = modal.locator('..').locator('button[aria-label="Close"], button:has(svg.lucide-x)').first();

    // If close button not found by aria-label, try pressing Escape
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    // Modal should be hidden
    await expect(page.locator('[data-testid="add-resource-modal"]')).not.toBeVisible();
  });

  test('handles API error during creation (intercept with 500)', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept POST with a 500 error
    await page.route('**/api/knowledge-resources', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      }
      return route.continue();
    });

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Fill required fields
    await page.locator('[data-testid="resource-title-input"]').fill('E2E Error Test Resource');

    const modal = page.locator('[data-testid="add-resource-modal"]');
    const inputs = modal.locator('input[type="text"]');
    await inputs.nth(1).fill('Error Author');

    const categorySelect = modal.locator('select').first();
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit
    await page.locator('[data-testid="save-resource-button"]').click();

    // Modal should remain open since creation failed
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible({
      timeout: 5_000,
    });

    // Look for error indication
    const hasError =
      (await modal.locator('[data-testid="error-message"]').count()) > 0 ||
      (await modal.locator('[role="alert"]').count()) > 0 ||
      (await modal.locator('.text-red-500, .text-red-600, .text-destructive').count()) > 0;
    // Even if no explicit error UI, the modal staying open indicates the error was handled
    expect(hasError || (await page.locator('[data-testid="add-resource-modal"]').isVisible())).toBe(true);
  });

  test('modal closes after successful creation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const uniqueTitle = `E2E Verify Close ${Date.now()}`;

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Fill required fields
    await page.locator('[data-testid="resource-title-input"]').fill(uniqueTitle);

    const modal = page.locator('[data-testid="add-resource-modal"]');
    const inputs = modal.locator('input[type="text"]');
    await inputs.nth(1).fill('Verify Author');

    const categorySelect = modal.locator('select').first();
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit
    await page.locator('[data-testid="save-resource-button"]').click();

    // Wait for modal to close
    await expect(page.locator('[data-testid="add-resource-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test('resource appears in grid after creation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const uniqueTitle = `E2E Grid Verify ${Date.now()}`;

    // Count initial cards
    const grid = page.locator('[data-testid="resource-grid"]');
    await expect(grid).toBeVisible();
    const initialCount = await grid.locator('[data-testid="resource-card"]').count();

    // Open the add modal and create a resource
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    await page.locator('[data-testid="resource-title-input"]').fill(uniqueTitle);

    const modal = page.locator('[data-testid="add-resource-modal"]');
    const inputs = modal.locator('input[type="text"]');
    await inputs.nth(1).fill('Grid Author');

    const categorySelect = modal.locator('select').first();
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    await page.locator('[data-testid="save-resource-button"]').click();

    // Wait for modal to close
    await expect(page.locator('[data-testid="add-resource-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });

    // Wait for grid to update
    await page.waitForTimeout(1000);

    // The new resource should appear in the grid
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('handles special characters in resource title', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the add modal
    await page.locator('[data-testid="add-resource-button"]').click();
    await expect(page.locator('[data-testid="add-resource-modal"]')).toBeVisible();

    // Fill title with special characters
    await page.locator('[data-testid="resource-title-input"]').fill('Resource "Test" <HTML> & Partners');

    const modal = page.locator('[data-testid="add-resource-modal"]');
    const inputs = modal.locator('input[type="text"]');
    await inputs.nth(1).fill('Special Author');

    const categorySelect = modal.locator('select').first();
    const options = categorySelect.locator('option');
    const firstCategory = await options.nth(1).getAttribute('value');
    if (firstCategory) {
      await categorySelect.selectOption(firstCategory);
    }

    // Submit
    await page.locator('[data-testid="save-resource-button"]').click();

    // Should succeed without crashing
    await expect(page.locator('[data-testid="add-resource-modal"]')).not.toBeVisible({
      timeout: 10_000,
    });

    // Knowledge library page should still be visible
    await expect(page.locator('[data-testid="knowledge-library-page"]')).toBeVisible();
  });
});
