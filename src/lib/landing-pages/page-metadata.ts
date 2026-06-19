/**
 * GEO/SEO Fase 1a — pure mapping van de gepersisteerde SEO-checklist naar
 * Next.js `Metadata` voor de publieke /p/[slug]-render.
 *
 * De SEO-pipeline schrijft `settings.seoChecklist` (titleTag, metaDescription,
 * ogTitle, ogDescription, canonicalTag) bij generatie van een page-type
 * (`src/lib/ai/seo-pipeline.ts`). Tot nu toe consumeerde de publieke route die
 * waarden niet, waardoor elke gepubliceerde pagina de generieke root-layout-meta
 * kreeg. Deze module is bewust DB-/React-vrij zodat hij los smoke-getest kan
 * worden; de route levert de gelezen checklist aan.
 */

import type { Metadata } from "next";
import type { SeoChecklist } from "@/lib/ai/seo-pipeline.types";

/** Trimt en geeft undefined bij lege/ontbrekende waarde — Metadata laat lege strings niet weg. */
export function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export interface SeoMetadataOptions {
  /**
   * Canonical-URL die wordt gebruikt als de checklist geen expliciete `canonicalTag`
   * heeft. De publieke pagina is bereikbaar via zowel `<ws>.branddock.app/<slug>`
   * als `branddock.app/p/<slug>?workspace=<ws>` → een canonical is hier essentieel
   * tegen duplicate-content.
   */
  fallbackCanonical?: string;
}

/**
 * Bouwt Next.js `Metadata` uit een (mogelijk gedeeltelijke) SEO-checklist.
 * Fail-soft: niets bruikbaars → `{}` zodat Next.js terugvalt op de root-layout-defaults.
 * OG-titel/-omschrijving vallen terug op title/description; canonical komt uit de
 * checklist of, bij afwezigheid, uit `opts.fallbackCanonical`.
 */
export function seoChecklistToMetadata(
  checklist: Partial<SeoChecklist> | null | undefined,
  opts: SeoMetadataOptions = {},
): Metadata {
  const title = nonEmpty(checklist?.titleTag);
  const description = nonEmpty(checklist?.metaDescription);
  const canonical = nonEmpty(checklist?.canonicalTag) ?? nonEmpty(opts.fallbackCanonical);
  const ogTitle = nonEmpty(checklist?.ogTitle) ?? title;
  const ogDescription = nonEmpty(checklist?.ogDescription) ?? description;

  // Niets bruikbaars (geen meta én geen canonical) → {} zodat de layout-defaults
  // staan i.p.v. een lege <title> te forceren.
  if (!title && !description && !canonical && !ogTitle && !ogDescription) return {};

  // openGraph alleen opbouwen met gedefinieerde velden (geen `url: undefined`-ruis).
  const openGraph =
    ogTitle || ogDescription
      ? {
          type: "website" as const,
          ...(ogTitle ? { title: ogTitle } : {}),
          ...(ogDescription ? { description: ogDescription } : {}),
          ...(canonical ? { url: canonical } : {}),
        }
      : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: { index: true, follow: true },
    openGraph,
  };
}
