import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, SECTIONS } from '../../fixtures/test-data';

test.describe('Team Management', () => {
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

  test('team tab loads', async ({ page }) => {
    // Navigate via sidebar click to team settings
    await page.click(`[data-section-id="${SECTIONS.settingsTeam}"]`);

    // Settings page and team tab should be visible
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="team-tab"]')).toBeVisible({ timeout: 10_000 });
  });

  test('team members API returns members', async ({ page }) => {
    const response = await page.request.get('/api/organization/members');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('members');
    expect(Array.isArray(data.members)).toBe(true);
  });

  test('invite member via API', async ({ page }) => {
    const response = await page.request.post('/api/organization/invite', {
      data: {
        email: `e2e-test-invite-${Date.now()}@example.com`,
        organizationId: 'demo-org-branddock-001',
        role: 'member',
      },
    });

    // Should succeed with 201, or handle duplicate gracefully (409)
    expect([201, 409]).toContain(response.status());
  });

  test('invite requires email', async ({ page }) => {
    const response = await page.request.post('/api/organization/invite', {
      data: {
        email: '',
        organizationId: 'demo-org-branddock-001',
        role: 'member',
      },
    });

    // Should reject with 400 when email is empty
    expect(response.status()).toBe(400);
  });

  test('member roles include owner', async ({ page }) => {
    const response = await page.request.get('/api/organization/members');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data.members)).toBe(true);

    // At least one member should have the "owner" role
    const hasOwner = data.members.some(
      (member: { role: string }) => member.role === 'owner'
    );
    expect(hasOwner).toBe(true);
  });
});
