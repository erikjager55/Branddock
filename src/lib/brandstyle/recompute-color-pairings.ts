import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildColorPairings } from "./color-pairings";
import { buildObservedColorPairings } from "./observed-color-pairings";

/**
 * Herberekent en persisteert `BrandStyleguide.colorPairings` uit de huidige
 * StyleguideColor-rijen. Aanroepen na een kleur-add/-delete zodat het
 * Kleurcombinaties-paneel niet stale paren toont (Fase 5 brand-fidelity).
 *
 * Voorkeur: heromap de bij de scrape gepersisteerde OBSERVED fg/bg-paren
 * (`observedColorPairs`) op het BEWERKTE palet — zo blijven de werkelijke (incl.
 * dark-mode) combinaties behouden i.p.v. te degraderen naar gegenereerd. Een
 * verwijderde kleur zit niet meer in `palette`, dus `buildObservedColorPairings`
 * laat elk paar dat ernaar verwees vanzelf vallen (matchPalette → null). Geen
 * observed data (oude/niet-her-gescrapete styleguide) → val terug op gegenereerd.
 */
export async function recomputeColorPairings(styleguideId: string): Promise<void> {
  const [colors, sg] = await Promise.all([
    prisma.styleguideColor.findMany({
      where: { styleguideId },
      select: { hex: true, category: true },
    }),
    prisma.brandStyleguide.findUnique({
      where: { id: styleguideId },
      select: { observedColorPairs: true },
    }),
  ]);

  // `category` is de Prisma ColorCategory-enum; PaletteColorLike.category is
  // `string` (bewust verbreed), dus de enum is toewijsbaar.
  const palette = colors.map((c) => ({ hex: c.hex, category: c.category as string }));

  const observed = parseObservedPairs(sg?.observedColorPairs);
  const observedPairings = buildObservedColorPairings(observed, palette);
  const pairings = observedPairings.length > 0 ? observedPairings : buildColorPairings(palette);

  await prisma.brandStyleguide.update({
    where: { id: styleguideId },
    data: {
      colorPairings:
        pairings.length > 0
          ? (pairings as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });
}

/** Narrowt de gepersisteerde `observedColorPairs` Json naar `Record<string,
 *  number>` (zonder `any`); lege/niet-object → null zodat de fallback klopt. */
function parseObservedPairs(
  value: Prisma.JsonValue | null | undefined,
): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "number") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}
