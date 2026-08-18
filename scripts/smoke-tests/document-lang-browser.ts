/**
 * document-lang-browser — toetst `<html lang>` op de server EN in een echte
 * browser, ná hydratie en ná client-side navigatie.
 *
 * Waarom dit náást `smoke:document-lang` bestaat: die gate is puur en dekt de
 * regels. Drie regressies uit de reviewrondes van 2026-08-18 waren daarmee niet
 * te vinden, want ze zaten in de bedrading of de runtime.
 *
 * Het draait in TWEE fases, en die volgorde is essentieel:
 *
 *  - **Fase 1 — rauwe server-HTML**, zonder browser. Dekt de keten
 *    `src/proxy.ts` (`x-pathname`) → root layout → `<html lang>`.
 *    ⚠️ Zonder deze fase is het script blind voor precies die helft. Haal de
 *    regel `requestHeaders.set('x-pathname', …)` weg en de server levert weer
 *    `lang="en"` — maar `DocumentLangSync` repareert de DOM ná hydratie, dus
 *    een browsercheck meldt OK terwijl crawlers en schermlezers, die dat effect
 *    nooit draaien, het foute attribuut krijgen. Dat is in review letterlijk zo
 *    gemeten: één regel weg, alle gates groen.
 *
 *  - **Fase 2 — ná hydratie in een echte browser**, inclusief client-side
 *    navigatie tussen route-groepen. Dekt `DocumentLangSync`.
 *
 * ⚠️ Wat dit script per constructie NIET kan dekken: de apex-rewrite. Op
 * `branddock.app/` is `/` de Nederlandse marketing-homepage, op localhost is het
 * een app-route. Die regel staat daarom in de pure gate
 * (`resolveClientLangDecision`-checks met echte hostnamen).
 *
 * Vereist een DRAAIENDE productieserver (`npm run build && npx next start`) en
 * de lokale database met minstens één gepubliceerde landingspagina.
 *
 * Draaien:
 *   BASE_URL=http://localhost:3000 LP_PATH=/p/<ws>/<slug> LP_LANG=nl-NL \
 *     node node_modules/.bin/tsx scripts/smoke-tests/document-lang-browser.ts
 */

import { chromium, type Browser } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const LP_PATH = process.env.LP_PATH ?? '';
const LP_LANG = process.env.LP_LANG ?? 'nl-NL';

interface Scenario {
  label: string;
  path: string;
  navigateTo?: string;
  cookie: string | null;
  expect: string;
  why: string;
}

const scenarios: Scenario[] = [
  { label: 'laad /marketing/pricing', path: '/marketing/pricing', cookie: null, expect: 'nl', why: 'marketing is NL, bezoeker heeft geen cookie' },
  { label: 'laad /marketing/pricing (cookie en)', path: '/marketing/pricing', cookie: 'en', expect: 'nl', why: 'paginataal wint van UI-voorkeur' },
  { label: 'laad /brandmd (cookie en)', path: '/brandmd', cookie: 'en', expect: 'nl', why: 'brand.md-funnel is NL' },
  { label: 'laad / (geen cookie)', path: '/', cookie: null, expect: 'en', why: 'app-route volgt de cookie (default en)' },
  { label: 'laad / (cookie nl)', path: '/', cookie: 'nl', expect: 'nl', why: 'app-route volgt de cookie' },
  // De vier hieronder vingen de regressie van reviewronde 1.
  { label: 'nav /marketing/pricing -> /', path: '/marketing/pricing', navigateTo: '/', cookie: 'en', expect: 'en', why: 'terug naar de UI-taal bij een client-side navigatie' },
  { label: 'nav /marketing/pricing -> / (cookie nl)', path: '/marketing/pricing', navigateTo: '/', cookie: 'nl', expect: 'nl', why: 'idem, met NL-voorkeur' },
  { label: 'nav / -> /marketing/pricing', path: '/', navigateTo: '/marketing/pricing', cookie: 'en', expect: 'nl', why: 'app -> marketing moet naar NL' },
  { label: 'nav / -> /brandmd', path: '/', navigateTo: '/brandmd', cookie: 'en', expect: 'nl', why: 'app -> brand.md moet naar NL' },
];

