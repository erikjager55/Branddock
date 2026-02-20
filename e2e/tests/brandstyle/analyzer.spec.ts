import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

/**
 * Mock the styleguide API to return a DRAFT (non-COMPLETE) styleguide.
 * Without this, the analyzer page auto-redirects to the styleguide-guide page
 * because the seed data has a COMPLETE styleguide.
 */
async function interceptStyleguideAsDraft(page: import('@playwright/test').Page) {
  await page.route('**/api/brandstyle', (route) => {
    // Only intercept GET requests (not PATCH etc.)
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ styleguide: null }),
      });
    }
    return route.continue();
  });
}

test.describe('Brandstyle Analyzer', () => {
  test('renders analyzer page', async ({ authenticatedPage }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    await expect(
      authenticatedPage.locator('[data-testid="brandstyle-analyzer"]'),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-testid="page-header"] h1'),
    ).toContainText('Brandstyle');
  });

  test('shows URL input tab by default', async ({ authenticatedPage }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    await expect(
      authenticatedPage.locator('[data-testid="url-input"]'),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-testid="analyze-button"]'),
    ).toBeVisible();
  });

  test('shows PDF upload tab', async ({ authenticatedPage }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    // Click the PDF tab to switch input mode
    await authenticatedPage
      .locator('button', { hasText: /PDF/i })
      .click();

    // Verify the PDF upload area is visible
    await expect(
      authenticatedPage.locator('[data-testid="pdf-upload-area"]'),
    ).toBeVisible();
  });

  test('URL input validates empty submission', async ({
    authenticatedPage,
  }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    // The analyze button should be disabled when URL is empty
    await expect(
      authenticatedPage.locator('[data-testid="analyze-button"]'),
    ).toBeDisabled();

    // Should remain on analyzer page (not navigated away)
    await expect(
      authenticatedPage.locator('[data-testid="brandstyle-analyzer"]'),
    ).toBeVisible();
  });

  test('URL input accepts valid URL', async ({ authenticatedPage }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    const urlInput = authenticatedPage.locator('[data-testid="url-input"]');
    await urlInput.fill('https://www.example.com');

    await expect(urlInput).toHaveValue('https://www.example.com');
  });

  test('shows extraction capabilities section', async ({
    authenticatedPage,
  }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    // Verify the extraction capabilities grid is visible (4 items)
    await expect(
      authenticatedPage.locator('[data-testid="extraction-capabilities"]'),
    ).toBeVisible();

    const capabilityItems = authenticatedPage.locator(
      '[data-testid="extraction-capabilities"] [data-testid="capability-item"]',
    );
    await expect(capabilityItems).toHaveCount(4);
  });

  test('shows how it works section', async ({ authenticatedPage }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    // Verify the "How It Works" section is visible
    await expect(
      authenticatedPage.locator('[data-testid="how-it-works"]'),
    ).toBeVisible();
  });

  test('shows processing state after URL submission', async ({
    authenticatedPage,
  }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    // Intercept the analyze URL endpoint to return a successful job
    await authenticatedPage.route('**/api/brandstyle/analyze/url', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobId: 'test-job-123', status: 'PROCESSING' }),
      }),
    );

    // Also intercept the polling status endpoint to keep it in processing
    await authenticatedPage.route(
      '**/api/brandstyle/analyze/status/**',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'test-job-123',
            status: 'PROCESSING',
            progress: 40,
            currentStep: 2,
            completedSteps: ['Connecting to website', 'Scanning pages'],
            totalSteps: 5,
          }),
        }),
    );

    // Fill in URL and submit
    await authenticatedPage
      .locator('[data-testid="url-input"]')
      .fill('https://www.example.com');
    await authenticatedPage
      .locator('[data-testid="analyze-button"]')
      .click();

    // Verify processing steps appear
    await expect(
      authenticatedPage.locator('[data-testid="processing-progress"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('handles invalid URL', async ({ authenticatedPage }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    // Type invalid text that is not a URL
    await authenticatedPage
      .locator('[data-testid="url-input"]')
      .fill('not-a-valid-url');
    await authenticatedPage
      .locator('[data-testid="analyze-button"]')
      .click();

    // Should show an error message for the invalid URL
    await expect(
      authenticatedPage.locator('[data-testid="error-message"]'),
    ).toBeVisible();

    // Should remain on analyzer page (not navigate to processing)
    await expect(
      authenticatedPage.locator('[data-testid="brandstyle-analyzer"]'),
    ).toBeVisible();
  });

  test('handles long URL', async ({ authenticatedPage }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    const urlInput = authenticatedPage.locator('[data-testid="url-input"]');

    // Generate a very long URL (500+ characters)
    const longPath = 'a'.repeat(500);
    const longUrl = `https://www.example.com/${longPath}`;

    await urlInput.fill(longUrl);

    // Verify the input handled the long URL
    await expect(urlInput).toHaveValue(longUrl);

    // Page should still be functional
    await expect(
      authenticatedPage.locator('[data-testid="analyze-button"]'),
    ).toBeVisible();
  });

  test('handles special characters in URL', async ({
    authenticatedPage,
  }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    const urlInput = authenticatedPage.locator('[data-testid="url-input"]');

    // Type a URL with unicode characters
    await urlInput.fill('https://www.example.com/p\u00e4th/\u00fcber?q=caf\u00e9');

    // Verify input accepted the value without crashing
    await expect(urlInput).toHaveValue(
      'https://www.example.com/p\u00e4th/\u00fcber?q=caf\u00e9',
    );

    // Page should still be functional
    await expect(
      authenticatedPage.locator('[data-testid="brandstyle-analyzer"]'),
    ).toBeVisible();
  });

  test('handles API error during analysis', async ({
    authenticatedPage,
  }) => {
    await interceptStyleguideAsDraft(authenticatedPage);
    await navigateTo(authenticatedPage, SECTIONS.brandstyle);

    // Intercept the analyze endpoint to return a 500 error
    await authenticatedPage.route('**/api/brandstyle/analyze/url', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      }),
    );

    await authenticatedPage
      .locator('[data-testid="url-input"]')
      .fill('https://www.example.com');
    await authenticatedPage
      .locator('[data-testid="analyze-button"]')
      .click();

    // Verify error message appears
    await expect(
      authenticatedPage.locator('[data-testid="error-message"]'),
    ).toBeVisible({ timeout: 10_000 });
  });
});
