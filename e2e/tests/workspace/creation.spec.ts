import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_ORG } from '../../fixtures/test-data';

test.describe('Workspace Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner (agency)
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.owner.email,
        password: TEST_USERS.owner.password,
      },
    });
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
  });

  test('new workspace button is visible in org switcher dropdown', async ({ page }) => {
    await page.locator('[data-testid="org-switcher-trigger"]').click();
    await expect(page.locator('[data-testid="org-switcher-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-workspace-button"]')).toBeVisible();
  });

  test('clicking new workspace shows input field', async ({ page }) => {
    await page.locator('[data-testid="org-switcher-trigger"]').click();
    await page.locator('[data-testid="new-workspace-button"]').click();
    await expect(page.locator('[data-testid="new-workspace-input"]')).toBeVisible();
  });

  test('create workspace via API', async ({ page }) => {
    const workspaceName = `E2E Test Workspace ${Date.now()}`;

    const response = await page.request.post('/api/workspaces', {
      data: { name: workspaceName },
    });
    expect(response.status()).toBe(201);

    const workspace = await response.json();
    expect(workspace.name).toBe(workspaceName);
    expect(workspace.slug).toBeTruthy();
    expect(workspace.id).toBeTruthy();
  });

  test('workspace name is required', async ({ page }) => {
    const response = await page.request.post('/api/workspaces', {
      data: {},
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('name');
  });

  test('duplicate workspace name returns 409', async ({ page }) => {
    const workspaceName = `Duplicate Test ${Date.now()}`;

    // Create first
    const first = await page.request.post('/api/workspaces', {
      data: { name: workspaceName },
    });
    expect(first.status()).toBe(201);

    // Create duplicate
    const second = await page.request.post('/api/workspaces', {
      data: { name: workspaceName },
    });
    expect(second.status()).toBe(409);
  });

  test('direct org users cannot create workspaces', async ({ page }) => {
    // Logout and login as direct owner
    await page.request.post('/api/auth/sign-out');
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.directOwner.email,
        password: TEST_USERS.directOwner.password,
      },
    });

    const response = await page.request.post('/api/workspaces', {
      data: { name: 'Should Fail' },
    });
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toContain('agencies');
  });

  test('member role cannot create workspaces', async ({ page }) => {
    // Logout and login as member
    await page.request.post('/api/auth/sign-out');
    await page.request.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USERS.member.email,
        password: TEST_USERS.member.password,
      },
    });

    const response = await page.request.post('/api/workspaces', {
      data: { name: 'Member Workspace' },
    });
    // Member role is not owner/admin — should be 403
    expect(response.status()).toBe(403);
  });

  test('invite member to organization via API', async ({ page }) => {
    const inviteEmail = `invited-${Date.now()}@e2e-test.com`;

    const response = await page.request.post('/api/organization/invite', {
      data: {
        email: inviteEmail,
        organizationId: TEST_ORG.id,
        role: 'member',
      },
    });
    expect(response.status()).toBe(201);

    const invite = await response.json();
    expect(invite.email).toBe(inviteEmail);
    expect(invite.role).toBe('member');
    expect(invite.status).toBe('pending');
  });

  test('cannot invite already-member email', async ({ page }) => {
    const response = await page.request.post('/api/organization/invite', {
      data: {
        email: TEST_USERS.member.email,
        organizationId: TEST_ORG.id,
        role: 'member',
      },
    });
    expect(response.status()).toBe(409);
  });

  test('list workspaces returns workspace data', async ({ page }) => {
    const response = await page.request.get('/api/workspaces');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.workspaces).toBeDefined();
    expect(Array.isArray(body.workspaces)).toBe(true);
    expect(body.workspaces.length).toBeGreaterThan(0);
  });
});
