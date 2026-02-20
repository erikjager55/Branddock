import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';

test.describe('Dashboard Overview', () => {
  test('renders dashboard after login', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // authenticatedPage fixture already waits for dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Page header should show "Dashboard"
    const heading = page.locator('h1');
    await expect(heading.first()).toContainText('Dashboard');
  });

  test('shows decision readiness section', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Wait for dashboard content to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Decision Readiness section should be visible
    const readinessSection = page.locator('text=Decision Readiness');
    await expect(readinessSection).toBeVisible({ timeout: 10_000 });

    // Should show a percentage number (e.g. "23%" or "100%")
    const percentageText = page.locator('[data-testid="readiness-percentage"]');
    await expect(percentageText.first()).toBeVisible({ timeout: 10_000 });

    // Should have a progress bar (the colored div inside the gray track)
    const progressTrack = page.locator('[data-testid="readiness-progress-bar"]');
    await expect(progressTrack.first()).toBeVisible();
  });

  test('shows 5 stat cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Wait for stats to load — look for the stats grid
    const statsGrid = page.locator('[data-testid="dashboard-stats"]');
    await expect(statsGrid.first()).toBeVisible({ timeout: 10_000 });

    // Verify the 5 expected stat card labels are present
    const expectedLabels = [
      'Ready to use',
      'Need attention',
      'In progress',
      'Active campaigns',
      'Content created',
    ];

    for (const label of expectedLabels) {
      await expect(page.locator(`[data-testid="dashboard"] >> text="${label}"`)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('shows attention list', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // The attention list header text
    const attentionHeader = page.locator('text=What Needs Your Attention');
    await expect(attentionHeader).toBeVisible({ timeout: 10_000 });
  });

  test('shows recommended action', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Recommended action has an "AI RECOMMENDED" badge
    const recommendedBadge = page.locator('text=AI RECOMMENDED');
    await expect(recommendedBadge).toBeVisible({ timeout: 10_000 });

    // Should have an action button
    const actionButton = page.locator('[data-testid="recommended-action-button"]').first();
    await expect(actionButton).toBeVisible();
  });

  test('shows quick access cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Quick Access section header
    const quickAccessHeader = page.locator('text=Quick Access');
    await expect(quickAccessHeader).toBeVisible({ timeout: 10_000 });

    // Should show the 3 quick access items
    const expectedItems = ['Brand Assets', 'Personas', 'Research Hub'];
    for (const item of expectedItems) {
      await expect(page.locator(`[data-testid="dashboard"] >> text="${item}"`)).toBeVisible();
    }
  });

  test('shows active campaigns preview', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Wait for campaigns preview widget to render
    const preview = page.locator('[data-testid="campaigns-preview"]');
    await expect(preview).toBeVisible({ timeout: 10_000 });

    // Should show "View All" link within the preview widget
    await expect(preview.locator('text=View All')).toBeVisible();

    // Should show "Start New Campaign" button within the preview widget
    await expect(preview.locator('text=Start New Campaign')).toBeVisible();
  });

  test('handles loading state', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Navigate away and back to trigger a fresh render
    await page.locator('[data-section-id="brand"]').click();
    await page.waitForTimeout(500);

    // Navigate back to dashboard — skeleton loaders should appear briefly
    await page.locator('[data-section-id="dashboard"]').click();

    // Dashboard should eventually be visible again
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10_000 });

    // After loading, the decision readiness section should render
    await expect(page.locator('text=Decision Readiness')).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state for attention list when no items', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept the attention API to return empty array
    await page.route('**/api/dashboard/attention*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Full reload to clear TanStack Query cache and use intercepted API
    await page.reload();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    // Wait for dashboard content to fully render
    await page.waitForTimeout(3_000);

    // The attention list component returns null when data is empty,
    // so the attention-list testid container should not be in the DOM
    const attentionList = page.locator('[data-testid="attention-list"]');
    await expect(attentionList).toHaveCount(0);
  });

  test('handles API error gracefully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Intercept ALL dashboard API calls and return 500
    await page.route('**/api/dashboard**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate away and back to trigger fresh data fetch with error
    await page.locator('[data-section-id="brand"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-section-id="dashboard"]').click();

    // Page should not crash — dashboard container should still be visible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10_000 });

    // The page should still render without crashing
    // (individual sections handle loading/error states gracefully)
    const heading = page.locator('h1');
    await expect(heading.first()).toContainText('Dashboard');
  });
});
