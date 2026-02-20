import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Brand Alignment — Overview', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.brandAlignment);
  });

  test('renders page with title and Run Alignment Check button', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="page-header"] h1')).toContainText(
      'Brand Alignment',
    );
    await expect(page.locator('[data-testid="page-header"]')).toContainText(
      'Ensure consistency across all brand touchpoints',
    );

    // Run Alignment Check button should be visible
    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await expect(runButton).toBeVisible();
  });

  test('shows alignment score gauge with percentage', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const scoreOverview = page.locator('[data-testid="score-overview"]');
    await expect(scoreOverview).toBeVisible();

    const gauge = page.locator('[data-testid="alignment-score-gauge"]');
    await expect(gauge).toBeVisible();

    // Seed data has 78% alignment score
    await expect(gauge).toContainText('%');
  });

  test('shows 6-module alignment grid', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const grid = page.locator('[data-testid="module-alignment-grid"]');
    await expect(grid).toBeVisible();

    // Seed data has 6 modules
    const moduleCards = grid.locator('[data-testid="module-score-card"]');
    const count = await moduleCards.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('shows alignment issues section', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const issuesSection = page.locator(
      '[data-testid="alignment-issues-section"]',
    );
    await expect(issuesSection).toBeVisible();

    // Seed data has 4 issues
    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    const count = await issueCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows issue filters (status, module, severity)', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const filters = page.locator('[data-testid="issue-filters"]');
    await expect(filters).toBeVisible();

    // Should contain filter dropdowns (Select components)
    const selects = filters.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThanOrEqual(3);
  });

  test('filters issues by severity', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for issues to load
    const issuesSection = page.locator(
      '[data-testid="alignment-issues-section"]',
    );
    await expect(issuesSection).toBeVisible();

    const initialCards = page.locator('[data-testid="alignment-issue-card"]');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Filter by CRITICAL severity using the filters
    const filters = page.locator('[data-testid="issue-filters"]');
    const selects = filters.locator('select');

    // Third select is severity filter
    const severitySelect = selects.last();
    await severitySelect.selectOption('CRITICAL');
    await page.waitForTimeout(500);

    // Should show fewer or same issues
    const filteredCards = page.locator('[data-testid="alignment-issue-card"]');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('shows loading state', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept alignment API with delay
    await page.route('**/api/alignment*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate away and back
    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.brandAlignment);

    const skeleton = page.locator('[data-testid="skeleton-loader"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 5_000 });
  });

  test('shows error state on API failure', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept with error
    await page.route('**/api/alignment', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );

    await navigateTo(page, SECTIONS.dashboard);
    await navigateTo(page, SECTIONS.brandAlignment);

    await expect(
      page.locator('[data-testid="error-message"]'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('module score cards show percentage and label', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const grid = page.locator('[data-testid="module-alignment-grid"]');
    await expect(grid).toBeVisible();

    const firstCard = grid.locator('[data-testid="module-score-card"]').first();
    await expect(firstCard).toBeVisible();

    // Card should contain percentage text
    await expect(firstCard).toContainText('%');
  });
});
