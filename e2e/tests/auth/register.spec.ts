import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="register-tab"]').click();
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
  });

  test('shows register form with name, email, and password fields', async ({ page }) => {
    await expect(page.locator('[data-testid="register-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
  });

  test('successful registration with new credentials', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@e2e-test.com`;

    await page.locator('[data-testid="register-name"]').fill('E2E Test User');
    await page.locator('[data-testid="register-email"]').fill(uniqueEmail);
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    // Should navigate to dashboard after registration
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
  });

  test('shows error for duplicate email (already registered)', async ({ page }) => {
    await page.locator('[data-testid="register-name"]').fill('Duplicate User');
    await page.locator('[data-testid="register-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({ timeout: 10_000 });
  });

  test('password validation — rejects short passwords (< 8 characters)', async ({ page }) => {
    await page.locator('[data-testid="register-name"]').fill('Short Pass User');
    await page.locator('[data-testid="register-email"]').fill('shortpass@test.com');
    await page.locator('[data-testid="register-password"]').fill('Short1!');
    await page.locator('[data-testid="register-submit"]').click();

    // Browser HTML5 validation or Better Auth should reject
    // The form has minLength={8}, so browser should prevent submit
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });

  test('name field is required', async ({ page }) => {
    await page.locator('[data-testid="register-email"]').fill('noname@test.com');
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    // Browser should prevent submit (required attribute)
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });

  test('email field is required', async ({ page }) => {
    await page.locator('[data-testid="register-name"]').fill('No Email');
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    // Browser should prevent submit
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });

  test('submit button is disabled while loading', async ({ page }) => {
    const uniqueEmail = `test-loading-${Date.now()}@e2e-test.com`;

    await page.locator('[data-testid="register-name"]').fill('Loading Test');
    await page.locator('[data-testid="register-email"]').fill(uniqueEmail);
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    await expect(page.locator('[data-testid="register-submit"]')).toBeDisabled();
  });

  test('loading spinner appears during registration', async ({ page }) => {
    const uniqueEmail = `test-spinner-${Date.now()}@e2e-test.com`;

    await page.locator('[data-testid="register-name"]').fill('Spinner Test');
    await page.locator('[data-testid="register-email"]').fill(uniqueEmail);
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    await expect(page.locator('[data-testid="register-submit"]')).toContainText('Bezig...');
  });

  test('special characters in name are accepted', async ({ page }) => {
    const uniqueEmail = `test-special-${Date.now()}@e2e-test.com`;

    await page.locator('[data-testid="register-name"]').fill('José García-López');
    await page.locator('[data-testid="register-email"]').fill(uniqueEmail);
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
  });

  test('invalid email format is rejected by browser validation', async ({ page }) => {
    await page.locator('[data-testid="register-name"]').fill('Bad Email');
    await page.locator('[data-testid="register-email"]').fill('not-an-email');
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();

    // Browser validation should prevent submit
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });
});
