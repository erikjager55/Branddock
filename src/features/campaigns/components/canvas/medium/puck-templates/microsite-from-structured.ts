/**
 * Campaign-microsite template-builder voor STRUCTURED variants (W1 + W4, plan
 * docs/specs/website-page-types-implementatieplan.md §4).
 *
 * Deterministische mapping van MicrositeVariantContent → Puck-data-tree:
 *   1. AnchorNav (W4): sticky ankernavigatie met scroll-spy (navLabel → #slug,
 *      genummerd 01-04 zodat de arc expliciet is) + persistente CTA naar #join.
 *   2. Hero-manifest: these-headline + primaryCta die naar de join-sectie
 *      scrollt (de conversie gebeurt onderaan; de echte CTA-URL zit op join).
 *   3. HighlightCards (W4, Apple "Get the highlights"): TL;DR-kaarten die
 *      tegelijk jump-links zijn — alleen bij ≥2 hoofdstukken (anders is de
 *      pagina kort genoeg).
 *   4. Per hoofdstuk (story / impact? / community?): één StoryChapter (W4:
 *      heading + intro + 2-3 blokken alternerend beeld/tekst, sectie draagt
 *      het anker + tabindex), daarna optioneel een stat-callout (StatsBlock)
 *      en quote (Testimonial) als rustpunten.
 *   5. Join — altijd de laatste sectie; deadline als urgentie-element in de
 *      riskReducer-slot, CTA-URL uit Step 1 (resolveCtaHref).
 *
 * Beeld-vulling (W4): heroManifest krijgt het eerste laad-bare brandImage;
 * de rest vult chapter-block-slots (max 2 per hoofdstuk — het ~40% beeld-
 * ritme uit het plan) wanneer het blok zelf nog geen imageUrl draagt.
 *
 * Anker-id's worden gededupliceerd ("impact", "impact-2") zodat dubbele
 * navLabels nooit twee secties hetzelfde DOM-id geven.
 */

import type { Data } from "@puckeditor/core";
import type { CanvasContextStack } from "@/lib/ai/canvas-context";
import type { SpikePuckProps } from "../puck-config";
import type { MicrositeVariantContent, MicrositeChapter } from "@/lib/landing-pages/page-type-schemas";
import { resolveCtaHref, assignSectionBands } from "./landing-page-from-structured";
import { instance, taglineFromSubline, footerInstance, slugifyAnchor, type PuckInstance } from "./from-structured-shared";

type SpikeData = Data<SpikePuckProps>;

/** Max aantal brand-beelden per hoofdstuk — bewaakt het beeld/tekst-ritme. */
const MAX_BLOCK_IMAGES_PER_CHAPTER = 2;

/** navLabels → unieke anker-slugs, in sectie-volgorde gededupliceerd. */
function buildAnchorSlugs(labels: string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label, i) => {
    const base = slugifyAnchor(label, `sectie-${i + 1}`);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}

/** Eerste zin van een tekst, op woordgrens afgekapt op ~90 tekens (card-copy). */
function cardDescription(text: string | null | undefined): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "";
  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
  if (firstSentence.length <= 90) return firstSentence;
  const cut = firstSentence.slice(0, 90);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/**
 * W4 — vul lege block-beeld-slots met brand-beelden (immutable). `pool` wordt
 * gemuteerd (shift) zodat opeenvolgende hoofdstukken verschillende beelden
 * krijgen; max 2 per hoofdstuk.
 */
function fillChapterImages(chapter: MicrositeChapter, pool: string[]): MicrositeChapter {
  if (pool.length === 0) return chapter;
  let used = 0;
  const blocks = chapter.blocks.map((block) => {
    if (!block.imageUrl && used < MAX_BLOCK_IMAGES_PER_CHAPTER && pool.length > 0) {
      used++;
      return { ...block, imageUrl: pool.shift() };
    }
    return block;
  });
  return used > 0 ? { ...chapter, blocks } : chapter;
}

