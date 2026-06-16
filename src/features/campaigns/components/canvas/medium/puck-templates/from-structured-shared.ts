/**
 * Gedeelde bouwstenen voor de W1 from-structured template-builders
 * (faq-page / product-page / microsite). Spiegelt de patronen uit
 * landing-page-from-structured.ts zonder dat bestand aan te raken —
 * het LP-pad blijft byte-compatibel (plan §1 Optie A).
 */

import type { CanvasContextStack } from "@/lib/ai/canvas-context";

export type PuckInstance = { type: string; props: Record<string, unknown> };

/** Puck-component-instance met random id, identiek aan het LP-builder-patroon. */
export function instance(type: string, props: Record<string, unknown>): PuckInstance {
  return {
    type,
    props: { id: `${type}-${Math.random().toString(36).slice(2, 9)}`, ...props },
  };
}

/**
 * Korte footer-tagline uit een subline: eerste zin, op woordgrens afgekapt.
 * Zelfde gedrag als footerTagline in landing-page-from-structured.ts (zonder
 * de eyebrow-preferentie — deze schemas hebben geen eyebrow).
 */
export function taglineFromSubline(subline: string): string {
  const MAX = 90;
  const firstSentence = subline.split(/(?<=[.!?])\s+/)[0]?.trim() ?? subline.trim();
  if (firstSentence.length <= MAX) return firstSentence;
  const cut = firstSentence.slice(0, MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Standaard-footer (brandnaam + tagline + default-links), zoals het LP-skelet. */
export function footerInstance(
  ctx: CanvasContextStack | null,
  tagline: string,
): PuckInstance {
  const brandName = ctx?.brand?.brandName ?? "Brand Name";
  return instance("Footer", {
    companyName: brandName,
    tagline,
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Voorwaarden", href: "/terms" },
      { label: "Contact", href: "/contact" },
    ],
  });
}

/**
 * navLabel → DOM-anker-id ("Ons verhaal" → "ons-verhaal"). Diacritics
 * gestript zodat "Doe meé" een geldig/stabiel anker oplevert; lege uitkomst
 * valt terug op de meegegeven fallback (anker mag nooit leeg zijn).
 */
export function slugifyAnchor(label: string, fallback: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
