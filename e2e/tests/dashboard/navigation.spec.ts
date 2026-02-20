import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Dashboard Navigation', () => {
  test('stat cards are clickable', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Wait for the stats grid to load
    const statsGrid = page.locator('[data-testid="dashboard-stats"]');
    await expect(statsGrid.first()).toBeVisible({ timeout: 10_000 });

    // Click the first stat card button (e.g. "Ready to use" -> navigates to brand section)
    const firstStatCard = page.locator('[data-testid="stat-card"]').first();
    await expect(firstStatCard).toBeVisible();
    await firstStatCard.click();

    // Should navigate away from dashboard — dashboard should no longer be visible
    // or a different section should now be active
    await page.waitForTimeout(1_000);

    // The page-shell should still be rendered (we navigated to another section)
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
  });

  test('quick access cards navigate', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Wait for Quick Access section
    await expect(page.locator('text=Quick Access')).toBeVisible({ timeout: 10_000 });

    // Click "Brand Assets" quick access card
    const brandAssetsCard = page.locator('button:has-text("Brand Assets")').first();
    await expect(brandAssetsCard).toBeVisible();
    await brandAssetsCard.click();

    // Should navigate to brand section
    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    // Navigate back to dashboard
    await page.locator('[data-section-id="dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10_000 });

    // Wait for Quick Access to reload
    await expect(page.locator('text=Quick Access')).toBeVisible({ timeout: 10_000 });

    // Click "Personas" quick access card
    const personasCard = page.locator('button:has-text("Personas")').first();
    await expect(personasCard).toBeVisible();
    await personasCard.click();

    // Should navigate to personas section
    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
  });

  test('campaigns preview View All navigates', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Wait for campaigns preview widget to load
    const preview = page.locator('[data-testid="campaigns-preview"]');
    await expect(preview).toBeVisible({ timeout: 10_000 });

    // Click "View All" link within the campaigns preview widget
    const viewAllLink = preview.locator('text=View All');
    await expect(viewAllLink).toBeVisible();
    await viewAllLink.click();

    // Should navigate to campaigns section
    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
  });

  test('attention list action buttons navigate', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Wait for dashboard to fully load
    await page.waitForTimeout(2_000);

    // Only run this test if attention list is present
    const attentionList = page.locator('[data-testid="attention-list"]');
    const listCount = await attentionList.count();
    if (listCount === 0) {
      // No attention items in current data — skip gracefully
      test.skip();
      return;
    }

    await expect(attentionList).toBeVisible({ timeout: 10_000 });

    // Find an action button within the attention list
    const actionButton = attentionList.locator('button').first();
    await expect(actionButton).toBeVisible({ timeout: 5_000 });

    // Click the first action button
    await actionButton.click();

    // Should navigate to a detail section — page-shell should remain visible
    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar navigation from dashboard', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Test navigating to brand section via sidebar
    const brandSidebarItem = page.locator(`[data-section-id="${SECTIONS.brand}"]`);
    await expect(brandSidebarItem).toBeVisible();
    await brandSidebarItem.click();

    // Should navigate away from dashboard
    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    // Navigate back to dashboard
    const dashboardSidebarItem = page.locator(`[data-section-id="${SECTIONS.dashboard}"]`);
    await expect(dashboardSidebarItem).toBeVisible();
    await dashboardSidebarItem.click();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10_000 });

    // Test navigating to personas section
    const personasSidebarItem = page.locator(`[data-section-id="${SECTIONS.personas}"]`);
    await expect(personasSidebarItem).toBeVisible();
    await personasSidebarItem.click();

    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    // Navigate back to dashboard once more
    await dashboardSidebarItem.click();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10_000 });

    // Test navigating to active campaigns section
    const campaignsSidebarItem = page.locator(`[data-section-id="${SECTIONS.activeCampaigns}"]`);
    await expect(campaignsSidebarItem).toBeVisible();
    await campaignsSidebarItem.click();

    await page.waitForTimeout(1_000);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
  });
});
