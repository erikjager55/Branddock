/**
 * document-lang-resolution — bewaakt de regels achter `<html lang>`.
 *
 * Waarom dit bestaat: op 2026-08-18 bleek dat élke bezoeker zonder UI-cookie
 * `lang="en"` kreeg op een Nederlandse marketing- of brand.md-pagina, en dat
 * een gepubliceerde klantpagina met `LandingPage.locale = 'nl-NL'` óók
 * `lang="en"` gaf. Niets kon dat zien: de pagina werkt, de tekst klopt, alleen
 * het taalattribuut liegt — tegen zoekmachines en schermlezers.
 *
 * De regels leven in `document-locale.shared.ts` en worden op TWEE plekken
 * gebruikt: server-side in de root layout, en client-side in `DocumentLangSync`
 * (die na een client-navigatie opnieuw beslist). Lopen die uit elkaar, dan is
 * het attribuut ná één klik weer fout. Deze smoke pint de gedeelde regels vast.
 *
 * Bewust statisch: geen DB, geen browser, geen server — draait daarom in CI
 * mee in de `check`-job (`.github/workflows/ci.yml`), als eigen step ná `npm run lint`.
 *
 * Draaien:
 *   node node_modules/.bin/tsx scripts/smoke-tests/document-lang-resolution.ts
 */

import {
  DUTCH_PUBLIC_PREFIXES,
  PUBLIC_CONTENT_LANG,
  isDutchPublicRoute,
  isUsableLang,
  matchPublishedPagePath,
  matchesPrefix,
  resolveClientLangDecision,
  decideDocumentLang,
  isEnglishPublicRoute,
  isBilingualQueryRoute,
  langFromSearch,
} from '../../src/lib/ui-i18n/document-locale.shared';
import { readFile } from 'node:fs/promises';

import { resolveDocumentLocale } from '../../src/lib/ui-i18n/document-locale';

let passed = 0;
const failures: string[] = [];

function check(what: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failures.push(`${what}\n    verwacht: ${e}\n    kreeg:    ${a}`);
  }
}

// ── Publieke NL-routes: prefix moet op SEGMENTGRENS matchen ────────────────
check('marketing-root is NL', isDutchPublicRoute('/marketing'), true);
check('marketing-subpad is NL', isDutchPublicRoute('/marketing/pricing'), true);
check('diep marketing-subpad is NL', isDutchPublicRoute('/marketing/features/campaigns'), true);
check('brandmd is NL', isDutchPublicRoute('/brandmd'), true);
check('brandmd-subpad is NL', isDutchPublicRoute('/brandmd/use'), true);
// De reden dat `matchesPrefix` bestaat: een losse startsWith zou dit meepakken.
check('marketingcampagne is GEEN publieke route', isDutchPublicRoute('/marketingcampagne'), false);
check('brandmd-extern is GEEN publieke route', isDutchPublicRoute('/brandmd-extern'), false);
check('app-root is geen NL-route', isDutchPublicRoute('/'), false);
check('app-subpad is geen NL-route', isDutchPublicRoute('/settings/integrations'), false);
check('leeg pad is geen NL-route', isDutchPublicRoute(''), false);
check('matchesPrefix exact', matchesPrefix('/marketing', '/marketing'), true);
check('matchesPrefix grens', matchesPrefix('/marketingx', '/marketing'), false);

// ── Landingspagina-pad ────────────────────────────────────────────────────
check('gepubliceerde pagina', matchPublishedPagePath('/p/napking/pillar-page'), {
  workspace: 'napking',
  slug: 'pillar-page',
});
check('trailing slash', matchPublishedPagePath('/p/napking/pillar-page/'), {
  workspace: 'napking',
  slug: 'pillar-page',
});
check('percent-encoding wordt gedecodeerd', matchPublishedPagePath('/p/acme%20bv/mijn%2Dpagina'), {
  workspace: 'acme bv',
  slug: 'mijn-pagina',
});
// `host-router.ts` codeert een diep pad in ÉÉN segment (a/b -> a%2Fb).
check('diep pad in één segment', matchPublishedPagePath('/p/napking/map%2Fpagina'), {
  workspace: 'napking',
  slug: 'map/pagina',
});
check('te weinig segmenten', matchPublishedPagePath('/p/napking'), null);
check('te veel segmenten', matchPublishedPagePath('/p/napking/map/pagina'), null);
check('ander pad', matchPublishedPagePath('/marketing/pricing'), null);
check('kapotte encoding valt terug', matchPublishedPagePath('/p/napking/%E0%A4%A'), null);

