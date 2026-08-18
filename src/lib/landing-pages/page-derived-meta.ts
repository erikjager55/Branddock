/**
 * Afleiden van publiek bruikbare metadata (titel + beschrijving) uit de
 * opgeslagen `puckData`.
 *
 * Aanleiding (2026-08-18): `settings.seoChecklist` wordt uitsluitend door de
 * SEO-pipeline geschreven (`src/lib/ai/seo-pipeline.ts`). Een pagina uit de
 * gewone webpage-builder heeft er dus nooit één, en had daardoor géén `<title>`,
 * géén meta-description, en in `llms.txt` alleen de kale slug als linktekst.
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

/**
 * Maximale lengte van een afgeleide meta-description. Zoekmachines tonen
 * ~155-160 tekens; langer wordt afgekapt weergegeven, dus dat kappen we liever
 * zelf op een woordgrens dan dat Google er middenin snijdt.
 */
const MAX_DESCRIPTION_LENGTH = 155;

/**
 * Strip markdown-opmaak tot leesbare platte tekst.
 *
 * De `RichText`-secties bevatten markdown (`**vet**`, `## kop`, links, lijsten);
 * die tekens horen niet in een meta-description. Bewust een kleine, expliciete
 * set regels in plaats van een parser-dependency: dit draait op een
 * hot render-pad en hoeft alleen leesbaar te maken, niet correct te renderen.
 */
function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')           // codeblokken
    .replace(/`([^`]*)`/g, '$1')                // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // afbeeldingen
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // links → linktekst
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')         // koppen
    .replace(/^\s{0,3}>\s?/gm, '')              // quotes
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')  // lijst-bullets
    .replace(/(\*\*|__)(.*?)\1/g, '$2')         // vet
    .replace(/(\*|_)(.*?)\1/g, '$2')            // cursief
    .replace(/~~(.*?)~~/g, '$1')                // doorhalen
    .replace(/^\s*([-*_]\s*){3,}$/gm, ' ');     // horizontale lijnen
}

/**
 * Markdown → platte tekst, in de juiste volgorde.
 *
 * ⚠️ Strip vóór het normaliseren van witruimte. De strip-regels voor koppen,
 * quotes en lijst-bullets zijn regel-gebonden (`^` met de `m`-vlag); wie eerst
 * `\s+` naar spaties platslaat, houdt één regel over en raakt dan alleen het
 * eerste bullet — en een getrimde `'##'` matcht de kop-regel niet meer omdat de
 * verplichte spatie erna weg is. Beide fouten zaten in de eerste versie.
 */
function plainText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const stripped = stripMarkdown(value).replace(/\s+/g, ' ').trim();
  return stripped.length > 0 ? stripped : undefined;
}

function cappedTo(value: string, max: number): string {
  if (value.length <= max) return value;
  const slice = value.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > max / 3 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

/**
 * Leest een bruikbare beschrijving uit de pagina-boom.
 *
 * Voorkeursvolgorde: de hero-`sub` (de opzettelijk geschreven samenvatting
 * onder de H1) vóór de eerste lopende tekst uit een `content`/`body`-veld.
 * Die eerste is door een mens of de generator bedoeld als pitch; de tweede is
 * een noodgreep die in elk geval de pagina beschrijft in plaats van niets.
 *
 * @param puckData De opgeslagen pagina-boom (`LandingPage.puckData`).
 * @returns Platte tekst van ten hoogste ~155 tekens, of `undefined`.
 */
export function resolvePageDescriptionFromPuckData(puckData: unknown): string | undefined {
  if (!puckData || typeof puckData !== 'object' || Array.isArray(puckData)) return undefined;
  const content = (puckData as Record<string, unknown>).content;
  if (!Array.isArray(content)) return undefined;

  let bodyText: string | undefined;

  for (const item of content) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const props = (item as Record<string, unknown>).props;
    if (!props || typeof props !== 'object' || Array.isArray(props)) continue;
    const record = props as Record<string, unknown>;

    const sub = plainText(record.sub);
    if (sub) return cappedTo(sub, MAX_DESCRIPTION_LENGTH);

    if (!bodyText) bodyText = plainText(record.content) ?? plainText(record.body);
  }

  return bodyText ? cappedTo(bodyText, MAX_DESCRIPTION_LENGTH) : undefined;
}
