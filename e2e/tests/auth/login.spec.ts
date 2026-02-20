import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows auth page when not logged in', async ({ page }) => {
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('login tab is active by default', async ({ page }) => {
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-form"]')).not.toBeVisible();
  });

  test('successful login with valid credentials', async ({ page }) => {
    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-password"]').fill(TEST_USERS.owner.password);
    await page.locator('[data-testid="login-submit"]').click();

    // Should navigate to dashboard after login
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="auth-page"]')).not.toBeVisible();
  });

  test('shows error for invalid password', async ({ page }) => {
    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-password"]').fill('WrongPassword123!');
    await page.locator('[data-testid="login-submit"]').click();

    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({ timeout: 10_000 });
  });

  test('shows error for non-existent email', async ({ page }) => {
    await page.locator('[data-testid="login-email"]').fill('nonexistent@example.com');
    await page.locator('[data-testid="login-password"]').fill('SomePassword123!');
    await page.locator('[data-testid="login-submit"]').click();

    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({ timeout: 10_000 });
  });

  test('submit button is disabled while loading', async ({ page }) => {
    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-password"]').fill(TEST_USERS.owner.password);
    await page.locator('[data-testid="login-submit"]').click();

    // Button should be disabled during request
    await expect(page.locator('[data-testid="login-submit"]')).toBeDisabled();
  });

  test('email field is required', async ({ page }) => {
    await page.locator('[data-testid="login-password"]').fill('SomePassword123!');
    await page.locator('[data-testid="login-submit"]').click();

    // Form should not submit — auth page should still be visible
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });

  test('password field is required', async ({ page }) => {
    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-submit"]').click();

    // Form should not submit — auth page should still be visible
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });

  test('session persistence — remains logged in after page reload', async ({ page }) => {
    // Login
    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-password"]').fill(TEST_USERS.owner.password);
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    // Reload the page
    await page.reload();

    // Should still be on dashboard, not auth page
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="auth-page"]')).not.toBeVisible();
  });

  test('can switch between login and register tabs', async ({ page }) => {
    // Start on login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

    // Switch to register
    await page.locator('[data-testid="register-tab"]').click();
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-form"]')).not.toBeVisible();

    // Switch back to login
    await page.locator('[data-testid="login-tab"]').click();
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-form"]')).not.toBeVisible();
  });

  test('switching tabs clears error message', async ({ page }) => {
    // Trigger an error
    await page.locator('[data-testid="login-email"]').fill('wrong@example.com');
    await page.locator('[data-testid="login-password"]').fill('WrongPassword!');
    await page.locator('[data-testid="login-submit"]').click();
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({ timeout: 10_000 });

    // Switch to register — error should disappear
    await page.locator('[data-testid="register-tab"]').click();
    await expect(page.locator('[data-testid="auth-error"]')).not.toBeVisible();
  });

  test('special characters in email field are accepted', async ({ page }) => {
    await page.locator('[data-testid="login-email"]').fill('user+tag@example.com');
    await page.locator('[data-testid="login-password"]').fill('SomePassword123!');
    await page.locator('[data-testid="login-submit"]').click();

    // Should get auth error (user doesn't exist), not a crash
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({ timeout: 10_000 });
  });

  test('loading spinner appears during login', async ({ page }) => {
    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-password"]').fill(TEST_USERS.owner.password);
    await page.locator('[data-testid="login-submit"]').click();

    // Should show "Bezig..." text during loading
    await expect(page.locator('[data-testid="login-submit"]')).toContainText('Bezig...');
  });
});
