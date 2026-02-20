import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Account Settings', () => {
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

  test('account settings page loads', async ({ page }) => {
    // Navigate via sidebar click
    await page.click(`[data-section-id="${SECTIONS.settingsAccount}"]`);

    // Settings page and account tab should be visible
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="account-tab"]')).toBeVisible({ timeout: 10_000 });
  });

  test('profile API returns user data', async ({ page }) => {
    const response = await page.request.get('/api/settings/profile');

    expect(response.status()).toBe(200);

    const data = await response.json();
    // API returns { profile: { ... } }
    const profile = data.profile ?? data;
    expect(profile).toHaveProperty('email');
    expect(profile).toHaveProperty('firstName');
  });

  test('update profile via API', async ({ page }) => {
    // First, get the current profile to preserve original values
    const getResponse = await page.request.get('/api/settings/profile');
    expect(getResponse.status()).toBe(200);
    const getBody = await getResponse.json();
    const originalProfile = getBody.profile ?? getBody;

    // Update profile with test values
    const updateResponse = await page.request.patch('/api/settings/profile', {
      data: {
        firstName: 'E2E',
        lastName: 'Test',
      },
    });

    expect(updateResponse.status()).toBe(200);

    // Verify the update was applied
    const verifyResponse = await page.request.get('/api/settings/profile');
    const verifyBody = await verifyResponse.json();
    const updatedProfile = verifyBody.profile ?? verifyBody;
    expect(updatedProfile.firstName).toBe('E2E');
    expect(updatedProfile.lastName).toBe('Test');

    // Restore original values
    await page.request.patch('/api/settings/profile', {
      data: {
        firstName: originalProfile.firstName,
        lastName: originalProfile.lastName,
      },
    });
  });

  test('change password requires current password', async ({ page }) => {
    const response = await page.request.post('/api/settings/password', {
      data: {
        currentPassword: 'wrong',
        newPassword: 'NewPass123!',
      },
    });

    // Should reject with 400 or 401 when current password is wrong
    expect([400, 401]).toContain(response.status());
  });

  test('email preferences API', async ({ page }) => {
    const response = await page.request.get('/api/settings/email-preferences');

    expect(response.status()).toBe(200);
  });

  test('danger zone section visible', async ({ page }) => {
    // Navigate to account settings
    await page.click(`[data-section-id="${SECTIONS.settingsAccount}"]`);
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });

    // Danger zone should be visible on the account tab
    await expect(page.locator('[data-testid="danger-zone"]')).toBeVisible({ timeout: 10_000 });
  });
});
