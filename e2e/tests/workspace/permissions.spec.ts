import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_ORG, TEST_WORKSPACE } from '../../fixtures/test-data';

test.describe('Workspace Permissions', () => {
  test.describe('Owner role', () => {
    test.beforeEach(async ({ page }) => {
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.owner.email,
          password: TEST_USERS.owner.password,
        },
      });
    });

    test('owner can list organization members', async ({ page }) => {
      const response = await page.request.get('/api/organization/members');
      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(body.members).toBeDefined();
      expect(body.myRole).toBe('owner');
      expect(body.members.length).toBeGreaterThanOrEqual(1);
    });

    test('owner can see pending invitations', async ({ page }) => {
      const response = await page.request.get('/api/organization/members');
      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(body.invitations).toBeDefined();
      // Owner should have access to invitations list
      expect(Array.isArray(body.invitations)).toBe(true);
    });

    test('owner can invite members', async ({ page }) => {
      const inviteEmail = `perm-owner-invite-${Date.now()}@e2e-test.com`;

      const response = await page.request.post('/api/organization/invite', {
        data: {
          email: inviteEmail,
          organizationId: TEST_ORG.id,
          role: 'member',
        },
      });
      expect(response.status()).toBe(201);
    });

    test('owner can create workspaces (agency)', async ({ page }) => {
      const response = await page.request.post('/api/workspaces', {
        data: { name: `Owner WS ${Date.now()}` },
      });
      expect(response.status()).toBe(201);
    });

    test('owner can switch to any workspace in their org', async ({ page }) => {
      const response = await page.request.post('/api/workspace/switch', {
        data: { workspaceId: TEST_WORKSPACE.id },
      });
      expect(response.ok()).toBe(true);
    });

    test('owner can access brand assets API', async ({ page }) => {
      await page.request.post('/api/workspace/switch', {
        data: { workspaceId: TEST_WORKSPACE.id },
      });

      const response = await page.request.get('/api/brand-assets');
      expect(response.ok()).toBe(true);
    });
  });

  test.describe('Member role', () => {
    test.beforeEach(async ({ page }) => {
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.member.email,
          password: TEST_USERS.member.password,
        },
      });
    });

    test('member can list organization members', async ({ page }) => {
      const response = await page.request.get('/api/organization/members');
      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(body.members).toBeDefined();
      expect(body.myRole).toBe('member');
    });

    test('member cannot see pending invitations', async ({ page }) => {
      const response = await page.request.get('/api/organization/members');
      expect(response.ok()).toBe(true);

      const body = await response.json();
      // Member role doesn't have access to invitations
      expect(body.invitations).toHaveLength(0);
    });

    test('member cannot invite other members', async ({ page }) => {
      const response = await page.request.post('/api/organization/invite', {
        data: {
          email: `member-invite-${Date.now()}@e2e-test.com`,
          organizationId: TEST_ORG.id,
          role: 'member',
        },
      });
      expect(response.status()).toBe(403);
    });

    test('member cannot create workspaces', async ({ page }) => {
      const response = await page.request.post('/api/workspaces', {
        data: { name: 'Member Workspace' },
      });
      expect(response.status()).toBe(403);
    });

    test('member can access dashboard after login', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Cross-organization isolation', () => {
    test('user from org A cannot access org B workspace', async ({ page }) => {
      // Login as direct owner (TechCorp)
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.directOwner.email,
          password: TEST_USERS.directOwner.password,
        },
      });

      // Try to switch to agency workspace
      const response = await page.request.post('/api/workspace/switch', {
        data: { workspaceId: TEST_WORKSPACE.id },
      });
      expect(response.status()).toBe(403);
    });

    test('user from org A cannot invite to org B', async ({ page }) => {
      // Login as direct owner (TechCorp)
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.directOwner.email,
          password: TEST_USERS.directOwner.password,
        },
      });

      const response = await page.request.post('/api/organization/invite', {
        data: {
          email: 'cross-org@test.com',
          organizationId: TEST_ORG.id,
          role: 'member',
        },
      });
      expect(response.status()).toBe(403);
    });

    test('each org has its own workspaces', async ({ page }) => {
      // Login as owner (Branddock Agency)
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.owner.email,
          password: TEST_USERS.owner.password,
        },
      });

      const agencyWs = await page.request.get('/api/workspaces');
      const agencyBody = await agencyWs.json();

      // Logout and login as direct owner (TechCorp)
      await page.request.post('/api/auth/sign-out');
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.directOwner.email,
          password: TEST_USERS.directOwner.password,
        },
      });

      const directWs = await page.request.get('/api/workspaces');
      const directBody = await directWs.json();

      // Workspace IDs should not overlap
      const agencyIds = agencyBody.workspaces.map((w: { id: string }) => w.id);
      const directIds = directBody.workspaces.map((w: { id: string }) => w.id);

      for (const id of directIds) {
        expect(agencyIds).not.toContain(id);
      }
    });
  });

  test.describe('Unauthenticated access', () => {
    test('unauthenticated request to workspaces returns 401', async ({ page }) => {
      // No login — clear any existing cookies
      await page.context().clearCookies();

      const response = await page.request.get('/api/workspaces');
      expect(response.status()).toBe(401);
    });

    test('unauthenticated request to members returns 401', async ({ page }) => {
      await page.context().clearCookies();

      const response = await page.request.get('/api/organization/members');
      expect(response.status()).toBe(401);
    });

    test('unauthenticated request to invite returns 401', async ({ page }) => {
      await page.context().clearCookies();

      const response = await page.request.post('/api/organization/invite', {
        data: {
          email: 'test@example.com',
          organizationId: TEST_ORG.id,
          role: 'member',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('unauthenticated request to switch workspace returns 401', async ({ page }) => {
      await page.context().clearCookies();

      const response = await page.request.post('/api/workspace/switch', {
        data: { workspaceId: TEST_WORKSPACE.id },
      });
      expect(response.status()).toBe(401);
    });
  });
});
