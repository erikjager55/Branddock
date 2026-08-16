// =============================================================
// Platte tekst uit een Puck-render-boom.
//
// `settings.puckData` is de GERENDERDE vorm van een web-page: een boom van
// componenten met hun props. De copy zit verspreid over die props. Dit is geen
// content-bron in de zin van de accessor — `structuredVariant` is de waarheid —
// maar hij is wél de enige plek waar een INLINE EDIT in de Puck-editor landt:
// de autosave schrijft `puckData` zonder `structuredVariant` aan te raken
// (zie de `autosaveShapedWrite`-check in de studio-PATCH).
//
// Daarom bestaat deze helper: om te kunnen zien of een autosave écht tekst
// veranderde, of alleen layout/hero/props. Zonder dat onderscheid zou elke
// autosave een LearningEvent opleveren en de tabel volspammen.
//
// Zie tasks/content-chain-accessor.md, kruising #18.
// =============================================================

/** Props die nooit copy bevatten — URL's, ids, enum-achtige stijlwaarden. */
const NON_TEXT_KEYS = new Set([
  'id',
  'type',
  'url',
  'href',
  'src',
  'imageUrl',
  'heroVisualUrl',
  'videoUrl',
  'icon',
  'variant',
  'align',
  'layout',
  'style',
  'color',
  'background',
  'archetype',
  'slug',
]);

/** Ziet eruit als een technische waarde i.p.v. copy. */
function looksTechnical(value: string): boolean {
  const v = value.trim();
  if (v.length < 3) return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^[a-z0-9_-]+$/i.test(v) && !v.includes(' ')) return true; // slug/enum/id
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return true; // kleurcode
  return false;
}

/**
 * Alle copy-achtige strings uit een puckData-boom, in stabiele volgorde.
 *
 * Deterministisch: dezelfde boom levert dezelfde string op, zodat een diff tussen
 * twee versies alleen uitslaat op échte tekstwijzigingen. Objectsleutels worden
 * gesorteerd zodat een herordende serialisatie geen valse edit oplevert.
 */
export function puckDataToText(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    if (!looksTechnical(node)) out.push(node.trim());
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) puckDataToText(child, out);
    return out;
  }
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node as Record<string, unknown>).sort()) {
      if (NON_TEXT_KEYS.has(key)) continue;
      puckDataToText((node as Record<string, unknown>)[key], out);
    }
  }
  return out;
}

/** De copy van een puckData-boom als één vergelijkbare string. */
export function flattenPuckData(puckData: unknown): string {
  return puckDataToText(puckData).join('\n');
}
