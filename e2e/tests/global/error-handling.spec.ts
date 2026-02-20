import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Login via API
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });

    // Navigate to app and wait for dashboard
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });
  });

  test('non-existent API endpoint returns 404', async ({ page }) => {
    const response = await page.request.get('/api/nonexistent-endpoint');
    expect(response.status()).toBe(404);
  });

  test('invalid brand asset ID returns error', async ({ page }) => {
    const response = await page.request.get('/api/brand-assets/nonexistent-id-12345');
    expect([404, 400, 500]).toContain(response.status());
  });

  test('invalid persona ID returns error', async ({ page }) => {
    const response = await page.request.get('/api/personas/nonexistent-id-12345');
    expect([404, 400, 500]).toContain(response.status());
  });

  test('unauthorized access without session returns 401', async ({ page }) => {
    // Create a new context without auth cookies
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();

    // Use workspaces endpoint which requires actual auth (no env var fallback)
    const response = await newPage.request.get('http://localhost:3000/api/workspaces');
    expect([401, 403]).toContain(response.status());

    await newContext.close();
  });

  test('malformed API request returns 400', async ({ page }) => {
    const response = await page.request.post('/api/brand-assets', {
      data: {},  // Missing required fields
    });
    expect([400, 422, 500]).toContain(response.status());
  });
});
