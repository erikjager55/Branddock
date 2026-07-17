// Playwright-browser-smoke voor de Settings → API & Connectors-tab (Fase E,
// tasks/public-brand-api.md). Bewijst de volledige key-UI-lifecycle:
//   1. tab bereikbaar via Settings-subnav
//   2. key aanmaken → volledige key (bd_live_…) eenmalig zichtbaar
//   3. na reload alleen nog de prefix — het geheim staat nergens meer in de DOM
//   4. revoke met confirm → rij gedimd + Revoked-badge
// Ruimt de aangemaakte key aan het eind op via Prisma.
//
// Run (dev-server op 3005 moet draaien):
//   npx tsx --env-file=.env.local scripts/dev/api-keys-ui-smoke.ts
// Env: SMOKE_BASE (default http://localhost:3005)
//      SMOKE_EMAIL / SMOKE_PASSWORD (default lokale smoke-account)
//      SMOKE_WORKSPACE_ID (default lokale "Better brands")

import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { prisma } from '../../src/lib/prisma';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3005';
const AUTH_ORIGIN = 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'erik@branddock.com';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Password123!';
const WORKSPACE_ID = process.env.SMOKE_WORKSPACE_ID ?? 'cmnomsobx009q44msn0gpw7vb';
const KEY_NAME = `ui-smoke-${Date.now()}`;

let pass = 0;
let fail = 0;

function ok(label: string, cond: boolean): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (cond) pass++;
  else fail++;
}

/** Sessie + actieve org via de auth-API (zelfde patroon als public-api-smoke.ts). */
async function signIn(ctx: BrowserContext): Promise<void> {
  const login = await ctx.request.post('/api/auth/sign-in/email', {
    headers: { origin: AUTH_ORIGIN },
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!login.ok()) throw new Error(`Login faalde: ${login.status()}`);

  const orgs = (await (await ctx.request.get('/api/auth/organization/list')).json()) as Array<{ id: string }>;
  if (!orgs[0]?.id) throw new Error('Geen organizations voor dit account');
  const setActive = await ctx.request.post('/api/auth/organization/set-active', {
    headers: { origin: AUTH_ORIGIN },
    data: { organizationId: orgs[0].id },
  });
  if (!setActive.ok()) throw new Error(`set-active faalde: ${setActive.status()}`);

  await ctx.addCookies([{ name: 'branddock-workspace-id', value: WORKSPACE_ID, url: BASE }]);
}

/** Navigeert (SPA) naar Settings → API & Connectors en wacht tot de tab geladen is. */
async function openApiKeysTab(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Hydratie: wacht tot de sidebar-navigatie rendert.
  await page.locator('[data-section-id]').first().waitFor({ state: 'visible', timeout: 30_000 });

  // Sidebar-knop "Settings"/"Instellingen" (geen data-testid; meerdere kandidaten mogelijk).
  const candidates = page.getByRole('button', { name: /^(settings|instellingen)$/i });
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    await candidates.nth(i).click().catch(() => {});
    if (await page.getByTestId('settings-subnav').isVisible().catch(() => false)) break;
  }
  await page.getByTestId('settings-subnav').waitFor({ state: 'visible', timeout: 10_000 });

  await page.getByTestId('settings-tab-api-keys').click();
  await page.getByTestId('api-key-name-input').waitFor({ state: 'visible', timeout: 10_000 });
}

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE });
  let keyId = '';

  try {
    await signIn(ctx);
    const page = await ctx.newPage();
    page.on('dialog', (d) => void d.accept());

    // ── 1. Tab bereikbaar ────────────────────────────────────────────────
    console.log('1. Settings → API & Connectors');
    await openApiKeysTab(page);
    ok('API & Connectors-tab rendert (naam-input zichtbaar)', true);

    // ── 2. Key aanmaken → volledige key eenmalig zichtbaar ───────────────
    console.log('\n2. Key aanmaken');
    await page.getByTestId('api-key-name-input').fill(KEY_NAME);
    await page.getByTestId('api-key-create').click();
    const secret = page.getByTestId('api-key-secret');
    await secret.waitFor({ state: 'visible', timeout: 15_000 });
    const fullKey = (await secret.innerText()).trim();
    ok(`volledige key zichtbaar en begint met bd_live_ (${fullKey.slice(0, 16)}…)`, fullKey.startsWith('bd_live_'));
    ok('key heeft verwachte lengte (56)', fullKey.length === 56);

    const row = page.locator('[data-testid^="api-key-row-"]').filter({ hasText: KEY_NAME }).first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    keyId = (await row.getAttribute('data-testid'))?.replace('api-key-row-', '') ?? '';
    ok(`nieuwe key-rij in de lijst (id ${keyId || '?'})`, keyId.length > 0);

    // ── 3. Na reload alleen de prefix ────────────────────────────────────
    console.log('\n3. Reload → geheim weg, prefix blijft');
    await openApiKeysTab(page);
    ok('key-secret-blok niet meer aanwezig', (await page.getByTestId('api-key-secret').count()) === 0);
    const rowAfter = page.locator(`[data-testid="api-key-row-${keyId}"]`);
    await rowAfter.waitFor({ state: 'visible', timeout: 10_000 });
    const rowText = await rowAfter.innerText();
    ok(`rij toont de prefix (${fullKey.slice(0, 16)})`, rowText.includes(fullKey.slice(0, 16)));
    const pageContent = await page.content();
    ok('volledige key staat nergens meer in de DOM', !pageContent.includes(fullKey));

    // ── 4. Revoke → gedimd + badge ───────────────────────────────────────
    console.log('\n4. Revoke');
    await page.getByTestId(`api-key-revoke-${keyId}`).click();
    await page
      .locator(`[data-testid="api-key-row-${keyId}"][data-revoked="true"]`)
      .waitFor({ state: 'visible', timeout: 10_000 });
    ok('rij gemarkeerd als revoked (data-revoked="true")', true);
    const rowClass = (await rowAfter.getAttribute('class')) ?? '';
    ok('rij is gedimd (opacity-60)', rowClass.includes('opacity-60'));
    ok('Revoked-badge zichtbaar', (await rowAfter.innerText()).toLowerCase().includes('revoked'));
    const revokeBtnDisabled = await page.getByTestId(`api-key-revoke-${keyId}`).isDisabled();
    ok('revoke-knop disabled na intrekken', revokeBtnDisabled);
  } finally {
    await browser.close();
    // ── Opruimen: verwijder de smoke-key uit de database ──────────────────
    const deleted = await prisma.apiKey.deleteMany({
      where: keyId ? { id: keyId } : { name: KEY_NAME, workspaceId: WORKSPACE_ID },
    });
    console.log(`\nOpruimen: ${deleted.count} key-rij(en) verwijderd via Prisma`);
    await prisma.$disconnect();
  }

  console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
