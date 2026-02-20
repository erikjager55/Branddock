import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Fill a form by mapping field names to values.
 * Looks for inputs/textareas by name, placeholder, or label.
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>,
) {
  for (const [field, value] of Object.entries(fields)) {
    const locator = page
      .locator(
        `input[name="${field}"], textarea[name="${field}"], [aria-label="${field}"]`,
      )
      .first();
    await locator.fill(value);
  }
}

/**
 * Submit a form by clicking the submit button.
 */
export async function submitForm(page: Page, buttonText?: string) {
  if (buttonText) {
    await page.getByRole('button', { name: buttonText }).click();
  } else {
    await page.locator('button[type="submit"]').click();
  }
}

/**
 * Assert that a validation error message is visible.
 */
export async function expectValidationError(
  page: Page,
  errorText: string,
) {
  await expect(page.getByText(errorText)).toBeVisible();
}

/**
 * Clear and type into a specific locator (useful for controlled inputs).
 */
export async function clearAndType(locator: Locator, value: string) {
  await locator.clear();
  await locator.fill(value);
}
