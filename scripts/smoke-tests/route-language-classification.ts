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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  BILINGUAL_QUERY_ROUTES,
  DUTCH_PUBLIC_PREFIXES,
  ENGLISH_PUBLIC_PREFIXES,
  decideDocumentLang,
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
  // Ook hier de resolver vragen in plaats van de lijsten in volgorde aflopen:
  // `/brandmd/claim` ligt onder `/brandmd` en zou anders als "NL publiek" worden
  // gelabeld terwijl hij 'en' krijgt — een uitvoer die zichzelf tegenspreekt.
  const hardgecodeerd =
    DUTCH_PUBLIC_PREFIXES.some((p) => matchesPrefix(route, p)) ||
    ENGLISH_PUBLIC_PREFIXES.some((p) => matchesPrefix(route, p));
  if (hardgecodeerd) {
    return `${decideDocumentLang(route, 'en', null).toUpperCase()} publiek`;
  }
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

console.log('\n── Klopt de indeling met de tekst op de pagina? ──\n');

/**
 * De check hierboven toetst DÁT een route is ingedeeld. Dat is niet hetzelfde
 * als of de indeling klópt. Een parallelle sessie vond het gat: `/brandmd/claim/
 * [token]` is volledig Engels ("Your brand is already here.", "Claimed. Your
 * workspace is ready.") maar erft `lang="nl"` van de `/brandmd`-prefix. Precies
 * het spiegelbeeld dat `ENGLISH_PUBLIC_PREFIXES` voor `/oauth` oplost — alleen
 * één niveau dieper dan de prefix, dus buiten het bereik van een prefix-lijst.
 *
 * Deze steekproef telt stopwoorden in de JSX-tekst van het page-bestand zelf en
 * vergelijkt dat met de gedeclareerde taal.
 *
 * ⚠️ Alleen voor routes met een HARDGECODEERDE taal. App-shell-routes gebruiken
 * i18next (de tekst staat in vertaalbestanden), gepubliceerde pagina's halen hun
 * taal uit de database, en de tweetalige route wisselt per query. Daar zegt een
 * stopwoordtelling niets.
 *
 * ⚠️ En "geen tekst gevonden" is GEEN goedkeuring. Een page-bestand dat zijn
 * tekst uit componenten haalt levert nul woorden op; dat wordt hieronder als
 * `onbepaald` gemeld en niet als groen weggeschreven.
 */
const NL_WOORDEN = /\b(de|het|een|jouw|jij|wordt|zijn|voor|met|naar|onze|deze|niet|ook)\b/gi;
const EN_WOORDEN = /\b(the|your|is|are|we|you|for|with|our|this|not|also|from)\b/gi;

/** Haalt zichtbare JSX-tekst uit een bestand: `>tekst<`, zonder expressies. */
function zichtbareTekst(bestand: string): string {
  const src = readFileSync(bestand, 'utf8');
  return (src.match(/>[^<>{}]{8,}</g) ?? []).join(' ');
}

/**
 * De bestanden die een page.tsx uit zijn EIGEN map importeert, één niveau diep.
 *
 * Waarom dit bestaat: `/brandmd` en `/marketing/changelog` gaven "onbepaald — te
 * weinig tekst", want hun page.tsx is een dunne wrapper en alle zichtbare tekst
 * zit in een client-component ernaast (`generator-client.tsx`). Een taalregressie
 * daar was voor deze bewaker onzichtbaar, en `/brandmd` is de e-mailpoort van de
 * funnel — gemeld door een parallelle sessie die dat blok met de HAND moest
 * vertalen en meten omdat deze bewaker het niet zag (2026-08-21).
 *
 * ⚠️ BEWUST BEGRENSD: alleen relatieve imports, alleen één niveau, alleen
 * bestanden die naast het page-bestand staan. Geen boomwandeling — die zou
 * gedeelde componenten meetellen en dan meet je de taal van de hele codebase in
 * plaats van die van deze route. Blijft een route na dit niveau onbepaald, dan
 * blijft dat "onbepaald" en niet "goedgekeurd".
 */
