// F2-smoke: WorkspaceSwitchGuard cross-tab overlay (zombie-tab fix)
// Twee pages in één context (delen cookies + BroadcastChannel-origin):
//   A = canvas-tab die open blijft; B = tab die van workspace wisselt via de
//   echte OrganizationSwitcher-UI. Verwacht: blocking overlay in A.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const ZWARTHOUT = 'cmn8wsls0000snamsnaetnuny';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

// Login via API — zet Better Auth session-cookie op de context
const loginRes = await context.request.post(`${BASE}/api/auth/sign-in/email`, {
  data: { email: 'erik@branddock.com', password: 'Password123!' },
});
console.log('login:', loginRes.status());

const pageA = await context.newPage();
await pageA.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });
// Wacht tot de SPA-shell staat (org-switcher in de sidebar)
await pageA.waitForSelector('[data-testid="org-switcher"]', { timeout: 120_000 });
console.log('tab A geladen, overlay aanwezig?',
  await pageA.locator('text=Workspace gewijzigd in een ander tabblad').count());

const pageB = await context.newPage();
await pageB.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await pageB.waitForSelector('[data-testid="org-switcher-trigger"]', { timeout: 120_000 });

// Switch in tab B via de echte UI: dropdown open → klik Zwarthout
await pageB.click('[data-testid="org-switcher-trigger"]');
await pageB.waitForSelector(`[data-testid="workspace-item-${ZWARTHOUT}"]`, { timeout: 30_000 });
await pageB.click(`[data-testid="workspace-item-${ZWARTHOUT}"]`);
console.log('tab B: workspace-switch naar Zwarthout geklikt');

// Tab A moet nu de blocking overlay tonen
try {
  await pageA.waitForSelector('text=Workspace gewijzigd in een ander tabblad', { timeout: 15_000 });
  const naam = await pageA.locator('#workspace-switch-guard-title ~ p, [role="alertdialog"] p').first().textContent();
  console.log('PASS — overlay zichtbaar in tab A:', (naam ?? '').trim().slice(0, 80));
  await pageA.screenshot({ path: '/tmp/f2-overlay-tabA.png' });
  console.log('screenshot: /tmp/f2-overlay-tabA.png');
} catch {
  console.log('FAIL — geen overlay in tab A binnen 15s');
  await pageA.screenshot({ path: '/tmp/f2-FAIL-tabA.png' });
  process.exitCode = 1;
}

// Herlaad-knop werkt: klik → overlay weg na reload
if (process.exitCode !== 1) {
  await pageA.click('text=Herlaad dit tabblad');
  await pageA.waitForLoadState('domcontentloaded');
  await pageA.waitForSelector('[data-testid="org-switcher"]', { timeout: 120_000 });
  const after = await pageA.locator('text=Workspace gewijzigd in een ander tabblad').count();
  console.log(after === 0 ? 'PASS — overlay weg na herlaad' : 'FAIL — overlay blijft na herlaad');
  if (after !== 0) process.exitCode = 1;
}

await browser.close();
