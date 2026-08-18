/**
 * Afleiden van een publiek bruikbare paginatitel uit de opgeslagen `puckData`.
 *
 * Aanleiding (2026-08-18): `settings.seoChecklist` wordt uitsluitend door de
 * SEO-pipeline geschreven (`src/lib/ai/seo-pipeline.ts`). Een pagina uit de
 * gewone webpage-builder heeft er dus nooit één, en had daardoor géén `<title>`
 * en in `llms.txt` alleen de kale slug als linktekst.
 *
 * Bewust NIET `Deliverable.title` als bron: dat veld bevat in de praktijk het
 * content-type-label ("Landing Page", "Blog Post"), dus dat zou letterlijk
 * `<title>Landing Page</title>` in de zoekresultaten zetten — slechter dan de
 * generieke layout-default. De hero-`headline` is wél de echte kop van de
 * pagina (de H1 die de bezoeker ziet).
 *
 * DB- en React-vrij zodat de logica los smoke-getest kan worden.
 */

/** Trimt en geeft undefined bij lege/ontbrekende waarde. */
function cleaned(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Maximale lengte van een afgeleide titel — voorkomt een <title> van 300 tekens. */
const MAX_TITLE_LENGTH = 120;

function capped(value: string): string {
  if (value.length <= MAX_TITLE_LENGTH) return value;
  // Kap op woordgrens zodat er geen half woord in de zoekresultaten staat.
  const slice = value.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

/**
 * Leest de eerste bruikbare kop uit een pagina-boom.
 *
 * Voorkeursvolgorde: `headline` (de hero, dus de H1) vóór `heading` (secties,
 * H2-niveau). Zonder die voorkeur zou een pagina waarvan de hero geen kop heeft
 * maar sectie 2 wél, een H2 als paginatitel krijgen terwijl er verderop een
 * betere hero-kop kan staan.
 *
 * @param puckData De opgeslagen pagina-boom (`LandingPage.puckData`).
 * @returns De titel, of `undefined` als er geen bruikbare kop is.
 */
export function resolvePageTitleFromPuckData(puckData: unknown): string | undefined {
  if (!puckData || typeof puckData !== 'object' || Array.isArray(puckData)) return undefined;
  const content = (puckData as Record<string, unknown>).content;
  if (!Array.isArray(content)) return undefined;

  let sectionHeading: string | undefined;

  for (const item of content) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const props = (item as Record<string, unknown>).props;
    if (!props || typeof props !== 'object' || Array.isArray(props)) continue;

    const headline = cleaned((props as Record<string, unknown>).headline);
    if (headline) return capped(headline);

    if (!sectionHeading) sectionHeading = cleaned((props as Record<string, unknown>).heading);
  }

  return sectionHeading ? capped(sectionHeading) : undefined;
}
