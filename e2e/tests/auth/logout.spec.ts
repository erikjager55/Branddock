import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Logout', () => {
  test('logging out via API redirects to auth page', async ({ page }) => {
    // Login first
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    // Sign out by calling the Better Auth sign-out endpoint
    await page.request.post('/api/auth/sign-out');

    // Reload page — should show auth page
    await page.reload();
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible({ timeout: 15_000 });
  });

  test('session is fully cleared after logout', async ({ page }) => {
    // Login
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    // Logout
    await page.request.post('/api/auth/sign-out');
    await page.reload();
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible({ timeout: 15_000 });

    // Try accessing an API endpoint — should get 401
    const response = await page.request.get('/api/workspaces');
    expect(response.status()).toBe(401);
  });

  test('after logout, protected API routes return 401', async ({ page }) => {
    // Login
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });

    // Verify authenticated API works
    const authedResponse = await page.request.get('/api/workspaces');
    expect(authedResponse.ok()).toBe(true);

    // Logout
    await page.request.post('/api/auth/sign-out');

    // Verify APIs now return 401
    const unauthedResponse = await page.request.get('/api/workspaces');
    expect(unauthedResponse.status()).toBe(401);
  });

  test('session expired — page redirects to login', async ({ page }) => {
    // Login
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    // Simulate session expiry by clearing all cookies
    await page.context().clearCookies();

    // Reload — should show auth page (session gone)
    await page.reload();
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible({ timeout: 15_000 });
  });

  test('cannot access dashboard without session', async ({ page }) => {
    // Go to app without logging in
    await page.goto('/');

    // Should show auth page, not dashboard
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="dashboard"]')).not.toBeVisible();
  });
});