// ── Taalwaarde-validatie: `<html lang="">` mag nooit ontstaan ─────────────
check('nl is bruikbaar', isUsableLang('nl'), true);
check('nl-NL is bruikbaar', isUsableLang('nl-NL'), true);
check('en-GB is bruikbaar', isUsableLang('en-GB'), true);
check('lege string is onbruikbaar', isUsableLang(''), false);
check('null is onbruikbaar', isUsableLang(null), false);
check('undefined is onbruikbaar', isUsableLang(undefined), false);
check('spatie is onbruikbaar', isUsableLang('nl NL'), false);
check('onzin is onbruikbaar', isUsableLang('!!'), false);

// ── Client-side beslissing: MOET door de host-routing heen ───────────────
// Dit is het gat dat de browsercheck lokaal niet kán vinden: localhost is geen
// apex-host, dus daar is `/` een app-route. Op productie is `/` de Nederlandse
// marketing-homepage (rewrite naar /marketing). Een client die alleen naar het
// browserpad kijkt zet die pagina ná hydratie terug op Engels.
check('apex-root is de NL marketing-homepage', resolveClientLangDecision('branddock.app', '/'), {
  kind: 'fixed',
  lang: 'nl',
});
check('www-apex idem', resolveClientLangDecision('www.branddock.app', '/'), {
  kind: 'fixed',
  lang: 'nl',
});
check('apex met poort idem', resolveClientLangDecision('branddock.app:443', '/'), {
  kind: 'fixed',
  lang: 'nl',
});
check('apex /marketing-subpad', resolveClientLangDecision('branddock.app', '/marketing/pricing'), {
  kind: 'fixed',
  lang: 'nl',
});
check('app-host root is een app-route', resolveClientLangDecision('app.branddock.app', '/'), {
  kind: 'ui',
});
check('localhost root is een app-route', resolveClientLangDecision('localhost:3000', '/'), {
  kind: 'ui',
});
check('app-host marketing is NL', resolveClientLangDecision('app.branddock.app', '/marketing'), {
  kind: 'fixed',
  lang: 'nl',
});
check('app-host brandmd is NL', resolveClientLangDecision('localhost:3000', '/brandmd/use'), {
  kind: 'fixed',
  lang: 'nl',
});
check('app-host settings is app-route', resolveClientLangDecision('localhost:3000', '/settings/x'), {
  kind: 'ui',
});
// Workspace-host: `/<slug>` rewrite't naar /p/<ws>/<slug> — de taal staat in de
// database, dus de client moet er vanaf blijven.
check('workspace-host slug is een klantpagina', resolveClientLangDecision('linfi.branddock.app', '/pillar-page'), {
  kind: 'leave',
});
check('workspace-host root is geen klantpagina', resolveClientLangDecision('linfi.branddock.app', '/'), {
  kind: 'ui',
});
check('direct /p-pad is een klantpagina', resolveClientLangDecision('app.branddock.app', '/p/linfi/pillar-page'), {
  kind: 'leave',
});

// ── Server-precedentie: klantpagina > publieke route > UI-taal ───────────
// Zonder deze checks kon je een hele tak uit `resolveDocumentLocale` slopen en
// bleef de gate groen — hij toetste alleen de losse helpers.
check('klantpagina wint van de UI-taal', decideDocumentLang('/p/napking/x', 'en', 'nl-NL'), 'nl-NL');
check('klantpagina wint óók van een NL-voorkeur', decideDocumentLang('/p/napking/x', 'nl', 'en-GB'), 'en-GB');
check('klantpagina zonder bruikbare locale valt terug', decideDocumentLang('/p/napking/x', 'en', ''), 'nl');
check('klantpagina zonder rij valt terug', decideDocumentLang('/p/napking/x', 'en', null), 'nl');
check('marketing wint van de UI-taal', decideDocumentLang('/marketing/pricing', 'en', null), 'nl');
check('brandmd wint van de UI-taal', decideDocumentLang('/brandmd', 'en', null), 'nl');
check('app-route volgt de UI-taal (en)', decideDocumentLang('/', 'en', null), 'en');
check('app-route volgt de UI-taal (nl)', decideDocumentLang('/settings/x', 'nl', null), 'nl');
// Een landingLocale mag NOOIT lekken naar een niet-/p-pad.
check('marketing negeert een meegegeven landingLocale', decideDocumentLang('/marketing', 'en', 'de-DE'), 'nl');
check('app-route negeert een meegegeven landingLocale', decideDocumentLang('/', 'en', 'de-DE'), 'en');

