// =============================================================
// Gedeelde regels voor de documenttaal (`<html lang>`).
//
// Apart van `document-locale.ts` omdat dié Prisma importeert: een client
// component dat hieruit leest zou de DB-client in de browserbundle trekken.
// Even belangrijk: server en client leiden de eigenaar zo uit ÉÉN definitie
// af, zodat ze niet uit elkaar kunnen lopen.
// =============================================================

import { decideHostRoute } from '@/lib/landing-pages/host-router';
import type { UiLocale } from './config';

/**
 * Publieke routes die in het Nederlands geschreven zijn en geen i18n-runtime
 * gebruiken. Prefix-match op segmentgrens.
 */
export const DUTCH_PUBLIC_PREFIXES = ['/marketing', '/brandmd'] as const;

/**
 * Publieke routes die in het ENGELS geschreven zijn en geen i18n-runtime
 * gebruiken: de OAuth-schermen en het wachtwoord-herstelscherm. Zonder deze
 * lijst volgen ze de UI-cookie, en krijgt een gebruiker met een Nederlandse
 * voorkeur `lang="nl"` op Engelse tekst — het spiegelbeeld van de bug die deze
 * module oploste. Gemeten 2026-08-18: 0 `useTranslation`-aanroepen, en de
 * zichtbare strings zijn "Password updated", "Authorize access", "Sign in".
 */
export const ENGLISH_PUBLIC_PREFIXES = ['/oauth', '/reset-password'] as const;

/** Taal van die Engelstalige publieke schermen. */
export const ENGLISH_PUBLIC_LANG = 'en';

/**
 * De uitnodigingspagina is TWEETALIG en haalt haar taal uit `?lang` — bewust
 * niet uit i18next of de cookie: de ontvanger heeft nog geen account, en de
 * cookie van een toevallig ingelogde ándere gebruiker zou juist de verkeerde
 * taal geven (zie de header van `src/app/invite/accept/page.tsx`). `<html lang>`
 * moet dus dezelfde bron volgen als de tekst eronder.
 */
export const BILINGUAL_QUERY_ROUTES = ['/invite/accept'] as const;

/**
 * Request-header waarmee `src/proxy.ts` het EFFECTIEVE pad (ná host-rewrite)
 * doorgeeft aan de root layout. Eén constante voor beide kanten: als losse
 * string-literals zou hernoemen aan één kant stil `lang="en"` opleveren op de
 * hele publieke funnel, zonder dat één gate rood wordt (gemeten in review).
 */
export const PATHNAME_HEADER = 'x-pathname';

/**
 * Request-header met de EFFECTIEVE query-string. Alleen nodig voor de
 * tweetalige uitnodigingsroute, die haar taal uit `?lang` haalt; een layout
 * kan `searchParams` niet lezen, dus de proxy geeft hem door. Net als
 * `PATHNAME_HEADER` onvoorwaardelijk gezet, dus niet spoofbaar.
 */
export const SEARCH_HEADER = 'x-search';

/** Taal waarin de publieke, hardgecodeerde pagina's geschreven zijn. */
export const PUBLIC_CONTENT_LANG = 'nl';

/**
 * Matcht een pad tegen een prefix op SEGMENTGRENS, zodat een toekomstige
 * `/marketingcampagne` niet stil de Nederlandse taal erft.
 */