/** Eén hoofdstuk → StoryChapter (geankerd) + optioneel StatsBlock + Testimonial. */
function chapterSections(
  chapter: MicrositeChapter,
  anchorId: string,
  personaId: string,
): PuckInstance[] {
  const sections: PuckInstance[] = [
    instance("StoryChapter", {
      heading: chapter.heading,
      intro: chapter.intro ?? "",
      blocks: chapter.blocks.map((block) => ({
        heading: block.heading ?? "",
        body: block.body,
        imageUrl: block.imageUrl ?? "",
      })),
      anchorId,
    }),
  ];
  if (chapter.stat) {
    sections.push(
      instance("StatsBlock", {
        items: [{ value: chapter.stat.value, label: chapter.stat.context }],
      }),
    );
  }
  if (chapter.quote) {
    sections.push(
      instance("Testimonial", {
        quote: `"${chapter.quote.text}"`,
        author: chapter.quote.attribution,
        personaId,
      }),
    );
  }
  return sections;
}

/**
 * Bouwt een Puck-data-tree uit een gevalideerde MicrositeVariantContent.
 * Verwacht een via micrositeVariantSchema gevalideerde variant.
 */
export function buildMicrositeTemplateFromStructured(
  variant: MicrositeVariantContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  const personaId = ctx?.personas?.[0]?.id ?? "";
  const brandName = ctx?.brand?.brandName ?? "Brand Name";

  const rawChapters = [variant.story, variant.impact, variant.community]
    .filter((c): c is MicrositeChapter => c != null);
  const slugs = buildAnchorSlugs([
    ...rawChapters.map((c) => c.navLabel),
    variant.join.navLabel,
  ]);
  const joinSlug = slugs[slugs.length - 1];

  // W4 beeld-vulling: eerste laad-bare brandImage → hero; de rest → block-slots.
  const imagePool = (ctx?.brandImages ?? [])
    .map((b) => b?.url)
    .filter((u): u is string => typeof u === "string" && u.length > 0);
  const heroVisualUrl = variant.heroManifest.heroVisualUrl
    ?? (imagePool.length > 0 ? imagePool.shift() : null)
    ?? "";
  const chapters = rawChapters.map((c) => fillChapterImages(c, imagePool));

  const navLinks = [
    ...chapters.map((c, i) => ({ label: c.navLabel, href: `#${slugs[i]}` })),
    { label: variant.join.navLabel, href: `#${joinSlug}` },
  ];

  // W4 — HighlightCards (TL;DR + jump-links) alleen bij ≥2 hoofdstukken.
  const highlightCards = chapters.length >= 2
    ? instance("HighlightCards", {
        items: [
          ...chapters.map((c, i) => ({
            title: c.heading,
            description: cardDescription(c.intro ?? c.blocks[0]?.body),
            href: `#${slugs[i]}`,
          })),
          {
            title: variant.join.heading,
            description: variant.join.deadline ?? cardDescription(variant.join.body),
            href: `#${joinSlug}`,
          },
        ],
      })
    : null;

  const sections: PuckInstance[] = [
    instance("AnchorNav", {
      brandName,
      links: navLinks,
      ctaLabel: variant.heroManifest.primaryCta,
      ctaHref: `#${joinSlug}`,
      numbered: true,
    }),
    instance("BrandHero", {
      headline: variant.heroManifest.headline,
      sub: variant.heroManifest.subline,
      ctaLabel: variant.heroManifest.primaryCta,
      ctaHref: `#${joinSlug}`,
      heroVisualUrl,
      eyebrow: "",
    }),
    ...(highlightCards ? [highlightCards] : []),
    ...chapters.flatMap((chapter, i) => chapterSections(chapter, slugs[i], personaId)),
    instance("BrandCTA", {
      label: variant.join.primaryCta,
      href: resolveCtaHref(ctx),
      personaId,
      riskReducer: [variant.join.body, variant.join.deadline]
        .filter((part): part is string => !!part?.trim())
        .join(" — "),
      heading: variant.join.heading,
      anchorId: joinSlug,
    }),
    footerInstance(ctx, taglineFromSubline(variant.heroManifest.subline)),
  ];

  assignSectionBands(sections);

  return {
    root: { props: {} },
    content: sections,
  } as SpikeData;
}
