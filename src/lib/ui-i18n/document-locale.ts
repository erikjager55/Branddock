// =============================================================
// Documenttaal — de waarde van <html lang> op de root layout.
//
// STRIKT GESCHEIDEN van de UI-locale uit `config.ts` (de taal waarin de
// gebruiker de APP leest) en van de content-locale in `src/lib/i18n/`
// (de taal waarin de AI content SCHRIJFT).
//
// Waarom een aparte resolutie: `<html lang>` beschrijft de taal van de
// bytes op de pagina, niet de voorkeur van de bezoeker. Op de publieke
// routes lopen die twee uiteen — marketing, brand.md en de gepubliceerde
// klantpagina's gebruiken géén `useTranslation` en zijn hardgecodeerd
// Nederlands, terwijl de UI-cookie standaard 'en' teruggeeft. Gemeten op
// productie 2026-08-18: elke bezoeker zonder cookie kreeg `lang="en"` op
// een Nederlandse pagina, en `linfi.branddock.app/pillar-page` kreeg dat
// zelfs terwijl `LandingPage.locale = 'nl-NL'`.
// Zie tasks/static-rendering-regressie.md §4.
//
// Server-only: leest Prisma (lazy). De regels die de client óók nodig heeft
// staan in `document-locale.shared.ts`.
//
// ⚠️ Twee bekende grenzen (review 2026-08-18, bewust geaccepteerd):
//  - `LandingPage.locale` heeft default `en-GB` en wordt bij publish gevuld uit
//    `Workspace.contentLanguage` (default `en`). Een Nederlandse pagina uit een
//    workspace zonder ingestelde contenttaal krijgt dus `lang="en-GB"`. Dat is
//    een datavraag, geen renderbug — niets bewaakt dat die kolom de werkelijke
//    copy beschrijft. Zie tasks/static-rendering-regressie.md.
//  - Voor een `/p`-pad dat 404't wordt de lookup gedaan en het resultaat
//    weggegooid: de taal moet vóór de pagina bekend zijn, dus of het pad bestaat
//    is op dat moment nog niet vastgesteld. Gemeten: zo'n 404 serveert Next'
//    eigen foutdocument (`<html id="__next_error__">`) ZONDER lang-attribuut —
//    er is nergens een `not-found.tsx`, dus de root layout wordt vervangen. Dat
//    is pre-existing gedrag, niet iets wat deze module veroorzaakt.
// =============================================================

import { cache } from 'react';
import { resolveUiLocale, type UiLocale } from './config';
import { decideDocumentLang, matchPublishedPagePath } from './document-locale.shared';

/**
 * Leest de content-locale van een GEPUBLICEERDE landingspagina.
 *
 * `status: 'PUBLISHED'` staat er bewust in: zonder dat filter zou een
 * concept-pagina haar locale prijsgeven op een ongeauthenticeerde route, en
 * zou `<html lang>` een pagina beschrijven die de bezoeker niet te zien krijgt
 * (`resolvePublishedPage` weigert alles wat niet PUBLISHED is).
 *
 * `orderBy` maakt de keuze deterministisch. ⚠️ De aanname "één rij per slug"
 * is vandaag al te breken en wacht NIET op locale-routing: de publish-upsert
 * gebruikt `@@unique([workspaceId, locale, slug])`, dus wie
 * `Workspace.contentLanguage` omzet en dezelfde slug herpubliceert krijgt een
 * tweede PUBLISHED-rij. Vanaf dat moment kan deze lookup een andere rij kiezen
 * dan `resolvePublishedPage` (die geen `orderBy` heeft en de status pas ná de
 * query filtert) — en beschrijft `<html lang>` dus mogelijk een andere pagina
 * dan er gerenderd wordt. Oplossing is één gedeelde lookup; buiten scope hier,
 * genoteerd in tasks/static-rendering-regressie.md.
 *
 * `cache()` dedupliceert per functie binnen één render. Er is vandaag geen
 * tweede aanroeper, dus dit is één extra query op de `/p`-route — bewust
 * geaccepteerd omdat de taal in de root layout bekend moet zijn, vóór de
 * pagina zelf draait.
 */