if (!LP_PATH) {
  console.warn(
    'LET OP: LP_PATH niet gezet — het klantpagina-scenario wordt OVERGESLAGEN.\n' +
      '  Dat is de enige tak die de DB-lookup dekt. Draai met:\n' +
      '  LP_PATH=/p/<workspace>/<slug> LP_LANG=<verwachte locale>\n',
  );
} else {
  scenarios.push({
    label: `laad ${LP_PATH}`,
    path: LP_PATH,
    cookie: 'en',
    expect: LP_LANG,
    why: 'LandingPage.locale wint van de bezoekersvoorkeur',
  });
}

/** Fase 1: leest `<html lang>` uit de rauwe serverrespons, zonder browser. */
async function checkServerHtml(s: Scenario): Promise<boolean> {
  const res = await fetch(BASE + s.path, {
    headers: s.cookie ? { cookie: `branddock-ui-locale=${s.cookie}` } : {},
    redirect: 'follow',
  });
  const html = await res.text();
  const got = /<html[^>]*\slang="([^"]*)"/.exec(html)?.[1] ?? '(geen lang-attribuut)';
  const ok = got === s.expect;
  console.log(
    `${ok ? 'OK  ' : 'FOUT'} [server] ${s.label.padEnd(42)} -> lang="${got}" (verwacht "${s.expect}")`,
  );
  return ok;
}

/** Fase 2: leest het attribuut ná hydratie, eventueel ná een client-navigatie. */
async function checkAfterHydration(browser: Browser, s: Scenario): Promise<boolean> {
  const ctx = await browser.newContext();
  if (s.cookie) {
    await ctx.addCookies([{ name: 'branddock-ui-locale', value: s.cookie, url: BASE }]);
  }
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
    if (s.navigateTo) {
      await page.waitForTimeout(1500);
      // Next patcht `history.pushState`; die aanroep werkt `usePathname()` bij
      // zonder page load. Bewust GEEN extra klik of popstate-dispatch: een klik
      // kan op een echte link landen (dan wordt het een volledige page load, die
      // niets over de client-sync bewijst), en `new PopStateEvent('popstate')`
      // heeft `state === null` waarop Next' handler direct returnt.
      await page.evaluate((to) => {
        window.history.pushState({}, '', to);
      }, s.navigateTo);
    }
    await page.waitForTimeout(2500); // ruim ná hydratie + LocaleReconciler
    const got = await page.evaluate(() => document.documentElement.lang);
    const ok = got === s.expect;
    console.log(
      `${ok ? 'OK  ' : 'FOUT'} [browser] ${s.label.padEnd(42)} -> lang="${got}" (verwacht "${s.expect}") — ${s.why}`,
    );
    return ok;
  } finally {
    await ctx.close();
  }
}

async function main(): Promise<void> {
  const reachable = await fetch(`${BASE}/marketing/pricing`).then((r) => r.ok).catch(() => false);
  if (!reachable) {
    console.error(`✗ Geen server op ${BASE}. Start er een met \`npx next start\` (productiebuild).`);
    process.exit(1);
  }

  let failed = 0;
  let checks = 0;

  // Fase 1 alleen voor scenario's zónder client-navigatie: bij die laatste is
  // de serverrespons per definitie die van het STARTpad, niet van het doel.
  console.log('— fase 1: rauwe server-HTML (dekt proxy → root layout) —');
  for (const s of scenarios.filter((x) => !x.navigateTo)) {
    checks++;
    if (!(await checkServerHtml(s))) failed++;
  }

  console.log('\n— fase 2: ná hydratie in een echte browser —');
  const browser = await chromium.launch();
  try {
    for (const s of scenarios) {
      checks++;
      if (!(await checkAfterHydration(browser, s))) failed++;
    }
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n✗ document-lang-browser: ${failed} van ${checks} checks fout`);
    process.exit(1);
  }
  console.log(`\n✓ document-lang-browser: ${checks} checks correct (${scenarios.length} scenario's)`);
}

void main();