function lokaleComponenten(paginaPad: string): string[] {
  let src: string;
  try {
    src = readFileSync(paginaPad, 'utf8');
  } catch {
    return [];
  }
  const map = dirname(paginaPad);
  const uit: string[] = [];
  for (const m of src.matchAll(/from\s+'(\.\/[^']+)'/g)) {
    for (const ext of ['.tsx', '.ts']) {
      const kandidaat = join(map, m[1].replace(/^\.\//, '') + ext);
      if (existsSync(kandidaat)) {
        uit.push(kandidaat);
        break;
      }
    }
  }
  return uit;
}

function paginaBestand(route: string): string {
  const segmenten = route === '/' ? [] : route.slice(1).split('/');
  return join(APP_DIR, ...segmenten, 'page.tsx');
}

/**
 * De gedeclareerde taal komt uit `decideDocumentLang` zelf — niet uit een eigen
 * afleiding hier.
 *
 * Dat is geen stijlkeuze. Een eerdere versie liep de twee prefix-lijsten in
 * volgorde af en koos daarmee 'nl' voor `/brandmd/claim`, terwijl de resolver
 * (langste match wint) 'en' geeft. Een bewaker die de regel nábouwt, bewaakt zijn
 * eigen kopie — precies de fout die `document-locale.shared.ts` moest voorkomen
 * door server en client uit ÉÉN definitie te laten lezen.
 *
 * De UI-taal is hier 'en' en de landing-locale null: alleen routes met een
 * hardgecodeerde taal komen door de filter hieronder, dus die twee doen niet mee.
 */
function gedeclareerdeTaal(route: string): 'nl' | 'en' | null {
  const isHardgecodeerd =
    DUTCH_PUBLIC_PREFIXES.some((p) => matchesPrefix(route, p)) ||
    ENGLISH_PUBLIC_PREFIXES.some((p) => matchesPrefix(route, p));
  if (!isHardgecodeerd) return null;

  const taal = decideDocumentLang(route, 'en', null);
  return taal === 'nl' || taal === 'en' ? taal : null;
}

let onbepaald = 0;
for (const route of routes) {
  const verwacht = gedeclareerdeTaal(route);
  if (!verwacht) continue;

  const bestand = paginaBestand(route);
  let tekst = '';
  try {
    tekst = zichtbareTekst(bestand);
  } catch {
    continue; // route-groep of dynamische map: geen direct page-bestand
  }

  let nl = (tekst.match(NL_WOORDEN) ?? []).length;
  let en = (tekst.match(EN_WOORDEN) ?? []).length;
  let bron = 'page';

  // Te weinig in het page-bestand? Lees dan de componenten ernaast mee.
  if (nl + en < 3) {
    for (const component of lokaleComponenten(bestand)) {
      const t = zichtbareTekst(component);
      nl += (t.match(NL_WOORDEN) ?? []).length;
      en += (t.match(EN_WOORDEN) ?? []).length;
    }
    if (nl + en >= 3) bron = 'page + lokale componenten';
  }

  if (nl + en < 3) {
    console.log(
      `  ? ${route.padEnd(40)} onbepaald — te weinig tekst, ook in de lokale componenten`,
    );
    onbepaald++;
    continue;
  }

  const gemeten = nl >= en ? 'nl' : 'en';
  assert(
    `${route} is ${verwacht} en de tekst leest als ${verwacht} (nl=${nl} en=${en}, ${bron})`,
    gemeten === verwacht,
    `de route is ingedeeld als ${verwacht.toUpperCase()}, maar de zichtbare tekst telt ` +
      `${nl} Nederlandse en ${en} Engelse stopwoorden. Kies er één: vertaal de pagina, ` +
      `of geef hem een eigen prefix in document-locale.shared.ts.`,
  );
}

if (onbepaald > 0) {
  console.log(
    `\n  ⚠ ${onbepaald} route(s) leverden te weinig tekst voor een oordeel. Dat is stilte,\n` +
      '    geen goedkeuring: hun tekst zit in componenten en wordt hier niet gelezen.',
  );
}

console.log(
  failures.length === 0
    ? `\n✓ route-language-classification: ${pass} checks groen (${routes.length} routes)\n`
    : `\n✗ route-language-classification: ${failures.length} fout van ${pass + failures.length}\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
