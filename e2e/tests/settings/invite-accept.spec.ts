import { test, expect, type APIRequestContext } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE } from '../../fixtures/test-data';

/**
 * Uitnodigings-accept-flow (`/invite/accept`).
 *
 * Deze pagina bestond tot 2026-07-22 niet, waardoor élke uitnodigingsmail op
 * een 404 eindigde. De takken hieronder waren daarna alleen handmatig
 * gesmoked; dit is het vangnet.
 *
 * Bewust NIET gedekt (zouden de seed-DB permanent muteren en de suite
 * niet-idempotent maken): het echte accepteren, dat een `OrganizationMember`
 * aanmaakt, en de verlopen-tak, die een `expiresAt` in het verleden vereist.
 * Beide zijn met een echte browser-smoke geverifieerd — zie
 * `tasks/done/invite-flow-fixes.md`.
 *
 * Origin-header op elke auth-POST: Better Auth's CSRF-check weigert
 * `page.request`-calls zonder Origin (gotcha 2026-07-17).
 */

const ORIGIN = 'http://localhost:3001';

async function signInAsOwner(request: APIRequestContext) {
  const res = await request.post('/api/auth/sign-in/email', {
    headers: { origin: ORIGIN },
    data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
  });
  expect(res.ok()).toBeTruthy();
}

/** Maakt een pending uitnodiging en geeft de rauwe response terug. */
function createInvite(
  request: APIRequestContext,
  email: string,
  workspaceIds: string[] = [],
) {
  return request.post('/api/organization/invite', {
    headers: { origin: ORIGIN },
    data: {
      // Zelfde seed-org als de bestaande team-spec.
      organizationId: 'demo-org-branddock-001',
      email,
      role: 'member',
      workspaceIds,
    },
  });
}

test.describe('Invite accept page', () => {
  test('unknown token shows an error screen, not a 404', async ({ page }) => {
    const response = await page.goto('/invite/accept?token=does-not-exist&lang=en');

    // De pagina moet bestaan — dit was de kernbug.
    expect(response?.status()).toBe(200);
    await expect(page.locator('[data-testid="invite-error"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-testid="invite-error"]')).toContainText('not valid');
  });

  test('missing token shows an error screen', async ({ page }) => {
    await page.goto('/invite/accept?lang=en');
    await expect(page.locator('[data-testid="invite-error"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('valid token while logged out renders the sign-up form with the email locked', async ({
    page,
  }) => {
    await signInAsOwner(page.request);
    const invited = `e2e-invite-${Date.now()}@example.com`;
    const created = await createInvite(page.request, invited);
    expect(created.ok(), `invite creation failed: ${created.status()}`).toBeTruthy();
    const { invitation } = await created.json();

    // Uitloggen: de genodigde is per definitie een andere (of geen) gebruiker.
    await page.request.post('/api/auth/sign-out', { headers: { origin: ORIGIN } });

    await page.goto(`/invite/accept?token=${invitation.token}&lang=en`);
    // (opruimen gebeurt onderaan, ná opnieuw inloggen — een DELETE zonder
    // sessie 401't en zou de uitnodiging in de seed-DB laten staan)
    await expect(page.locator('[data-testid="invite-auth-form"]')).toBeVisible({
      timeout: 15_000,
    });

    const emailField = page.locator('input[type="email"]');
    await expect(emailField).toHaveValue(invited);
    await expect(emailField).toHaveAttribute('readonly', '');

    // Het token hoort niet in de adresbalk te blijven staan (analytics-lek).
    expect(page.url()).not.toContain('token=');

    await signInAsOwner(page.request);
    await page.request.delete(`/api/settings/team/invites/${invitation.id}`, {
      headers: { origin: ORIGIN },
    });
  });

  test('a logged-in user opening someone else’s invitation gets the mismatch screen', async ({
    page,
  }) => {
    await signInAsOwner(page.request);
    const created = await createInvite(page.request, `e2e-other-${Date.now()}@example.com`);
    expect(created.ok(), `invite creation failed: ${created.status()}`).toBeTruthy();
    const { invitation } = await created.json();

    await page.goto(`/invite/accept?token=${invitation.token}&lang=en`);
    await expect(page.locator('[data-testid="invite-error"]')).toContainText(
      'different email address',
      { timeout: 15_000 },
    );
    // De enige uitweg moet aanwezig zijn.
    await expect(page.locator('[data-testid="invite-error"] button')).toBeVisible();

    await page.request.delete(`/api/settings/team/invites/${invitation.id}`, {
      headers: { origin: ORIGIN },
    });
  });

  test('a withdrawn invitation says withdrawn, not "already used"', async ({ page }) => {
    await signInAsOwner(page.request);
    const created = await createInvite(page.request, `e2e-cancel-${Date.now()}@example.com`);
    expect(created.ok(), `invite creation failed: ${created.status()}`).toBeTruthy();
    const { invitation } = await created.json();

    const cancelled = await page.request.delete(
      `/api/settings/team/invites/${invitation.id}`,
      { headers: { origin: ORIGIN } },
    );
    expect(cancelled.ok()).toBeTruthy();

    await page.request.post('/api/auth/sign-out', { headers: { origin: ORIGIN } });
    await page.goto(`/invite/accept?token=${invitation.token}&lang=en`);
    await expect(page.locator('[data-testid="invite-error"]')).toContainText('withdrawn', {
      timeout: 15_000,
    });
  });

  test('accept API names the workspace for a single-workspace invitation', async ({
    page,
  }) => {
    await signInAsOwner(page.request);
    const created = await createInvite(
      page.request,
      `e2e-scoped-${Date.now()}@example.com`,
      [TEST_WORKSPACE.id],
    );
    expect(created.ok(), `invite creation failed: ${created.status()}`).toBeTruthy();
    const { invitation } = await created.json();

    await page.request.post('/api/auth/sign-out', { headers: { origin: ORIGIN } });

    const res = await page.request.post('/api/organization/invite/accept', {
      headers: { origin: ORIGIN },
      data: { token: invitation.token },
    });
    expect(res.status()).toBe(401);

    const body = await res.json();
    expect(body.requiresAuth).toBe(true);
    // Kernregel: één workspace → workspace-naam, niet de organisatie.
    expect(body.targetName).toBe(TEST_WORKSPACE.name);

    await signInAsOwner(page.request);
    await page.request.delete(`/api/settings/team/invites/${invitation.id}`, {
      headers: { origin: ORIGIN },
    });
  });
});
