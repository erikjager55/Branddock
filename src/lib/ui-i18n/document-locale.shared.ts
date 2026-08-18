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
 * Request-header waarmee `src/proxy.ts` het EFFECTIEVE pad (ná host-rewrite)
 * doorgeeft aan de root layout. Eén constante voor beide kanten: als losse
 * string-literals zou hernoemen aan één kant stil `lang="en"` opleveren op de
 * hele publieke funnel, zonder dat één gate rood wordt (gemeten in review).
 */
export const PATHNAME_HEADER = 'x-pathname';

/** Taal waarin de publieke, hardgecodeerde pagina's geschreven zijn. */
export const PUBLIC_CONTENT_LANG = 'nl';

/**
 * Matcht een pad tegen een prefix op SEGMENTGRENS, zodat een toekomstige
 * `/marketingcampagne` niet stil de Nederlandse taal erft.
 */
export function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
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
export function resolveClientLangDecision(host: string, pathname: string): ClientLangDecision {
  const effective = decideHostRoute(host, pathname).rewriteTo ?? pathname;
  if (matchPublishedPagePath(effective)) return { kind: 'leave' };
  if (isDutchPublicRoute(effective)) return { kind: 'fixed', lang: PUBLIC_CONTENT_LANG };
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
 * @param pathname Effectief pad (ná host-rewrite), uit `x-pathname`.
 * @param uiLocale De uit de cookie afgeleide UI-taal.
 * @param landingLocale `LandingPage.locale` als het pad een klantpagina is; anders
 *   `null`. Een onbruikbare waarde valt terug op de publieke contenttaal.
 */
export function decideDocumentLang(
  pathname: string,
  uiLocale: UiLocale,
  landingLocale: string | null,
): string {
  if (matchPublishedPagePath(pathname)) {
    return isUsableLang(landingLocale) ? landingLocale : PUBLIC_CONTENT_LANG;
  }
  if (isDutchPublicRoute(pathname)) return PUBLIC_CONTENT_LANG;
  return uiLocale;
}
