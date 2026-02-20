import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { SECTIONS } from '../../fixtures/test-data';

/**
 * Navigate to the brandstyle-guide page.
 *
 * The guide page is not a direct sidebar item. When the seed data has a
 * COMPLETE styleguide, clicking the sidebar "brandstyle" item renders the
 * analyzer which immediately redirects to brandstyle-guide.
 */
async function navigateToStyleguide(page: import('@playwright/test').Page) {
  await page.click(`[data-section-id="${SECTIONS.brandstyle}"]`);
  // Wait for the guide page to appear after the auto-redirect
  await page.waitForSelector('[data-testid="brandstyle-guide"]', {
    timeout: 15_000,
  });
}

test.describe('Brandstyle Styleguide', () => {
  test('renders styleguide page', async ({ authenticatedPage }) => {
    await navigateToStyleguide(authenticatedPage);

    await expect(
      authenticatedPage.locator('[data-testid="brandstyle-guide"]'),
    ).toBeVisible();
  });

  test('shows 5 tabs', async ({ authenticatedPage }) => {
    await navigateToStyleguide(authenticatedPage);

    const tabsContainer = authenticatedPage.locator(
      '[data-testid="styleguide-tabs"]',
    );
    await expect(tabsContainer).toBeVisible();

    // Verify all 5 tab buttons are present
    await expect(
      authenticatedPage.locator('[data-testid="tab-logo"]'),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-testid="tab-colors"]'),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-testid="tab-typography"]'),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-testid="tab-tone_of_voice"]'),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-testid="tab-imagery"]'),
    ).toBeVisible();
  });

  test('Logo tab shows logo section', async ({ authenticatedPage }) => {
    await navigateToStyleguide(authenticatedPage);

    // Click Logo tab
    await authenticatedPage.locator('[data-testid="tab-logo"]').click();

    // Verify logo content is visible
    await expect(
      authenticatedPage.locator('[data-testid="logo-section"]'),
    ).toBeVisible();
  });

  test('Colors tab shows color swatches', async ({ authenticatedPage }) => {
    await navigateToStyleguide(authenticatedPage);

    // Click Colors tab
    await authenticatedPage.locator('[data-testid="tab-colors"]').click();

    // Verify color swatches are visible (seed data has 9 colors)
    await expect(
      authenticatedPage.locator('[data-testid="colors-section"]'),
    ).toBeVisible();

    const colorSwatches = authenticatedPage.locator(
      '[data-testid="color-swatch"]',
    );
    await expect(colorSwatches).toHaveCount(9);
  });

  test('opens color detail modal on swatch click', async ({
    authenticatedPage,
  }) => {
    await navigateToStyleguide(authenticatedPage);

    // Navigate to Colors tab
    await authenticatedPage.locator('[data-testid="tab-colors"]').click();

    // Wait for color swatches to be visible
    await expect(
      authenticatedPage.locator('[data-testid="colors-section"]'),
    ).toBeVisible();

    // Click the first color swatch
    await authenticatedPage
      .locator('[data-testid="color-swatch"]')
      .first()
      .click();

    // Verify color detail modal appears
    await expect(
      authenticatedPage.locator('[data-testid="color-detail-modal"]'),
    ).toBeVisible();
  });

  test('Typography tab shows font info', async ({ authenticatedPage }) => {
    await navigateToStyleguide(authenticatedPage);

    // Click Typography tab
    await authenticatedPage
      .locator('[data-testid="tab-typography"]')
      .click();

    // Verify typography section with font name is visible
    await expect(
      authenticatedPage.locator('[data-testid="typography-section"]'),
    ).toBeVisible();
  });

  test('Tone of Voice tab shows guidelines', async ({
    authenticatedPage,
  }) => {
    await navigateToStyleguide(authenticatedPage);

    // Click Tone of Voice tab
    await authenticatedPage
      .locator('[data-testid="tab-tone_of_voice"]')
      .click();

    // Verify tone of voice section is visible
    await expect(
      authenticatedPage.locator('[data-testid="tone-of-voice-section"]'),
    ).toBeVisible();
  });

  test('Imagery tab shows imagery guidelines', async ({
    authenticatedPage,
  }) => {
    await navigateToStyleguide(authenticatedPage);

    // Click Imagery tab
    await authenticatedPage.locator('[data-testid="tab-imagery"]').click();

    // Verify imagery section is visible
    await expect(
      authenticatedPage.locator('[data-testid="imagery-section"]'),
    ).toBeVisible();
  });

  test('styleguide tabs switch content', async ({ authenticatedPage }) => {
    await navigateToStyleguide(authenticatedPage);

    const tabIds = [
      'tab-logo',
      'tab-colors',
      'tab-typography',
      'tab-tone_of_voice',
      'tab-imagery',
    ] as const;

    const sectionIds = [
      'logo-section',
      'colors-section',
      'typography-section',
      'tone-of-voice-section',
      'imagery-section',
    ] as const;

    // Click through each tab and verify its corresponding content section
    for (let i = 0; i < tabIds.length; i++) {
      await authenticatedPage
        .locator(`[data-testid="${tabIds[i]}"]`)
        .click();

      // The active tab's section should be visible
      await expect(
        authenticatedPage.locator(`[data-testid="${sectionIds[i]}"]`),
      ).toBeVisible();

      // Other sections should not be visible
      for (let j = 0; j < sectionIds.length; j++) {
        if (j !== i) {
          await expect(
            authenticatedPage.locator(`[data-testid="${sectionIds[j]}"]`),
          ).not.toBeVisible();
        }
      }
    }
  });

  test('Save for AI banner is visible', async ({ authenticatedPage }) => {
    await navigateToStyleguide(authenticatedPage);

    // The AiContentBanner should appear in sections
    await expect(
      authenticatedPage.locator('[data-testid="ai-content-banner"]').first(),
    ).toBeVisible();
  });

  test('shows loading skeleton', async ({ authenticatedPage }) => {
    // Intercept the brandstyle API with a delayed response
    await authenticatedPage.route('**/api/brandstyle', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      // Delay the response to ensure skeleton appears
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ styleguide: null }),
      });
    });

    // Navigate to brandstyle — the analyzer page will show a loading skeleton
    // while the delayed API response is pending
    await authenticatedPage.click(
      `[data-section-id="${SECTIONS.brandstyle}"]`,
    );

    // Verify skeleton loader appears during loading
    await expect(
      authenticatedPage.locator('[data-testid="skeleton-loader"]'),
    ).toBeVisible();
  });

  test('handles API error', async ({ authenticatedPage }) => {
    // Intercept the brandstyle API to return a 500 error
    await authenticatedPage.route('**/api/brandstyle', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate to brandstyle — error handling will show an error message
    await authenticatedPage.click(
      `[data-section-id="${SECTIONS.brandstyle}"]`,
    );

    // Verify error handling is shown
    await expect(
      authenticatedPage.locator('[data-testid="error-message"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('handles empty styleguide gracefully', async ({
    authenticatedPage,
  }) => {
    // Intercept API to return empty styleguide data (no styleguide)
    await authenticatedPage.route('**/api/brandstyle', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          styleguide: null,
          colors: [],
          logo: null,
          typography: null,
          toneOfVoice: null,
          imagery: null,
        }),
      });
    });

    // Navigate to brandstyle — with null styleguide the analyzer page stays
    await authenticatedPage.click(
      `[data-section-id="${SECTIONS.brandstyle}"]`,
    );

    // Page should render without crashing (analyzer page remains since no styleguide)
    await expect(
      authenticatedPage.locator('[data-testid="brandstyle-analyzer"]'),
    ).toBeVisible({ timeout: 10_000 });
  });
});
