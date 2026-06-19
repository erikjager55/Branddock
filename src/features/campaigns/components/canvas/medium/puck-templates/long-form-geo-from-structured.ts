/**
 * Long-form GEO-article template-builder voor STRUCTURED variants (GEO/SEO Fase 2).
 *
 * Deterministische mapping van LongFormGeoVariantContent → Puck-data-tree met
 * hergebruik van bestaande componenten:
 *   BrandHero (titel) → RichText (answer-first) → RichText (TL;DR) →
 *   RichText per prose-sectie → StatsBlock (citeerbare stats) →
 *   RichText (comparison/listicle/definitions, optioneel) → FAQ (Q&A) →
 *   RichText (bronnen, optioneel) → BrandCTA → footer.
 *
 * NB: comparison + listicle worden in deze fase als RichText-markdown gerenderd;
 * dedicated ComparisonTable/Listicle-componenten volgen in de render-increment.
 */

import type { Data } from "@puckeditor/core";
import type { CanvasContextStack } from "@/lib/ai/canvas-context";
import type { SpikePuckProps } from "../puck-config";
import type { LongFormGeoVariantContent } from "@/lib/landing-pages/page-type-schemas";
import { resolveCtaHref, assignSectionBands } from "./landing-page-from-structured";
import { instance, taglineFromSubline, footerInstance, type PuckInstance } from "./from-structured-shared";

type SpikeData = Data<SpikePuckProps>;
type GeoComparison = NonNullable<LongFormGeoVariantContent["comparison"]>;
type GeoListItem = NonNullable<LongFormGeoVariantContent["listItems"]>[number];

/** Escape cel-inhoud zodat `|`/newlines de markdown-tabel niet breken. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
}

/** Multi-kolom vergelijking → markdown-tabel (header = columns, rij = label + cells). */
function comparisonMarkdown(c: GeoComparison): string {
  const header = `| ${c.columns.map(escapeCell).join(" | ")} |`;
  const sep = `| ${c.columns.map(() => "---").join(" | ")} |`;
  const rows = c.rows.map((r) => {
    const cells = [r.label, ...r.cells].slice(0, c.columns.length).map(escapeCell);
    while (cells.length < c.columns.length) cells.push("");
    return `| ${cells.join(" | ")} |`;
  });
  const title = c.caption ? `## ${escapeCell(c.caption)}\n\n` : "";
  return `${title}${[header, sep, ...rows].join("\n")}`;
}

/** Genummerde listicle → markdown ordered list. */
function listicleMarkdown(items: GeoListItem[]): string {
  return items
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((it) => `${it.rank}. **${it.title}** — ${it.body}`)
    .join("\n");
}

/**
 * Bouwt een Puck-data-tree uit een via longFormGeoVariantSchema gevalideerde variant.
 */
export function buildLongFormGeoTemplateFromStructured(
  variant: LongFormGeoVariantContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  const personaId = ctx?.personas?.[0]?.id ?? "";
  const ctaHref = resolveCtaHref(ctx);

  const sections: PuckInstance[] = [
    instance("BrandHero", {
      headline: variant.hero.headline,
      sub: variant.hero.subline,
      ctaLabel: "",
      ctaHref: "#",
      heroVisualUrl: variant.hero.heroVisualUrl ?? "",
      eyebrow: "",
    }),
    // Answer-first: de directe beantwoording bovenaan (AEO-citeerbaar).
    instance("RichText", { content: variant.answerFirstIntro }),
    // TL;DR / key takeaways.
    instance("RichText", { content: `## TL;DR\n\n${variant.tldr.map((b) => `- ${b}`).join("\n")}` }),
    // Prose-secties (artikel-body).
    ...variant.sections.map((s) => instance("RichText", { content: `## ${s.heading}\n\n${s.body}` })),
    // Citeerbare stats — bron in het label zodat de herkomst zichtbaar blijft.
    instance("StatsBlock", {
      items: variant.citeableStats.map((s) => ({ value: s.value, label: `${s.label} — ${s.source}` })),
    }),
    ...(variant.comparison ? [instance("RichText", { content: comparisonMarkdown(variant.comparison) })] : []),
    ...(variant.listItems && variant.listItems.length > 0
      ? [instance("RichText", { content: `## Op een rij\n\n${listicleMarkdown(variant.listItems)}` })]
      : []),
    ...(variant.definitions && variant.definitions.length > 0
      ? [
          instance("RichText", {
            content: variant.definitions.map((d) => `**${d.term}** — ${d.definition}`).join("\n\n"),
          }),
        ]
      : []),
    // Q&A — citeerbaar + (later) QAPage-JSON-LD.
    instance("FAQ", { heading: "Veelgestelde vragen", items: variant.qa }),
    ...(variant.sources && variant.sources.length > 0
      ? [
          instance("RichText", {
            content: `## Bronnen\n\n${variant.sources.map((s) => `- [${s.title}](${s.url})`).join("\n")}`,
          }),
        ]
      : []),
    instance("BrandCTA", {
      label: variant.finalCta.ctaLabel,
      href: ctaHref,
      personaId,
      riskReducer: "",
      heading: variant.finalCta.heading,
    }),
    footerInstance(ctx, taglineFromSubline(variant.hero.subline)),
  ];

  assignSectionBands(sections);

  return {
    root: { props: {} },
    content: sections,
  } as SpikeData;
}
