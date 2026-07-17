import { test, expect, type Page } from '@playwright/test';
import { TEST_USERS, TEST_ORG, TEST_WORKSPACE } from '../../fixtures/test-data';

// Een kale API-login heeft géén activeOrganizationId op de sessie (de echte
// client zet die na login via organization.setActive) — zonder deze stap
// geeft POST /api/workspaces 400 "No active organization" vóór de rol-check
// en levert GET /api/workspaces een lege lijst (pre-existing spec-gap,
// gevonden 2026-07-17 tijdens security-residual-hardening).
async function setActiveOrg(page: Page, organizationSlug: string) {
  const res = await page.request.post('/api/auth/organization/set-active', {
    data: { organizationSlug },
    // Better Auth CSRF-check eist een trusted Origin op state-changing
    // endpoints; page.request stuurt er zelf geen mee. 3001 = de e2e-baseURL
    // (BETTER_AUTH_URL van de webServer) en is daar trusted.
    headers: { origin: 'http://localhost:3001' },
  });
  const body = res.ok() ? '' : await res.text().catch(() => '');
  expect(
    res.ok(),
    `set-active(${organizationSlug}) moet slagen — ${res.status()} ${body.slice(0, 200)}`,
  ).toBe(true);
}

test.describe('Workspace Permissions', () => {
  test.describe('Owner role', () => {
    test.beforeEach(async ({ page }) => {
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.owner.email,
          password: TEST_USERS.owner.password,
        },
      });
      await setActiveOrg(page, 'branddock-agency');
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
      await setActiveOrg(page, 'branddock-agency');
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
      // Ná een sign-out enforce't Better Auth de Origin-check óók op de
      // volgende sign-in (residu-cookie); zonder header 403 → sessieloze 401.
      const authHeaders = { origin: 'http://localhost:3001' };

      // Login as owner (Branddock Agency)
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.owner.email,
          password: TEST_USERS.owner.password,
        },
        headers: authHeaders,
      });
      await setActiveOrg(page, 'branddock-agency');

      const agencyWs = await page.request.get('/api/workspaces');
      expect(agencyWs.ok()).toBe(true);
      const agencyBody = await agencyWs.json();
      expect(agencyBody.workspaces.length).toBeGreaterThan(0);

      // Logout and login as direct owner (TechCorp)
      await page.request.post('/api/auth/sign-out', { headers: authHeaders });
      await page.request.post('/api/auth/sign-in/email', {
        data: {
          email: TEST_USERS.directOwner.email,
          password: TEST_USERS.directOwner.password,
        },
        headers: authHeaders,
      });
      await setActiveOrg(page, 'techcorp');

      const directWs = await page.request.get('/api/workspaces');
      expect(directWs.ok()).toBe(true);
      const directBody = await directWs.json();
      expect(directBody.workspaces.length).toBeGreaterThan(0);

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
