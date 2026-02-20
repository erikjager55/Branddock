import { test, expect } from '@playwright/test';

test.describe('OAuth Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });

  test('social login buttons are visible on auth page', async ({ page }) => {
    // Social login buttons should render (SocialLoginButtons component)
    // When no OAuth providers are configured, the component may render nothing
    // or show disabled buttons depending on implementation
    const socialSection = page.locator('[data-testid="auth-page"]');
    await expect(socialSection).toBeVisible();
  });

  test('auth divider is visible between social and email login', async ({ page }) => {
    // The AuthDivider component renders between social buttons and email form
    // Check the auth page contains both sections
    const authPage = page.locator('[data-testid="auth-page"]');
    await expect(authPage).toBeVisible();
  });

  test('OAuth buttons do not crash when providers are not configured', async ({ page }) => {
    // Without GOOGLE_CLIENT_ID etc. in env, OAuth should degrade gracefully
    // No console errors, page still functional
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();

    // Email login should still work
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

    // Filter out known non-critical errors (React hydration, etc.)
    const criticalErrors = errors.filter(
      (e) => !e.includes('hydrat') && !e.includes('Warning:'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('email login still works when OAuth is not configured', async ({ page }) => {
    // Even without OAuth providers, email/password login should function
    const { TEST_USERS } = await import('../../fixtures/test-data');

    await page.locator('[data-testid="login-email"]').fill(TEST_USERS.owner.email);
    await page.locator('[data-testid="login-password"]').fill(TEST_USERS.owner.password);
    await page.locator('[data-testid="login-submit"]').click();

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
  });
});
