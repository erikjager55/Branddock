/**
 * Long-form GEO-article template-builder voor STRUCTURED variants (GEO/SEO Fase 2).
 *
 * Deterministische mapping van LongFormGeoVariantContent → Puck-data-tree:
 *   BrandHero (titel) → RichText (answer-first) → RichText (TL;DR) →
 *   RichText per prose-sectie → StatsBlock (citeerbare stats) →
 *   ComparisonTable (multi-kolom, optioneel) → Listicle (genummerd, optioneel) →
 *   RichText (definities, optioneel) → FAQ (Q&A) → RichText (bronnen, optioneel) →
 *   BrandCTA → footer.
 *
 * Comparison + listicle gebruiken dedicated structured componenten (geen markdown);
 * definities/bronnen blijven RichText met inline-escaping. Definition/Author/Citation
 * als eigen blokken zijn een latere increment.
 */

import type { Data } from "@puckeditor/core";
import type { CanvasContextStack } from "@/lib/ai/canvas-context";
import type { SpikePuckProps } from "../puck-config";
import type { LongFormGeoVariantContent } from "@/lib/landing-pages/page-type-schemas";
import { resolveCtaHref, assignSectionBands } from "./landing-page-from-structured";
import { instance, taglineFromSubline, footerInstance, type PuckInstance } from "./from-structured-shared";

type SpikeData = Data<SpikePuckProps>;

/** Escape korte INLINE-velden (kop/label/titel/link-tekst): collapse newlines +
 *  escape markdown-metachars zodat ze de gegenereerde markdown niet breken.
 *  NIET voor block-prose (answerFirstIntro/section.body) — die mag bewust markdown bevatten. */
function escapeMdInline(value: string): string {
  return value.replace(/\s*\n\s*/g, " ").replace(/([\\`*_[\]])/g, "\\$1").trim();
}

/** Maak een URL veilig als markdown link-destination (ongebalanceerde `()`/spaties breken de link). */
function safeMdUrl(url: string): string {
  return url.trim().replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/\s/g, "%20");
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
    instance("RichText", { content: `## TL;DR\n\n${variant.tldr.map((b) => `- ${escapeMdInline(b)}`).join("\n")}` }),
    // Prose-secties (artikel-body): heading inline-escaped, body blijft block-prose (raw).
    ...variant.sections.map((s) => instance("RichText", { content: `## ${escapeMdInline(s.heading)}\n\n${s.body}` })),
    // Citeerbare stats — bron in het label zodat de herkomst zichtbaar blijft.
    instance("StatsBlock", {
      items: variant.citeableStats.map((s) => ({ value: s.value, label: `${s.label} — ${s.source}` })),
    }),
    // Multi-kolom vergelijking → dedicated ComparisonTable (geen markdown meer).
    ...(variant.comparison
      ? [
          instance("ComparisonTable", {
            caption: variant.comparison.caption ?? "",
            columns: variant.comparison.columns.map((value) => ({ value })),
            rows: variant.comparison.rows.map((r) => ({
              label: r.label,
              cells: r.cells.map((value) => ({ value })),
            })),
          }),
        ]
      : []),
    // Genummerde listicle → dedicated Listicle-component (geen markdown meer).
    ...(variant.listItems && variant.listItems.length > 0
      ? [
          instance("Listicle", {
            heading: "Op een rij",
            items: variant.listItems.map((it) => ({ rank: it.rank, title: it.title, body: it.body })),
          }),
        ]
      : []),
    ...(variant.definitions && variant.definitions.length > 0
      ? [
          instance("RichText", {
            content: variant.definitions.map((d) => `**${escapeMdInline(d.term)}** — ${escapeMdInline(d.definition)}`).join("\n\n"),
          }),
        ]
      : []),
    // Q&A — citeerbaar + (later) QAPage-JSON-LD.
    instance("FAQ", { heading: "Veelgestelde vragen", items: variant.qa }),
    ...(variant.sources && variant.sources.length > 0
      ? [
          instance("RichText", {
            content: `## Bronnen\n\n${variant.sources.map((s) => `- [${escapeMdInline(s.title)}](${safeMdUrl(s.url)})`).join("\n")}`,
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
