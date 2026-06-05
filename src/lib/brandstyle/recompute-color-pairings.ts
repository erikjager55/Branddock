import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildColorPairings } from "./color-pairings";

/**
 * Herberekent en persisteert `BrandStyleguide.colorPairings` uit de huidige
 * StyleguideColor-rijen. Aanroepen na een kleur-add/-delete zodat het
 * Kleurcombinaties-paneel niet stale paren toont (Fase 5 brand-fidelity).
 */
export async function recomputeColorPairings(styleguideId: string): Promise<void> {
  const colors = await prisma.styleguideColor.findMany({
    where: { styleguideId },
    select: { hex: true, category: true },
  });
  const pairings = buildColorPairings(colors);
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
