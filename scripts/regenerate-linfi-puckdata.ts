/**
 * One-off: regenerate puckData voor LINFI deliverable cmpn3ojl6002i7tc9ptimsr7d
 * met de huidige v4 tokens (na re-scrape).
 *
 * Run: DATABASE_URL=... npx tsx scripts/regenerate-linfi-puckdata.ts
 */
import { prisma } from "../src/lib/prisma";
import { assembleCanvasContext } from "../src/lib/ai/canvas-context";
import { variantToPuckDataFromStructured } from "../src/features/campaigns/components/canvas/medium/variant-to-puck-data";
import type { LandingPageVariantContent } from "../src/lib/landing-pages/variant-schema";

const DELIVERABLE_ID = "cmpn3ojl6002i7tc9ptimsr7d";

async function main() {
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: DELIVERABLE_ID },
    select: { id: true, settings: true, campaign: { select: { workspaceId: true } } },
  });
  if (!deliverable) {
    console.error("Deliverable niet gevonden");
    process.exit(1);
  }
  const workspaceId = deliverable.campaign.workspaceId;

  const settings =
    deliverable.settings && typeof deliverable.settings === "object" && !Array.isArray(deliverable.settings)
      ? (deliverable.settings as Record<string, unknown>)
      : {};
  const variant = settings.structuredVariant as LandingPageVariantContent | undefined;
  if (!variant) {
    console.error("Geen structuredVariant in settings");
    process.exit(1);
  }

  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);
  console.log(`[regen] BrandTokens.button: paddingY=${ctx.brandTokens.button.paddingY} paddingX=${ctx.brandTokens.button.paddingX} radius=${ctx.brandTokens.button.radiusPx} textTransform=${ctx.brandTokens.button.textTransform}`);
  console.log(`[regen] sectionRhythm.sectionPaddingY=${ctx.brandTokens.sectionRhythm.sectionPaddingY}`);
  console.log(`[regen] elevation.cardElevationCategory=${ctx.brandTokens.elevation.cardElevationCategory}`);
  console.log(`[regen] iconography.strokeWeight=${ctx.brandTokens.iconography.strokeWeight} size=${ctx.brandTokens.iconography.sizeDefault}`);
  console.log(`[regen] motion: ${ctx.brandTokens.motion.transitionDuration} ${ctx.brandTokens.motion.easing}`);
  console.log(`[regen] photography.promptFragment len=${ctx.brandTokens.photography.promptFragment.length}`);

  const newPuckData = variantToPuckDataFromStructured(variant, ctx);

  await prisma.deliverable.update({
    where: { id: DELIVERABLE_ID },
    data: {
      settings: {
        ...settings,
        puckData: newPuckData,
        puckRegeneratedAt: new Date().toISOString(),
      },
    },
  });

  console.log(`[regen] puckData regenerated; ${(newPuckData.content as unknown[]).length} blocks`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[regen] Crashed:", err);
  process.exit(1);
});