async function runWiringChecks(): Promise<void> {
  // ── Bedrading: resolveDocumentLocale roept de lookup goed aan ────────────
  // Zonder deze checks kon je in `document-locale.ts` de workspace en de slug
  // verwisselen; élke klantpagina viel dan stil terug op de fallback-taal en de
  // gate bleef groen. De lookup is daarom injecteerbaar.
  const calls: Array<[string, string]> = [];
  const stubLoader = async (workspaceSlug: string, slug: string) => {
    calls.push([workspaceSlug, slug]);
    return workspaceSlug === 'napking' && slug === 'pillar-page' ? 'nl-NL' : null;
  };

  const wired = await resolveDocumentLocale('/p/napking/pillar-page', 'en', null, stubLoader);
  check('bedrading: lookup krijgt (workspace, slug) in die volgorde', calls[0], ['napking', 'pillar-page']);
  check('bedrading: DB-locale wint van de cookie', wired.lang, 'nl-NL');
  check('bedrading: uiLocale blijft de cookie volgen', wired.uiLocale, 'en');

  const missing = await resolveDocumentLocale('/p/onbekend/pagina', 'en', null, stubLoader);
  check('bedrading: onbekende pagina valt terug op nl', missing.lang, 'nl');

  calls.length = 0;
  const marketing = await resolveDocumentLocale('/marketing/pricing', 'en', null, stubLoader);
  check('bedrading: marketing raakt de lookup niet aan', calls.length, 0);
  check('bedrading: marketing is nl', marketing.lang, 'nl');

  const app = await resolveDocumentLocale('/', 'nl', null, stubLoader);
  check('bedrading: app-route volgt de cookie', app.lang, 'nl');
  check('bedrading: leeg pad valt terug op de UI-taal', (await resolveDocumentLocale('', 'en', null, stubLoader)).lang, 'en');

  // ── Bedrading: de client-tak die een RUNTIME-taalwissel opvangt ─────────
  //
  // `DocumentLangSync` heeft een tak die geen enkele gate ooit uitvoert: de
  // `languageChanged`-listener. De pure checks hierboven raken de DOM niet, en
  // de browser-smoke zet de cookie vóór de page load — dus wisselt er nooit
  // iets tijdens een sessie. Valt die tak stil, dan blijft de taal ná een
  // wissel de hele sessie verkeerd; dezelfde klasse fout die deze module
  // oploste.
  //
  // Wat hieronder staat is nadrukkelijk een BEDRADINGSCHECK, geen gedragstest.
  // Hij vangt verwijderen en hernoemen — de refactor-risico's — en niet of het
  // attribuut ná een echte wissel klopt. Dat laatste vraagt een browser die
  // daadwerkelijk van taal wisselt, en dat kan alleen via de ingelogde
  // instellingen-UI; het staat als open punt in tasks/document-lang-followups.md.
  //
  // De asserties leunen op i18next-API-namen (`on`/`off`/`languageChanged`) en
  // niet op onze eigen bewoording. Wordt de component omgebouwd naar een ander
  // mechanisme, dan hóórt dit rood te worden: iemand moet dan opnieuw vaststellen
  // dat een runtime-wissel nog werkt.
  const syncSource = await readFile(
    new URL('../../src/lib/ui-i18n/DocumentLangSync.tsx', import.meta.url),
    'utf8',
  );
  check(
    'bedrading: er is een languageChanged-listener',
    /i18n\.on\(\s*'languageChanged'/.test(syncSource),
    true,
  );
  check(
    'bedrading: die listener wordt ook weer afgemeld (geen stapeling)',
    /i18n\.off\(\s*'languageChanged'/.test(syncSource),
    true,
  );
  // Bewust NIET `/document\.documentElement\.lang\s*=/`: dat patroon staat drie
  // keer in het bestand (de `fixed`-tak, de app-tak, en de handler), dus het
  // slaagt ook als juist de handler leeg is. Gemeten: die versie liet een
  // mutatie ongemoeid door. Dit patroon bindt de toewijzing aan de handler zelf.
  check(
    'bedrading: de languageChanged-handler schrijft zelf naar documentElement.lang',
    /onChange\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*document\.documentElement\.lang\s*=/.test(
      syncSource,
    ),
    true,
  );

  // ── Randgeval dat de host-routing vóór prefix-matching afdwingt ──────────
  // Een workspace-host met slug `marketing` is een KLANTPAGINA, geen NL-site.
  // Wie `isDutchPublicRoute` vóór `decideHostRoute` zou zetten, breekt dit.
  check('workspace-host /marketing is een klantpagina', resolveClientLangDecision('linfi.branddock.app', '/marketing'), {
    kind: 'leave',
  });
}

// ── Engelstalige publieke routes ─────────────────────────────────────────
// Het spiegelbeeld van de oorspronkelijke bug: NL-voorkeur op Engelse tekst.
check('oauth/login is EN', isEnglishPublicRoute('/oauth/login'), true);
check('oauth/consent is EN', isEnglishPublicRoute('/oauth/consent'), true);
check('reset-password is EN', isEnglishPublicRoute('/reset-password'), true);
check('oauth-root is EN', isEnglishPublicRoute('/oauth'), true);
check('segmentgrens: oauthx is GEEN EN-route', isEnglishPublicRoute('/oauthx'), false);
check('marketing is geen EN-route', isEnglishPublicRoute('/marketing'), false);
check('EN wint van de NL-voorkeur', decideDocumentLang('/oauth/login', 'nl', null), 'en');
check('EN wint ook bij EN-voorkeur', decideDocumentLang('/reset-password', 'en', null), 'en');
check('EN-route negeert landingLocale', decideDocumentLang('/oauth/consent', 'nl', 'de-DE'), 'en');

// ── Tweetalige uitnodigingsroute: taal uit ?lang ─────────────────────────
// Identiek aan wat de pagina zelf doet: alleen 'nl' telt, de rest is 'en'.
check('invite is de tweetalige route', isBilingualQueryRoute('/invite/accept'), true);
check('invite-root is dat niet', isBilingualQueryRoute('/invite'), false);
check('?lang=nl -> nl', langFromSearch('?lang=nl'), 'nl');
check('?lang=en -> en', langFromSearch('?lang=en'), 'en');
check('?lang ontbreekt -> en', langFromSearch('?token=abc'), 'en');
check('lege query -> en', langFromSearch(''), 'en');
check('null -> en', langFromSearch(null), 'en');
check('onzin-waarde -> en', langFromSearch('?lang=de'), 'en');
check('zonder vraagteken werkt ook', langFromSearch('lang=nl'), 'nl');
check('invite volgt ?lang, niet de cookie', decideDocumentLang('/invite/accept', 'en', null, '?lang=nl'), 'nl');
check('invite met NL-cookie maar EN-link', decideDocumentLang('/invite/accept', 'nl', null, '?lang=en'), 'en');
check('invite zonder ?lang valt terug op en', decideDocumentLang('/invite/accept', 'nl', null, ''), 'en');
check('invite met token ervoor', decideDocumentLang('/invite/accept', 'en', null, '?token=x&lang=nl'), 'nl');

// ── Precedentie tussen de nieuwe regels ──────────────────────────────────
check('klantpagina wint nog steeds van alles', decideDocumentLang('/p/ws/slug', 'en', 'nl-NL', '?lang=en'), 'nl-NL');
check('NL-publiek negeert ?lang', decideDocumentLang('/marketing', 'en', null, '?lang=en'), 'nl');
check('app-route negeert ?lang', decideDocumentLang('/settings/x', 'nl', null, '?lang=en'), 'nl');

// ── Client-beslissing kent dezelfde regels ───────────────────────────────
check('client: oauth is fixed en', resolveClientLangDecision('app.branddock.app', '/oauth/login'), { kind: 'fixed', lang: 'en' });
check('client: reset-password is fixed en', resolveClientLangDecision('localhost:3000', '/reset-password'), { kind: 'fixed', lang: 'en' });
check('client: invite volgt de query', resolveClientLangDecision('app.branddock.app', '/invite/accept', '?lang=nl'), { kind: 'fixed', lang: 'nl' });
check('client: invite zonder query is en', resolveClientLangDecision('app.branddock.app', '/invite/accept'), { kind: 'fixed', lang: 'en' });

// ── Langste prefix wint, niet de lijstvolgorde ───────────────────────────
// `/brandmd/claim` ligt genest onder `/brandmd`. Werd de Nederlandse lijst eerst
// getoetst, dan won `/brandmd` altijd en was elke Engelse uitzondering eronder
// dode code. Zonder deze checks kan iemand de langste-match-helper terugdraaien
// naar twee losse if-takken zonder dat er iets rood wordt.
check('genest EN-pad wint van de kortere NL-prefix', decideDocumentLang('/brandmd/claim/abc123', 'nl', null), 'en');
check('de NL-prefix eromheen blijft NL', decideDocumentLang('/brandmd/use', 'en', null), 'nl');
check('de NL-root zelf blijft NL', decideDocumentLang('/brandmd', 'en', null), 'nl');
check('een niet-genest EN-pad blijft EN', decideDocumentLang('/oauth/login', 'nl', null), 'en');

// ── Constanten waarop beide kanten leunen ────────────────────────────────
check('publieke contenttaal is nl', PUBLIC_CONTENT_LANG, 'nl');
check('twee NL-prefixen', [...DUTCH_PUBLIC_PREFIXES], ['/marketing', '/brandmd']);

function report(): void {
  if (failures.length > 0) {
    console.error(
      `\n✗ document-lang-resolution: ${failures.length} van ${passed + failures.length} checks faalden\n`,
    );
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`✓ document-lang-resolution: ${passed} checks groen`);
}

runWiringChecks().then(report, (err) => {
  console.error('✗ document-lang-resolution: bedradingschecks gooiden een fout\n', err);
  process.exit(1);
});
