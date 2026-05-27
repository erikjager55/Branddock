/**
 * One-off: scrape linfi.nl + persist ALLEEN de Fase A extractor-output
 * naar BrandStyleguide.{button,typography,spacing,elevation,radius,motion}Profile.
 *
 * Workaround voor het feit dat de analyzeUrl-flow blijkbaar JSON null
 * schrijft i.p.v. de array. Dit script slaat alle AI-fases over en doet
 * alleen scrape + extract + persist.
 *
 * Run: DATABASE_URL=... npx tsx scripts/persist-linfi-profiles.ts
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { scrapeUrl } from "../src/lib/brandstyle/url-scraper";

async function main() {
  const sg = await prisma.brandStyleguide.findUnique({
    where: { workspaceId: "cmnixs78z002g44msjvlyhiqb" },
    select: { id: true },
  });
  if (!sg) {
    console.error("Geen LINFI styleguide gevonden");
    process.exit(1);
  }

  console.log("[persist] Scraping linfi.nl…");
  const scraped = await scrapeUrl("https://linfi.nl");
  console.log(`[persist] scraped.buttonStyles.length:        ${scraped.buttonStyles?.length}`);
  console.log(`[persist] scraped.typographyByRole keys:      ${Object.keys(scraped.typographyByRole ?? {}).length}`);
  console.log(`[persist] scraped.spacingProfile.section:     ${scraped.spacingProfile?.section.samples.length}`);
  console.log(`[persist] scraped.elevationProfile.samples:   ${scraped.elevationProfile?.samples.length}`);
  console.log(`[persist] scraped.motionProfile.samples:      ${scraped.motionProfile?.samples.length}`);

  await prisma.brandStyleguide.update({
    where: { id: sg.id },
    data: {
      buttonProfile: JSON.parse(JSON.stringify(scraped.buttonStyles ?? [])) as Prisma.InputJsonValue,
      typographyProfile: JSON.parse(JSON.stringify(scraped.typographyByRole ?? {})) as Prisma.InputJsonValue,
      spacingProfile: JSON.parse(JSON.stringify(scraped.spacingProfile ?? null)) as Prisma.InputJsonValue,
      elevationProfile: JSON.parse(JSON.stringify(scraped.elevationProfile ?? null)) as Prisma.InputJsonValue,
      radiusProfile: JSON.parse(JSON.stringify(scraped.radiusProfile ?? null)) as Prisma.InputJsonValue,
      motionProfile: JSON.parse(JSON.stringify(scraped.motionProfile ?? null)) as Prisma.InputJsonValue,
    },
  });
  console.log("[persist] Done.");

  // Verify
  const after = await prisma.brandStyleguide.findUnique({
    where: { id: sg.id },
    select: { buttonProfile: true, spacingProfile: true },
  });
  console.log(`[persist] After update — buttonProfile array length: ${Array.isArray(after?.buttonProfile) ? (after?.buttonProfile as unknown[]).length : "not array"}`);

  await prisma.$disconnect();
}

main().catch((err) => { console.error("[persist] Crashed:", err); process.exit(1); });
