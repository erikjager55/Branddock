/**
 * GEO long-form knowledge-context builder.
 *
 * Twee dingen die het standaard-serialisatiepad mist voor citeerbaarheid:
 *  1. **Primary-cap**: user-geselecteerde knowledge-resources defaulten naar `reference` →
 *     de 7000-char-cap, terwijl een research-rapport zijn URLs/referenties achteraan heeft
 *     (die dus worden afgekapt). We forceren `primary` (16000-cap) zodat de volledige bron —
 *     inclusief de "## Sources"-sectie + URLs — het model bereikt.
 *  2. **Expliciete citeer-handles**: een "## CITEERBARE BRONNEN"-blok met de exacte titel
 *     (+ url) per knowledge-resource, als schone, niet-afkapbare handle die het model in
 *     `citeableStats[].source` kan kopiëren — robuuster dan hopen dat het de titel/URL uit
 *     een 14k-blob vist.
 *
 * Gebruikt door de generate-structured-variant route, alleen voor de long-form GEO-types
 * (citeableStats); andere page-types blijven het bestaande serialisatiepad gebruiken.
 */
import { serializeContextForPrompt } from "@/lib/ai/context/fetcher";
import { prisma } from "@/lib/prisma";

/** Een door de gebruiker geselecteerd context-item (subset van canvas-context's additionalContextItems). */
export type GeoContextItem = {
  sourceType: string;
  sourceId: string;
  title: string;
  note?: string;
  priority?: "primary" | "reference";
};

/**
 * Bouwt de knowledge-context-tekst voor long-form GEO-generatie. De eerste paar
 * knowledge-resources (selectie-volgorde) worden op `primary` (16k-cap) geforceerd zodat hun
 * volledige bron — incl. referenties/URLs achteraan — het model bereikt, en exact datzelfde setje
 * krijgt een "## CITEERBARE BRONNEN"-handle (titel + url) om in citeableStats[].source te kopiëren.
 * Niet-knowledge-items en knowledge-bronnen voorbij de cap houden hun bestaande priority, zodat het
 * primary-budget bij de citeerbare bronnen blijft en niet ongebreideld groeit. Geeft undefined
 * terug bij geen/lege selectie of lege serialisatie.
 *
 * Let op: de 16k-primary-cap geldt op het hele geserialiseerde item (titel/velden + content). Bij
 * een bron groter dan ~16k kan de body-staart (waar referenties/URLs vaak staan) alsnog afkappen;
 * de "## CITEERBARE BRONNEN"-handle (uit het title/url-veld, niet de body) blijft dan de
 * betrouwbare citeer-bron.
 */
export async function buildGeoKnowledgeContext(
  items: GeoContextItem[] | undefined,
  workspaceId: string,
): Promise<string | undefined> {
  if (!items?.length) return undefined;

  // Bron-type-bewuste, begrensde primary-budget: alleen de eerste N knowledge-resources krijgen de
  // 16k-primary-cap én een citeer-handle. Zo gaat het budget naar de citeerbare bronnen (niet naar
  // een persona/product die toevallig vooraan staat) én hoort elke handle bij een volledig
  // geserialiseerde bron. Niet-knowledge + bronnen voorbij de cap houden hun bestaande priority.
  const MAX_PRIMARY_SOURCES = 3;
  // Dedup vóór de cap zodat een dubbel-geselecteerde bron niet twee plekken (of een dubbele
  // handle) opslokt; daarna de eerste N unieke knowledge-resources op selectie-volgorde.
  const primaryKnowledgeIds = [
    ...new Set(
      items.filter((i) => i.sourceType === "knowledge_resource").map((i) => i.sourceId),
    ),
  ].slice(0, MAX_PRIMARY_SOURCES);
  const primarySet = new Set(primaryKnowledgeIds);

  const serializeItems = items.map((i) =>
    primarySet.has(i.sourceId) ? { ...i, priority: "primary" as const } : i,
  );
  const serialized = (await serializeContextForPrompt(serializeItems, workspaceId)) || "";
  if (!serialized.trim()) return undefined;

  // Citeer-handles voor exact de primary-geserialiseerde bronnen, in selectie-volgorde.
  const records = primaryKnowledgeIds.length
    ? await prisma.knowledgeResource.findMany({
        where: { id: { in: primaryKnowledgeIds }, workspaceId },
        select: { id: true, title: true, url: true },
      })
    : [];
  const byId = new Map(records.map((r) => [r.id, r]));
  const handles = primaryKnowledgeIds
    .map((id) => byId.get(id))
    .filter((r): r is (typeof records)[number] => r != null && r.title.trim().length > 0)
    .map((r) => (r.url.trim() ? `- ${r.title} — ${r.url.trim()}` : `- ${r.title}`));

  const sourcesBlock = handles.length
    ? `## CITEERBARE BRONNEN\nGebruik UITSLUITEND deze bronnen als citeableStats[].source wanneer een cijfer uit het bronmateriaal komt — kopieer de titel (of URL) exact. First-party merk-cijfers krijgen geen bron (null).\n${handles.join("\n")}\n\n`
    : "";

  return `${sourcesBlock}${serialized}`;
}
