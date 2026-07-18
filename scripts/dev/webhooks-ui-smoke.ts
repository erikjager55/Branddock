// Playwright-browser-smoke voor de Webhooks-sectie in Settings → API &
// Connectors (P3.3-restje). Bewijst de endpoint-lifecycle in de echte UI:
//   1. panel rendert onder de connector-instructies
//   2. endpoint aanmaken → signing-secret (whsec_…) eenmalig zichtbaar
//   3. na reload alleen nog de prefix — het geheim staat nergens in de DOM
//   4. delete met confirm → rij weg
// Ruimt aan het eind op via Prisma.
//
// Run (dev-server op 3005 moet draaien):
//   npx tsx --env-file=.env.local scripts/dev/webhooks-ui-smoke.ts

import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { prisma } from '../../src/lib/prisma';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3005';
const AUTH_ORIGIN = 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'erik@branddock.com';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Password123!';
const WORKSPACE_ID = process.env.SMOKE_WORKSPACE_ID ?? 'cmnomsobx009q44msn0gpw7vb';
const HOOK_URL = `https://example.com/hooks/ui-smoke-${Date.now()}`;

let pass = 0;
let fail = 0;

function ok(label: string, cond: boolean): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (cond) pass++;
  else fail++;
}

/** Zelfde sessie-patroon als api-keys-ui-smoke.ts. */
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

async function openApiKeysTab(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-section-id]').first().waitFor({ state: 'visible', timeout: 30_000 });

  const candidates = page.getByRole('button', { name: /^(settings|instellingen)$/i });
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    await candidates.nth(i).click().catch(() => {});
    if (await page.getByTestId('settings-subnav').isVisible().catch(() => false)) break;
  }
  await page.getByTestId('settings-subnav').waitFor({ state: 'visible', timeout: 10_000 });

  await page.getByTestId('settings-tab-api-keys').click();
  await page.getByTestId('webhook-url-input').waitFor({ state: 'visible', timeout: 10_000 });
}

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE });
  let endpointId = '';

  try {
    await signIn(ctx);
    const page = await ctx.newPage();
    page.on('dialog', (d) => void d.accept());

    // ── 1. Panel rendert ─────────────────────────────────────────────────
    console.log('1. Webhooks-panel');
    await openApiKeysTab(page);
    ok('webhooks-panel rendert (url-input zichtbaar)', true);
    ok('default-event deliverable.generated aangevinkt',
      await page.getByTestId('webhook-event-deliverable.generated').isChecked());

    // ── 2. Endpoint aanmaken → secret eenmalig zichtbaar ─────────────────
    console.log('\n2. Endpoint aanmaken');
    await page.getByTestId('webhook-url-input').fill(HOOK_URL);
    await page.getByTestId('webhook-event-fidelity.scored').check();
    await page.getByTestId('webhook-create').click();
    const secret = page.getByTestId('webhook-secret');
    await secret.waitFor({ state: 'visible', timeout: 15_000 });
    const fullSecret = (await secret.innerText()).trim();
    ok(`signing-secret zichtbaar en begint met whsec_ (${fullSecret.slice(0, 12)}…)`, fullSecret.startsWith('whsec_'));

    const row = page.locator('[data-testid^="webhook-row-"]').filter({ hasText: HOOK_URL }).first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    endpointId = (await row.getAttribute('data-testid'))?.replace('webhook-row-', '') ?? '';
    ok(`endpoint-rij in de lijst (id ${endpointId || '?'})`, endpointId.length > 0);
    const rowText = await row.innerText();
    ok('rij toont beide event-badges', rowText.includes('deliverable.generated') && rowText.includes('fidelity.scored'));

    // ── 3. Na reload alleen de prefix ────────────────────────────────────
    console.log('\n3. Reload → geheim weg, prefix blijft');
    await openApiKeysTab(page);
    ok('webhook-secret-blok niet meer aanwezig', (await page.getByTestId('webhook-secret').count()) === 0);
    const rowAfter = page.locator(`[data-testid="webhook-row-${endpointId}"]`);
    await rowAfter.waitFor({ state: 'visible', timeout: 10_000 });
    ok(`rij toont de prefix (${fullSecret.slice(0, 8)})`, (await rowAfter.innerText()).includes(fullSecret.slice(0, 8)));
    const pageContent = await page.content();
    ok('volledige secret staat nergens meer in de DOM', !pageContent.includes(fullSecret));

    // ── 4. Delete → rij weg ──────────────────────────────────────────────
    console.log('\n4. Delete');
    await page.getByTestId(`webhook-delete-${endpointId}`).click();
    await rowAfter.waitFor({ state: 'detached', timeout: 10_000 });
    ok('rij verdwenen na delete', true);
  } finally {
    await browser.close();
    const deleted = await prisma.webhookEndpoint.deleteMany({
      where: endpointId ? { id: endpointId } : { url: HOOK_URL, workspaceId: WORKSPACE_ID },
    });
    console.log(`\nOpruimen: ${deleted.count} endpoint(s) verwijderd via Prisma`);
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