export const loadLandingPageLocale = cache(
  async (workspaceSlug: string, slug: string): Promise<string | null> => {
    try {
      // Lazy, en dat MOET zo blijven: deze module hangt via de root layout aan
      // élke route, en `src/lib/prisma.ts` bouwt een `pg.Pool` op module-scope
      // die zonder DATABASE_URL gooit. Statisch importeren evalueert dat bij
      // iedere marketing-render én sloopt de CI-gate (`smoke:document-lang`
      // draait zonder env-block). ⚠️ Het verkleint de bundle níét — de
      // file-tracer volgt dynamische imports mee; /marketing houdt dezelfde 11
      // Prisma-bestanden als /p. Alleen de evaluatie wordt uitgesteld.
      const { prisma } = await import('@/lib/prisma');
      const page = await prisma.landingPage.findFirst({
        where: { slug, status: 'PUBLISHED', workspace: { slug: workspaceSlug } },
        select: { locale: true },
        orderBy: { updatedAt: 'desc' },
      });
      return page?.locale ?? null;
    } catch (error) {
      // Een taalattribuut is het niet waard om het hele document op te laten
      // vallen: de root layout omhult élke route. De pagina zelf leest dezelfde
      // DB en faalt dan alsnog zichtbaar, met een bruikbaardere fout. Wel
      // loggen — een structureel falende query mag niet onzichtbaar blijven.
      console.error('[document-locale] locale-lookup faalde', { workspaceSlug, slug, error });
      return null;
    }
  },
);

/**
 * Signatuur van de locale-lookup. Injecteerbaar zodat de CI-gate de BEDRADING
 * kan toetsen — welke argumenten in welke volgorde, en of het resultaat op het
 * juiste pad terechtkomt. Zonder die injectie kon je hier de workspace en de
 * slug verwisselen en bleef de smoke groen terwijl élke klantpagina stil op de
 * fallback-taal viel (gevonden in review, 2026-08-18).
 */
export type LandingLocaleLoader = (workspaceSlug: string, slug: string) => Promise<string | null>;

/** Uitkomst van de documenttaal-resolutie voor één request. */
export interface DocumentLocale {
  /** Waarde voor `<html lang>` — BCP-47, bv. 'nl', 'en' of 'nl-NL'. */
  lang: string;
  /** De UI-taal van de app-chrome; blijft de cookie volgen. */
  uiLocale: UiLocale;
}

/**
 * Bepaalt de documenttaal voor één request.
 *
 * @param pathname Het effectieve pad uit de `x-pathname`-request-header die
 *   `src/proxy.ts` zet — ná de host-rewrite, zodat een landingspagina op een
 *   workspace-subdomein als `/p/<ws>/<slug>` binnenkomt en niet als `/<slug>`.
 *   ⚠️ Echte custom domains (`DomainMapping`) zijn NIET gedekt: `decideHostRoute`
 *   kent ze niet, dus die vallen terug op de UI-taal. Zodra DomainMapping live
 *   gaat moet die host door dezelfde resolutie.
 * @param cookieValue Rauwe waarde van de `branddock-ui-locale`-cookie.
 * @param search Effectieve query-string uit `x-search`; alleen de tweetalige
 *   uitnodigingsroute gebruikt hem.
 * @param loadLocale Alleen voor tests; standaard de echte DB-lookup.
 */
export async function resolveDocumentLocale(
  pathname: string,
  cookieValue: string | null | undefined,
  search?: string | null,
  loadLocale: LandingLocaleLoader = loadLandingPageLocale,
): Promise<DocumentLocale> {
  const uiLocale = resolveUiLocale(cookieValue);

  // Alleen de IO zit hier; de precedentie staat puur in `decideDocumentLang`,
  // zodat de CI-gate haar kan vastpinnen.
  const publishedPage = matchPublishedPagePath(pathname);
  const landingLocale = publishedPage
    ? await loadLocale(publishedPage.workspace, publishedPage.slug)
    : null;

  return { lang: decideDocumentLang(pathname, uiLocale, landingLocale, search), uiLocale };
}
