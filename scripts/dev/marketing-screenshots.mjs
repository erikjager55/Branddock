// Marketing-screenshots (taak #9) — logt in op een lokale dev-server met het
// seed-account en schiet de product-screenshots voor de feature-pagina's.
// Run: node scripts/dev/marketing-screenshots.mjs  (dev-server op :3005 vereist)
import { chromium } from 'playwright';

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:3005';
const OUT = new URL('../../public/marketing/features', import.meta.url).pathname;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.setDefaultTimeout(60_000);
// Marketing-site is Engels — forceer de UI-taal vóór de app laadt.
await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
await ctx.addCookies([
  { name: 'branddock-ui-locale', value: 'en', domain: 'localhost', path: '/' },
  // Rijk gevulde workspace voor representatieve screenshots
  { name: 'branddock-workspace-id', value: 'cmnomsobx009q44msn0gpw7vb', domain: 'localhost', path: '/' },
]);

async function shoot(name) {
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

// ── Login (Better Auth, seed-account) ──
// dev-server: HMR houdt sockets open -> networkidle vuurt nooit
// dev-SSR streamt het document (suspense) -> domcontentloaded kan uitblijven;
// 'commit' vuurt op de eerste response, daarna vaste waits.
await page.goto(BASE, { waitUntil: 'commit', timeout: 60_000 });
// AuthGate toont een spinner tot de client-bundle + sessie er zijn; op een
// verse dev-server kan de eerste compile 1-2 min duren.
await page.waitForSelector('input[type="email"]', { timeout: 180_000 });
await page.waitForTimeout(4000);
if ((await page.locator('input[type="email"]').count()) > 0) {
  await page.fill('input[type="email"]', 'erik@branddock.com');
  await page.fill('input[type="password"]', 'Password123!');
  // twee 'Sign in'-teksten (tab + submit) — mik op de submit-knop
  await page.locator('button[type="submit"]').first().click();
  await page.getByText(/WERKRUIMTE|WORKSPACE/i).first().waitFor({ timeout: 120_000 });
  await page.waitForTimeout(3000);
}
console.log('na login:', page.url());

const targets = [
  { name: 'agents', labels: ['Agents'] },
  { name: 'brand-voice', labels: ['Brand Voice', 'Merkstem'] },
  { name: 'brand-alignment', labels: ['Brandstyle'] },
  { name: 'content-canvas', labels: ['Content'] },
];

for (const t of targets) {
  let done = false;
  for (const label of t.labels) {
    try {
      // Sidebar-items kunnen buttons óf links zijn — klik op zichtbare tekst.
      await page.getByText(label, { exact: true }).first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      await shoot(t.name);
      done = true;
      break;
    } catch {
      // probeer het volgende label
    }
  }
  if (!done) console.error(`  ✗ ${t.name}: geen sidebar-item gevonden (${t.labels.join('/')})`);
}

await browser.close();
console.log('klaar');
