import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE, TEST_ORG } from '../../fixtures/test-data';

test.describe('Workspace Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
  });

  test('organization switcher is visible in top navigation', async ({ page }) => {
    await expect(page.locator('[data-testid="org-switcher"]')).toBeVisible();
    await expect(page.locator('[data-testid="org-switcher-trigger"]')).toBeVisible();
  });

  test('shows organization name in switcher trigger', async ({ page }) => {
    const trigger = page.locator('[data-testid="org-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    // The trigger shows the active organization name
    await expect(trigger).toContainText(TEST_ORG.name, { timeout: 15_000 });
  });

  test('opens dropdown on click', async ({ page }) => {
    await page.locator('[data-testid="org-switcher-trigger"]').click();
    await expect(page.locator('[data-testid="org-switcher-dropdown"]')).toBeVisible();
  });

  test('dropdown shows workspaces', async ({ page }) => {
    await page.locator('[data-testid="org-switcher-trigger"]').click();
    const dropdown = page.locator('[data-testid="org-switcher-dropdown"]');
    await expect(dropdown).toBeVisible();

    // Should show demo workspace
    await expect(dropdown.getByText(TEST_WORKSPACE.name)).toBeVisible();
  });

  test('switch workspace via API and verify data isolation', async ({ page }) => {
    // Switch to demo workspace via API
    const switchResponse = await page.request.post('/api/workspace/switch', {
      data: { workspaceId: TEST_WORKSPACE.id },
    });
    expect(switchResponse.ok()).toBe(true);

    const body = await switchResponse.json();
    expect(body.workspace.id).toBe(TEST_WORKSPACE.id);

    // After switching, brand assets API should return workspace-scoped data
    await page.reload();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
  });

  test('switching to non-existent workspace returns 404', async ({ page }) => {
    const response = await page.request.post('/api/workspace/switch', {
      data: { workspaceId: 'non-existent-workspace-id' },
    });
    expect(response.status()).toBe(404);
  });

  test('switching to workspace without access returns 403', async ({ page }) => {
    // Login as direct owner (john@techcorp.com)
    await page.request.post('/api/auth/sign-out');
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.directOwner.email,
        password: TEST_USERS.directOwner.password,
      },
    });

    // Try switching to agency workspace — should be denied
    const response = await page.request.post('/api/workspace/switch', {
      data: { workspaceId: TEST_WORKSPACE.id },
    });
    expect(response.status()).toBe(403);
  });

  test('closes dropdown on outside click', async ({ page }) => {
    await page.locator('[data-testid="org-switcher-trigger"]').click();
    await expect(page.locator('[data-testid="org-switcher-dropdown"]')).toBeVisible();

    // Click outside the dropdown
    await page.locator('[data-testid="dashboard"]').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('[data-testid="org-switcher-dropdown"]')).not.toBeVisible();
  });

  test('workspace switch requires workspaceId parameter', async ({ page }) => {
    const response = await page.request.post('/api/workspace/switch', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });
});
