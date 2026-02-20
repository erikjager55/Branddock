import { type Page, expect } from '@playwright/test';

/**
 * Assert that the page shell wrapper is visible.
 */
export async function expectPageShell(page: Page) {
  await expect(page.locator('[data-testid="page-shell"]')).toBeVisible();
}

/**
 * Assert the page header contains the expected title text.
 */
export async function expectPageHeader(page: Page, title: string) {
  await expect(
    page.locator('[data-testid="page-header"] h1'),
  ).toContainText(title);
}

/**
 * Collect console errors and assert none occurred.
 * Call this at the START of a test — it installs a listener that captures
 * errors for the lifetime of the page.
 */
export function expectNoErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return {
    /** Call at the end of the test to assert no console errors were captured. */
    verify() {
      expect(errors, 'Expected no console errors').toHaveLength(0);
    },
  };
}
