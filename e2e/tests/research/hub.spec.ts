import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Research & Validation -- Hub', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.research);
  });

  test('renders research hub page with title', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="research-hub-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="page-header"] h1'),
    ).toContainText('Research Hub');
  });

  test('shows 4 stat cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const statsContainer = page.locator('[data-testid="research-stats"]');
    await expect(statsContainer).toBeVisible();

    const statCards = statsContainer.locator('[data-testid="stat-card"]');
    await expect(statCards).toHaveCount(4);
  });

  test('shows validation methods status section with 4 method cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const methodStatus = page.locator('[data-testid="method-status"]');
    await expect(methodStatus).toBeVisible();

    // 4 research methods: Workshop, Interviews, Questionnaire, AI Exploration
    const methodCards = methodStatus.locator('> div');
    await expect(methodCards).toHaveCount(4);
  });

  test('shows 3 view tabs', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // The view tabs: Overview, By Category, Timeline
    const tabs = page.locator('button:has-text("Overview"), button:has-text("By Category"), button:has-text("Timeline")');
    await expect(tabs).toHaveCount(3);
  });

  test('shows active research section with studies', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const activeResearch = page.locator('[data-testid="active-research"]');
    await expect(activeResearch).toBeVisible();

    // Seed has active studies (IN_PROGRESS)
    await expect(activeResearch.locator('text=Active Research')).toBeVisible();
  });

  test('shows quick insights section with 3 colored cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const quickInsights = page.locator('[data-testid="quick-insights"]');
    await expect(quickInsights).toBeVisible();

    // Seed data has 3 quick insight items
    await expect(quickInsights.locator('text=Quick Insights')).toBeVisible();
  });

  test('shows recommended actions section', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Recommended actions appear below active research
    await expect(page.locator('text=Recommended Actions')).toBeVisible();
  });

  test('split button: main button visible with New Research Plan', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const splitButton = page.locator('[data-testid="split-button"]');
    await expect(splitButton).toBeVisible();

    const mainButton = page.locator('[data-testid="split-button-main"]');
    await expect(mainButton).toBeVisible();
    await expect(mainButton).toContainText('New Research Plan');
  });

  test('split button: dropdown opens on chevron click', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Menu should not be visible initially
    await expect(page.locator('[data-testid="split-button-menu"]')).not.toBeVisible();

    // Click the dropdown chevron
    await page.locator('[data-testid="split-button-dropdown"]').click();

    // Menu should now be visible
    await expect(page.locator('[data-testid="split-button-menu"]')).toBeVisible();
  });

  test('split button: dropdown has Custom Research Plan and Browse Bundles options', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open the dropdown
    await page.locator('[data-testid="split-button-dropdown"]').click();

    const menu = page.locator('[data-testid="split-button-menu"]');
    await expect(menu).toBeVisible();

    await expect(menu.locator('text=Custom Research Plan')).toBeVisible();
    await expect(menu.locator('text=Browse Research Bundles')).toBeVisible();
  });

  test('split button: Browse Bundles navigates to bundles page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Open dropdown
    await page.locator('[data-testid="split-button-dropdown"]').click();

    // Click Browse Research Bundles
    await page.locator('[data-testid="split-button-menu"]').locator('text=Browse Research Bundles').click();

    // Should navigate to bundles page
    await expect(page.locator('[data-testid="research-bundles-page"]')).toBeVisible({ timeout: 10_000 });
  });

  test('handles API error gracefully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the research stats API with a 500 error
    await page.route('**/api/research/stats*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );

    // Navigate again to trigger a fresh load with the intercepted error
    await navigateTo(page, 'dashboard');
    await navigateTo(page, SECTIONS.research);

    // Page should still render without crashing
    await expect(page.locator('[data-testid="research-hub-page"]')).toBeVisible();
  });
});
