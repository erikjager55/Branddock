// =============================================================
// Brand-logo resolver
//
// Resolves the active brand logo URL for a workspace from the
// StyleguideLogo table. Used by the generate-visual pipeline to
// overlay the REAL logo on AI-generated images when the scene
// prompt mentions "Logo …" — image models hallucinate logos
// (wrong colours, distorted typography, garbled marks), so we
// strip the logo mention from the prompt and composite the real
// asset post-generation.
//
// Variant preference (best → worst for overlay-on-photo):
//   1. PRIMARY  — canonical lockup, what users mean by "the logo"
//   2. LOCKUP   — logo + wordmark combination
//   3. ICON     — symbol-only, works at small sizes
//   4. LIGHT/DARK — color variants, taken as last resort
//   5. WORDMARK — text-only, often too wide for a corner overlay
// =============================================================

import { prisma } from '@/lib/prisma';

const VARIANT_PREFERENCE = ['PRIMARY', 'LOCKUP', 'ICON', 'LIGHT', 'DARK', 'WORDMARK'] as const;

export interface BrandLogo {
  url: string;
  /** "svg" | "png" | "jpg" — passed to sharp for rasterisation. */
  fileType: string;
  variant: string;
  width: number | null;
  height: number | null;
}

/**
 * Find the best logo asset for image overlay. Returns null when the
 * workspace has no styleguide or no uploaded logos — caller should
 * skip overlay gracefully (log + return raw image).
 */
export async function getBrandLogo(workspaceId: string): Promise<BrandLogo | null> {
  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { workspaceId },
    select: {
      id: true,
      logos: {
        select: {
          variant: true,
          fileUrl: true,
          fileType: true,
          width: true,
          height: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!styleguide || styleguide.logos.length === 0) return null;

  // Pick by variant preference; within the same variant, lowest sortOrder
  // wins (user-curated order in the styleguide UI).
  for (const variant of VARIANT_PREFERENCE) {
    const candidates = styleguide.logos
      .filter((l) => l.variant === variant)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const pick = candidates[0];
    if (pick) {
      return {
        url: pick.fileUrl,
        fileType: pick.fileType.toLowerCase(),
        variant: pick.variant,
        width: pick.width,
        height: pick.height,
      };
    }
  }

  // Fallback — any logo at all (variants outside the preference list).
  const fallback = [...styleguide.logos].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (!fallback) return null;
  return {
    url: fallback.fileUrl,
    fileType: fallback.fileType.toLowerCase(),
    variant: fallback.variant,
    width: fallback.width,
    height: fallback.height,
  };
}

/**
 * W5 L-Fase 3 — alle logo-assets van een workspace (op sortOrder), zodat de
 * hero-overlay luminantie-bewust een LIGHT/DARK-variant kan kiezen. Returnt []
 * bij geen styleguide/logos.
 */
export async function getBrandLogos(workspaceId: string): Promise<BrandLogo[]> {
  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { workspaceId },
    select: {
      logos: {
        select: { variant: true, fileUrl: true, fileType: true, width: true, height: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!styleguide || styleguide.logos.length === 0) return [];
  return styleguide.logos.map((l) => ({
    url: l.fileUrl,
    fileType: l.fileType.toLowerCase(),
    variant: l.variant,
    width: l.width,
    height: l.height,
  }));
}

/**
 * W5 L-Fase 3 — kies de best leesbare logo-variant voor de achtergrond-
 * luminantie van de overlay-hoek. Pure functie (unit-smokebaar).
 *
 * - Donkere hoek → LIGHT-logo (licht logo contrasteert), anders PRIMARY/ICON/…
 * - Lichte hoek → DARK-logo, anders PRIMARY/ICON/…
 * - De gevraagde polariteit wint; ontbreekt die variant, dan de algemene
 *   voorkeursvolgorde (zoals getBrandLogo). Geen logos → null.
 */
export function pickLogoForBackground(
  logos: BrandLogo[],
  backgroundIsDark: boolean,
): BrandLogo | null {
  if (logos.length === 0) return null;
  const byVariant = (variant: string): BrandLogo | undefined => logos.find((l) => l.variant === variant);
  // Polariteit-eerst: op een donkere hoek wil je een licht logo en omgekeerd.
  const polarity = backgroundIsDark ? "LIGHT" : "DARK";
  const order = backgroundIsDark
    ? ["LIGHT", "PRIMARY", "LOCKUP", "ICON", "DARK", "WORDMARK"]
    : ["DARK", "PRIMARY", "LOCKUP", "ICON", "LIGHT", "WORDMARK"];
  const polarityMatch = byVariant(polarity);
  if (polarityMatch) return polarityMatch;
  for (const variant of order) {
    const pick = byVariant(variant);
    if (pick) return pick;
  }
  return logos[0];
}
