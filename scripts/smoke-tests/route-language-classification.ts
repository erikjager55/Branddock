/**
 * Smoke-test — elke route in `src/app` is BEWUST ingedeeld voor `<html lang>`.
 *
 * Waarom deze bestaat. `DUTCH_PUBLIC_PREFIXES` is een handmatige lijst. Wie
 * `src/app/handleiding/page.tsx` bouwt, ziet nergens dat die lijst bestaat — en
 * de nieuwe Nederlandse pagina valt stil terug op de UI-taalcookie. Voor elke
 * bezoeker zónder cookie, dus per definitie iedereen die binnenkomt, levert dat
 * `<html lang="en">` op Nederlandse tekst. Dat is exact de bug van #335, en de
 * bestaande bewaking vangt hem niet: die toetst de REGELS (`document-lang`) en
 * het RESULTAAT op bestaande routes (`document-lang-browser`), maar allebei
 * gaan ze uit van de routes die iemand al bedacht heeft.
 *
 * Het verschil dat deze bewaker maakt: hij leest de bestandsboom in plaats van
 * een lijst. Faalt bij VERGETEN, niet alleen bij toevoegen. Dezelfde vorm als
 * `i18n-namespace-reachability.ts`.
 *
 * Een nieuwe route toevoegen maakt hem dus rood. Dat is de bedoeling: de fix is
 * één regel — zet 'm in de juiste lijst, of in `APP_SHELL_ROUTES` hieronder als
 * hij de UI-taal hoort te volgen.
 *
 * Geen DB, geen sleutels, geen netwerk.
 *
 * Run: npm run smoke:route-language
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  BILINGUAL_QUERY_ROUTES,
  DUTCH_PUBLIC_PREFIXES,
  ENGLISH_PUBLIC_PREFIXES,
  matchPublishedPagePath,
  matchesPrefix,
} from '../../src/lib/ui-i18n/document-locale.shared';

const APP_DIR = join(process.cwd(), 'src', 'app');

/**
 * Routes die BEWUST de UI-taal volgen: de app-shell achter de auth-gate en zijn
 * subroutes. Ze gebruiken de i18next-runtime, dus de cookie is daar de juiste
 * bron.
 *
 * ⚠️ Een route hier neerzetten is een UITSPRAAK, geen formaliteit: "deze pagina
 * is meertalig en volgt de gebruikersvoorkeur". Klopt dat niet — is de pagina
 * hardgecodeerd Nederlands of Engels — dan hoort hij in
 * `DUTCH_PUBLIC_PREFIXES` respectievelijk `ENGLISH_PUBLIC_PREFIXES`.
 */
const APP_SHELL_ROUTES = [
  '/', // src/app/page.tsx — de SPA-shell (App.tsx switch)
  '/settings', // instellingen draaien binnen de shell
] as const;

/** Routes die de taal uit een gepubliceerde landingspagina halen. */
const PUBLISHED_PAGE_SAMPLE = '/p/workspace/slug';

let pass = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
}

/**
 * Leidt de URL-paden af uit de bestandsboom. Route-groepen `(naam)` vallen weg
 * uit het pad; dynamische segmenten `[x]` worden een placeholder, want voor de
 * taalindeling telt de vorm, niet de waarde.
 */
function routesFromTree(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'api') continue; // API-routes sturen geen HTML
      const segment = entry.startsWith('(') && entry.endsWith(')') ? '' : `/${entry}`;
      out.push(...routesFromTree(full, prefix + segment));
    } else if (entry === 'page.tsx') {
      out.push(prefix === '' ? '/' : prefix);
    }
  }
  return out;
}

/** Welke regel claimt dit pad? `null` = niemand, en dat is de bevinding. */
function classify(route: string): string | null {
  if (matchPublishedPagePath(route.replace(/\[[^\]]+\]/g, 'x'))) return 'gepubliceerde pagina';
  if (DUTCH_PUBLIC_PREFIXES.some((p) => matchesPrefix(route, p))) return 'NL publiek';
  if (ENGLISH_PUBLIC_PREFIXES.some((p) => matchesPrefix(route, p))) return 'EN publiek';
  if (BILINGUAL_QUERY_ROUTES.some((p) => matchesPrefix(route, p))) return 'tweetalig via ?lang';
  if (APP_SHELL_ROUTES.some((p) => matchesPrefix(route, p))) return 'app-shell (UI-taal)';
  return null;
}

console.log('\n── Elke route in src/app is bewust ingedeeld ──\n');

const routes = routesFromTree(APP_DIR).sort();
assert('de bestandsboom levert routes op', routes.length > 0, `${routes.length} gevonden`);

const ongeclassificeerd: string[] = [];
for (const route of routes) {
  const rule = classify(route);
  if (rule) {
    console.log(`  ✓ ${route.padEnd(44)} → ${rule}`);
    pass++;
  } else {
    ongeclassificeerd.push(route);
  }
}

if (ongeclassificeerd.length > 0) {
  console.error('\n✗ Deze routes horen bij GEEN ENKELE taalregel:\n');
  for (const route of ongeclassificeerd) {
    console.error(`    ${route}`);
  }
  console.error(
    '\n  Ze vallen daardoor terug op de UI-taalcookie. Voor een bezoeker zonder\n' +
      '  cookie — iedereen die binnenkomt — betekent dat lang="en".\n\n' +
      '  Kies er één van:\n' +
      '    - hardgecodeerd Nederlands → DUTCH_PUBLIC_PREFIXES\n' +
      '    - hardgecodeerd Engels     → ENGLISH_PUBLIC_PREFIXES\n' +
      '    - meertalig via i18next    → APP_SHELL_ROUTES in deze bewaker\n' +
      '  (allemaal in src/lib/ui-i18n/document-locale.shared.ts, op één na)\n',
  );
  failures.push(`${ongeclassificeerd.length} ongeclassificeerde route(s)`);
}

console.log('\n── De lijsten zelf wijzen nergens naar het niets ──\n');

/**
 * Andersom óók toetsen: een prefix in de lijst die naar geen enkele route meer
 * wijst, is dode regel — precies de vorm die deze week elders een bewaker stil
 * liet verrotten. Route-groepen maken een letterlijke mapcheck onbetrouwbaar,
 * dus dit vergelijkt tegen de afgeleide routes.
 */
for (const prefix of [...DUTCH_PUBLIC_PREFIXES, ...ENGLISH_PUBLIC_PREFIXES]) {
  assert(
    `${prefix} dekt minstens één bestaande route`,
    routes.some((r) => matchesPrefix(r, prefix)),
    'geen enkele page.tsx valt onder deze prefix — dode regel?',
  );
}
for (const route of BILINGUAL_QUERY_ROUTES) {
  assert(
    `${route} bestaat nog als pagina`,
    routes.includes(route),
    'de tweetalige route is verplaatst of verwijderd',
  );
}
assert(
  'de gepubliceerde-pagina-regel matcht nog de /p-vorm',
  matchPublishedPagePath(PUBLISHED_PAGE_SAMPLE) !== null,
);

console.log(
  failures.length === 0
    ? `\n✓ route-language-classification: ${pass} checks groen (${routes.length} routes)\n`
    : `\n✗ route-language-classification: ${failures.length} fout van ${pass + failures.length}\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
