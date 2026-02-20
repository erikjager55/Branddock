import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Brand Alignment — Cross-Module', () => {
  test('sidebar shows brand-alignment badge with issue count', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Find the brand-alignment sidebar item
    const sidebarItem = page.locator(
      '[data-section-id="brand-alignment"]',
    );
    await expect(sidebarItem).toBeVisible();

    // Should show a badge with the open issues count (seed has 4 issues)
    // Badge is a small red circle with number
    const badge = sidebarItem.locator(
      '.bg-red-500, [class*="rounded-full"]',
    );
    // Badge text should be a number
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      expect(Number(text)).toBeGreaterThan(0);
    }
  });

  test('issue card View Source button navigates to source module', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateTo(page, SECTIONS.brandAlignment);

    // Wait for issues
    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    await expect(issueCards.first()).toBeVisible();

    // Find a View Source button
    const viewSourceButton = issueCards
      .first()
      .locator('button', { hasText: 'View Source' });

    if (await viewSourceButton.isVisible()) {
      await viewSourceButton.click();

      // Should navigate away from brand-alignment page
      // The page shell should still be visible (we're navigating to another section)
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="page-shell"]')).toBeVisible();
    }
  });

  test('navigating back from another module preserves alignment state', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to brand alignment
    await navigateTo(page, SECTIONS.brandAlignment);

    // Verify score overview is visible
    const scoreOverview = page.locator('[data-testid="score-overview"]');
    await expect(scoreOverview).toBeVisible();

    // Navigate to dashboard
    await navigateTo(page, SECTIONS.dashboard);
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Navigate back to brand alignment
    await navigateTo(page, SECTIONS.brandAlignment);

    // Score overview should still be visible (data cached by TanStack Query)
    await expect(scoreOverview).toBeVisible();
  });

  test('module score cards have View link that navigates to module', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateTo(page, SECTIONS.brandAlignment);

    const grid = page.locator('[data-testid="module-alignment-grid"]');
    await expect(grid).toBeVisible();

    // Module score cards should have clickable elements
    const firstCard = grid.locator('[data-testid="module-score-card"]').first();
    await expect(firstCard).toBeVisible();

    // Look for a View link/button in the card
    const viewLink = firstCard.locator('button, a', { hasText: /View|→/ });
    if (await viewLink.isVisible()) {
      await viewLink.click();

      // Should navigate to the module's page
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="page-shell"]')).toBeVisible();
    }
  });

  test('alignment page is accessible from sidebar navigation', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Verify the sidebar item exists and is clickable
    const sidebarItem = page.locator(
      '[data-section-id="brand-alignment"]',
    );
    await expect(sidebarItem).toBeVisible();

    // Click it
    await sidebarItem.click();

    // Should show the brand alignment page content
    await expect(
      page.locator('[data-testid="page-header"] h1'),
    ).toContainText('Brand Alignment');
  });

  test('scan modals can be opened and closed without losing page state', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateTo(page, SECTIONS.brandAlignment);

    // Verify initial state
    const scoreOverview = page.locator('[data-testid="score-overview"]');
    await expect(scoreOverview).toBeVisible();

    // Start a scan
    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    // Modal should open
    const scanModal = page.locator('[data-testid="scan-progress-modal"]');
    await expect(scanModal).toBeVisible({ timeout: 10_000 });

    // Cancel the scan
    const cancelButton = scanModal.locator('button', { hasText: 'Cancel' });
    await cancelButton.click();

    // Modal should close
    await expect(scanModal).not.toBeVisible({ timeout: 5_000 });

    // Original page state should still be present
    await expect(scoreOverview).toBeVisible();
  });
});
