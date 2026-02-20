import { type Page, expect } from '@playwright/test';

/**
 * Navigate to a section by clicking the sidebar item.
 */
export async function navigateTo(page: Page, sectionId: string) {
  await page.click(`[data-section-id="${sectionId}"]`);
  await waitForSection(page);
}

/**
 * Wait for the page shell to be visible (content rendered).
 */
export async function waitForSection(page: Page) {
  await page.waitForSelector('[data-testid="page-shell"]', {
    timeout: 10_000,
  });
}

/**
 * Click a sidebar item by its data-section-id attribute.
 */
export async function clickSidebar(page: Page, sectionId: string) {
  const button = page.locator(`[data-section-id="${sectionId}"]`);
  await expect(button).toBeVisible();
  await button.click();
}