export function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** True als het pad een van de hardgecodeerd ENGELSE publieke routes is. */
export function isEnglishPublicRoute(pathname: string): boolean {
  return ENGLISH_PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** True als het pad de tweetalige route is die haar taal uit `?lang` haalt. */
export function isBilingualQueryRoute(pathname: string): boolean {
  return BILINGUAL_QUERY_ROUTES.some((route) => matchesPrefix(pathname, route));
}

/**
 * Leest `?lang` zoals `invite/accept` dat doet: alleen 'nl' telt, al het
 * andere valt terug op 'en'. Bewust identiek aan de pagina zelf — lopen die
 * twee uiteen, dan beschrijft het attribuut een andere taal dan de tekst.
 */
export function langFromSearch(search: string | null | undefined): string {
  if (!search) return ENGLISH_PUBLIC_LANG;
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('lang');
  return value === 'nl' ? 'nl' : ENGLISH_PUBLIC_LANG;
}

/** True als het pad een van de hardgecodeerd Nederlandse publieke routes is. */
export function isDutchPublicRoute(pathname: string): boolean {
  return DUTCH_PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/**
 * Splitst `/p/<workspace>/<slug>` uit een effectief pad (ná host-rewrite).
 * Geeft `null` als het pad die vorm niet heeft of de encoding kapot is.
 */
export function matchPublishedPagePath(
  pathname: string,
): { workspace: string; slug: string } | null {
  const match = pathname.match(/^\/p\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return { workspace: decodeURIComponent(match[1]), slug: decodeURIComponent(match[2]) };
  } catch {
    return null; // kapotte percent-encoding → val terug op de UI-taal
  }
}

/**
 * Toetst of een waarde bruikbaar is als `<html lang>`. `LandingPage.locale` is
 * een vrije `String`-kolom die alleen de publish-route beperkt; een rij uit een
 * seed, import of handmatige edit kan leeg of onzinnig zijn, en die zou
 * letterlijk `<html lang="">` opleveren.
 */
export function isUsableLang(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/.test(value);
}

/** Wat de client met `<html lang>` moet doen op een gegeven host + browserpad. */
export type ClientLangDecision =
  | { kind: 'leave' } // klantpagina: de server las de taal uit de database
  | { kind: 'fixed'; lang: string } // hardgecodeerd Nederlandse publieke route
  | { kind: 'ui' }; // app-route: de UI-taal bezit het attribuut

/**
 * Bepaalt client-side wie `<html lang>` bezit, vanaf het BROWSER-pad.
 *
 * Waarom dit door `decideHostRoute` moet: het browserpad is niet altijd het
 * pad dat de app rendert. Op de marketing-apex is `/` de Nederlandse
 * marketing-homepage (rewrite naar `/marketing`), en op een workspace-host is
 * `/<slug>` een klantpagina (rewrite naar `/p/<ws>/<slug>`). Een client die
 * alleen naar `usePathname()` kijkt ziet in beide gevallen iets anders dan de
 * server en zet de taal terug naar Engels — precies de bug die deze module
 * moet voorkomen. Server en client delen daarom één routingfunctie.
 */
export function resolveClientLangDecision(
  host: string,
  pathname: string,
  search?: string | null,
): ClientLangDecision {
  const effective = decideHostRoute(host, pathname).rewriteTo ?? pathname;
  if (matchPublishedPagePath(effective)) return { kind: 'leave' };
  if (isBilingualQueryRoute(effective)) return { kind: 'fixed', lang: langFromSearch(search) };
  if (isDutchPublicRoute(effective)) return { kind: 'fixed', lang: PUBLIC_CONTENT_LANG };
  if (isEnglishPublicRoute(effective)) return { kind: 'fixed', lang: ENGLISH_PUBLIC_LANG };
  return { kind: 'ui' };
}

/**
 * Bepaalt `<html lang>` uit de al opgehaalde gegevens — de precedentie zonder IO.
 *
 * Apart van `resolveDocumentLocale` zodat de CI-gate deze volgorde kan vastpinnen:
 * klantpagina wint van publieke route, publieke route wint van de UI-taal. Zonder
 * deze splitsing kon je een hele tak uit de resolver slopen terwijl de smoke groen
 * bleef — de gate toetste alleen de losse helpers.
 *
 * De volgorde is de precedentie, en die is bewust:
 *   klantpagina (DB) > tweetalige route (?lang) > NL-publiek > EN-publiek > UI-taal
 *
 * @param pathname Effectief pad (ná host-rewrite), uit `x-pathname`.
 * @param uiLocale De uit de cookie afgeleide UI-taal.
 * @param landingLocale `LandingPage.locale` als het pad een klantpagina is; anders
 *   `null`. Een onbruikbare waarde valt terug op de publieke contenttaal.
 * @param search Effectieve query-string, uit `x-search`. Alleen gebruikt door de
 *   tweetalige route.
 */
export function decideDocumentLang(
  pathname: string,
  uiLocale: UiLocale,
  landingLocale: string | null,
  search?: string | null,
): string {
  if (matchPublishedPagePath(pathname)) {
    return isUsableLang(landingLocale) ? landingLocale : PUBLIC_CONTENT_LANG;
  }
  if (isBilingualQueryRoute(pathname)) return langFromSearch(search);
  if (isDutchPublicRoute(pathname)) return PUBLIC_CONTENT_LANG;
  if (isEnglishPublicRoute(pathname)) return ENGLISH_PUBLIC_LANG;
  return uiLocale;
}
