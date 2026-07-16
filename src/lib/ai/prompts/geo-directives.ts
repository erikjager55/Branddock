/**
 * GEO/SEO Fase 3 — canonieke GEO-directive (Generative Engine Optimization).
 *
 * Eén bron van waarheid voor de GEO-schrijfprincipes die AI-antwoordmachines
 * (ChatGPT, Perplexity, Google AI Overviews, Gemini) nodig hebben om passages
 * zelfstandig te kunnen CITEREN. Wordt op twee plekken hergebruikt zodat de twee
 * GEO-paden niet uit elkaar driften:
 *   1. de gestructureerde long-form-GEO-generatie (variant-generator.ts);
 *   2. de composable GEO-polish ná de SEO-pipeline (geo-polish.ts, seo-geo-profiel).
 *
 * Pure functie — geen DB/AI. Levert platte prompt-tekst.
 */

/** Versie van de directive-inhoud — voor reproduceerbaarheid/prompt-tracking. */
export const GEO_DIRECTIVE_VERSION = '1.0.0';

export interface GeoDirectiveOpts {
  /** Content-locale (bijv. "nl-NL" / "en-US"); puur informatief in de regeltekst. */
  locale?: string;
  /**
   * 'generate' = directive voor een verse generatie (default).
   * 'polish'   = directive voor het herschrijven van bestaande (SEO-)content;
   *              voegt de expliciete trade-off-regel toe (answer-first wint van
   *              keyword-first) zodat de SEO-keywordstructuur behouden blijft maar
   *              de citeerbaarheid voorrang krijgt.
   */
  mode?: 'generate' | 'polish';
}

/**
 * Bouwt het canonieke GEO-directive-blok: answer-first, atomic chunking,
 * cited-stats, entity-clarity, freshness + de anti-patterns. In 'polish'-modus
 * komt de trade-off-regel erbij. Bedoeld om in een groter system-prompt te
 * worden ingebed (geen op zichzelf staand prompt).
 */
export function buildGeoDirective(opts: GeoDirectiveOpts = {}): string {
  const tradeOff =
    opts.mode === 'polish'
      ? '\n- **Trade-off**: behoud de bestaande SEO-keywordstructuur, maar als citeerbaarheid en keyword-dichtheid botsen wint ALTIJD answer-first; forceer nooit keywords ten koste van een zelfstandig citeerbare zin.'
      : '';
  // "vertaal niet" (tot 2026-07-16) sprak de gedeelde locale-directive letterlijk tegen:
  // die eist juist dat anderstalig bronmateriaal VERTAALD wordt i.p.v. bewaard ("translate,
  // don't mirror"). In de long-form-GEO-prompt landden beide regels naast elkaar, met deze
  // als laatste — precies op de route waar de taalmenging gemeld werd (pillar-page).
  // Bedoeld was "vertaal de pagina niet naar een andere taal"; gelezen werd "laat vreemde
  // termen staan". Nu eenduidig, en consistent voor de callers die de gedeelde directive
  // NIET hebben (geo-polish.ts) — daarom herformuleren i.p.v. schrappen.
  const localeRule = opts.locale
    ? `\n- **Taal**: schrijf alle output in de content-locale (${opts.locale}); wissel niet van taal binnen de pagina. Anderstalig bronmateriaal vertaal je naar deze taal.`
    : '';

  return `# GEO-DIRECTIVE (citeerbaarheid voor AI-antwoordmachines)
Schrijf zo dat een AI-engine losse passages zelfstandig kan citeren. Citeerbaarheid > vindbaarheid.
- **Answer-first (AEO)**: beantwoord elke kernvraag in de eerste zin, volledig en zelfstandig leesbaar — een engine moet die zin los kunnen citeren zonder de rest.
- **Atomic chunking**: schrijf in zelfstandige brokken van 2-4 zinnen; elk brok staat op zichzelf. Geen lange lappen tekst.
- **Citeerbare stats MET bron**: elk cijfer/feit heeft een expliciete bron uit de aangeleverde context. Verzin nooit cijfers, percentages of bronnen.
- **Entity-clarity**: definieer sleuteltermen en gebruik volledige entiteitsnamen; vermijd vage verwijzingen ("dit", "het", "het systeem").
- **Freshness**: maak recentheid expliciet waar de context dat toelaat (datums, "per <jaar>", actuele cijfers) zodat de passage als actueel gelezen wordt.
- **Anti-patterns (vermijd)**: keyword-stuffing, marketing-fluff zonder inhoud, het antwoord begraven onder inleiding, ongefundeerde claims, vage voornaamwoorden, en muren van tekst.${localeRule}${tradeOff}`;
}
