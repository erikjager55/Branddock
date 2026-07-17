import { test, expect, type Page } from '@playwright/test';
import { TEST_USERS, TEST_ORG, TEST_WORKSPACE } from '../../fixtures/test-data';

/**
 * RBAC-403 runtime-smokes (security-residual-hardening, audit 2026-06-26).
 *
 * Bewijst de owner-guard-403's uit de #348-remediatie en de L4-viewer-guards
 * (PR #120) tegen échte auth-cookies + geseede rollen — bewust géén grep-test:
 *  - M1: alleen een owner mag een 'owner'-rol inviten (admin → 403)
 *  - M2: workspace-export is owner/admin-only (member + viewer → 403)
 *  - M3: claw/confirm is member+ (viewer → 403)
 *  - L4: workspace-config-PUTs zijn member+ (viewer → 403, member → 200)
 *
 * Bewust één test (= één login) per rol: de auth-brute-force-limiter in
 * src/proxy.ts staat 10 sign-ins/min/IP toe en de hele suite deelt localhost —
 * per-assert logins blazen dat budget op (zo faalt permissions.spec al
 * mid-suite met sessieloze 401's; pre-existing, zie task-file).
 */

async function login(page: Page, who: { email: string; password: string }) {
  await page.request.post('/api/auth/sign-in/email', {
    data: { email: who.email, password: who.password },
  });
  const switched = await page.request.post('/api/workspace/switch', {
    data: { workspaceId: TEST_WORKSPACE.id },
  });
  expect(switched.ok(), 'workspace-switch naar de demo-workspace moet slagen').toBe(true);
}

test.describe('RBAC 403 guards', () => {
  test('viewer gets 403 on export, claw/confirm and workspace-config (M2/M3/L4)', async ({ page }) => {
    await login(page, TEST_USERS.viewer);

    const exportRes = await page.request.get('/api/workspace/export');
    expect(exportRes.status(), 'M2: viewer export').toBe(403);

    const clawRes = await page.request.post('/api/claw/confirm', { data: {} });
    expect(clawRes.status(), 'M3: viewer claw/confirm').toBe(403);

    const anchorsRes = await page.request.put('/api/workspace/brand-style-anchors', {
      data: { anchorIds: [] },
    });
    expect(anchorsRes.status(), 'L4: viewer brand-style-anchors PUT').toBe(403);

    const overlayRes = await page.request.put('/api/workspace/hero-logo-overlay', {
      data: { enabled: false },
    });
    expect(overlayRes.status(), 'L4: viewer hero-logo-overlay PUT').toBe(403);
  });

  test('member gets 403 on export but CAN update member+ workspace-config (M2 + L4 boundary)', async ({ page }) => {
    await login(page, TEST_USERS.member);

    const exportRes = await page.request.get('/api/workspace/export');
    expect(exportRes.status(), 'M2: member export').toBe(403);

    const overlayRes = await page.request.put('/api/workspace/hero-logo-overlay', {
      data: { enabled: false },
    });
    expect(overlayRes.ok(), 'L4-boundary: member hero-logo-overlay PUT').toBe(true);
  });

  test('admin cannot invite an owner but CAN invite a member (M1)', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    const ownerInvite = await page.request.post('/api/organization/invite', {
      data: {
        email: `rbac-admin-owner-invite-${Date.now()}@e2e-test.com`,
        organizationId: TEST_ORG.id,
        role: 'owner',
      },
    });
    expect(ownerInvite.status(), 'M1: admin invites owner').toBe(403);

    const memberInvite = await page.request.post('/api/organization/invite', {
      data: {
        email: `rbac-admin-member-invite-${Date.now()}@e2e-test.com`,
        organizationId: TEST_ORG.id,
        role: 'member',
      },
    });
    expect(memberInvite.status(), 'M1-boundary: admin invites member').toBe(201);
  });

  test('owner sanity: guards do not block the legitimate role', async ({ page }) => {
    await login(page, TEST_USERS.owner);

    const exportRes = await page.request.get('/api/workspace/export');
    expect(exportRes.ok(), 'owner export').toBe(true);

    const anchorsRes = await page.request.put('/api/workspace/brand-style-anchors', {
      data: { anchorIds: [] },
    });
    expect(anchorsRes.ok(), 'owner brand-style-anchors PUT').toBe(true);
  });

  test('unauthenticated requests get 401', async ({ page }) => {
    await page.context().clearCookies();

    const exportRes = await page.request.get('/api/workspace/export');
    expect(exportRes.status(), 'unauth export').toBe(401);

    const clawRes = await page.request.post('/api/claw/confirm', { data: {} });
    expect(clawRes.status(), 'unauth claw/confirm').toBe(401);
  });
});
