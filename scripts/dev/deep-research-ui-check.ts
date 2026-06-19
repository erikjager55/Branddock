/**
 * Light Playwright render-check voor de Deep Research-UI tegen de live dev-server.
 * Verifieert dat de UI-shell rendert zonder runtime-crash: Knowledge Library laadt,
 * de entry-knop heet "Add Item", de modal heeft een "Deep Research"-tab, en de
 * topic-input rendert. (De volledige run is al via de HTTP-e2e bewezen.)
 *
 * Run: BASE=http://localhost:3001 WS=<workspaceId> \
 *   npx tsx --env-file=.env.local scripts/dev/deep-research-ui-check.ts
 */
import { chromium } from '@playwright/test';
import { prisma } from '../../src/lib/prisma';
import { makeSignature } from 'better-auth/crypto';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const WORKSPACE_ID = process.env.WS ?? 'cmn8wsls0000snamsnaetnuny';
const SHOTS = '/tmp/dr-ui';

let pass = 0, fail = 0;
const ok = (l: string, c: boolean) => { console.log(`  ${c ? 'PASS' : 'FAIL'} ${l}`); c ? pass++ : fail++; };

async function main(): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET ontbreekt');
  const ws = await prisma.workspace.findUnique({ where: { id: WORKSPACE_ID }, select: { organizationId: true } });
  if (!ws) throw new Error('workspace niet gevonden');
  const members = await prisma.organizationMember.findMany({ where: { organizationId: ws.organizationId }, select: { userId: true } });
  const sess = await prisma.session.findFirst({ where: { userId: { in: members.map((m) => m.userId) }, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: 'desc' }, select: { token: true } });
  if (!sess) throw new Error('geen sessie');
  const signed = `${sess.token}.${await makeSignature(sess.token, secret)}`;
  await prisma.$disconnect();

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE });
  await ctx.addCookies([
    { name: 'better-auth.session_token', value: signed, domain: 'localhost', path: '/' },
    { name: 'branddock-workspace-id', value: WORKSPACE_ID, domain: 'localhost', path: '/' },
  ]);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500); // SPA-hydratie
  await page.screenshot({ path: `${SHOTS}-1-landing.png`, fullPage: false });

  // Navigeer naar Knowledge Library (SPA-nav). Probeer meerdere labels.
  let onLibrary = false;
  for (const rx of [/knowledge library/i, /knowledge/i, /\blibrary\b/i, /research hub/i]) {
    const nav = page.getByRole('button', { name: rx }).or(page.getByRole('link', { name: rx })).first();
    if (await nav.count().catch(() => 0)) {
      try { await nav.click({ timeout: 2000 }); await page.waitForTimeout(1500); onLibrary = true; break; } catch { /* try next */ }
    }
  }
  // Fallback: directe nav via querystring als de app dat ondersteunt.
  if (!onLibrary) { await page.goto('/?section=knowledge', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500); }

  const addBtn = page.getByTestId('add-resource-button');
  const addVisible = await addBtn.isVisible().catch(() => false);
  ok('"Add Item"-knop zichtbaar (Knowledge Library bereikt)', addVisible);
  if (addVisible) {
    const label = (await addBtn.innerText().catch(() => '')).trim();
    ok(`entry-knop heet "Add Item" (was "${label}")`, /add item/i.test(label));
  }
  await page.screenshot({ path: `${SHOTS}-2-library.png`, fullPage: false });

  if (addVisible) {
    await addBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}-3-modal.png`, fullPage: false });
    const drTab = page.getByRole('button', { name: /deep research/i }).first();
    const drVisible = await drTab.isVisible().catch(() => false);
    ok('"Deep Research"-tab zichtbaar in de modal', drVisible);
    if (drVisible) {
      await drTab.click();
      await page.waitForTimeout(800);
      const topicInput = page.getByTestId('deep-research-topic-input');
      ok('topic-input rendert in de Deep Research-tab', await topicInput.isVisible().catch(() => false));
      const startBtn = page.getByTestId('start-research-button');
      ok('"Start research"-knop rendert', await startBtn.isVisible().catch(() => false));
      await page.screenshot({ path: `${SHOTS}-4-deep-research-tab.png`, fullPage: false });
    }
  }

  ok(`geen client-side pageerror (${errors.length})`, errors.length === 0);
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log(`    ERR: ${e}`));

  await browser.close();
  console.log(`\nScreenshots: ${SHOTS}-1..4.png`);
  console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
