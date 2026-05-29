/**
 * Generieke re-scrape + persist voor brand-profiles (button, typography,
 * spacing, elevation, radius, motion) van een workspace.
 *
 * Run:
 *   DATABASE_URL=... npx tsx scripts/persist-brand-profiles.ts <workspaceId> <url>
 *
 * Voorbeeld:
 *   DATABASE_URL=... npx tsx scripts/persist-brand-profiles.ts cmnzy32qq0054b1msasa6pz9b https://napking.nl/
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { scrapeUrl } from "../src/lib/brandstyle/url-scraper";

async function main() {
  const [workspaceId, url] = process.argv.slice(2);
  if (!workspaceId || !url) {
    console.error("Usage: persist-brand-profiles.ts <workspaceId> <url>");
    process.exit(1);
  }
  const sg = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  if (!sg) {
    console.error(`Geen styleguide voor workspace ${workspaceId}`);
    process.exit(1);
  }

  console.log(`[persist] Scraping ${url}…`);
  const scraped = await scrapeUrl(url);
  console.log(`[persist]   buttonStyles:        ${scraped.buttonStyles?.length ?? 0}`);
  console.log(`[persist]   typographyByRole:    ${Object.keys(scraped.typographyByRole ?? {}).length} roles`);
  console.log(`[persist]   spacingProfile:      ${scraped.spacingProfile?.section.samples.length ?? 0} samples`);
  console.log(`[persist]   elevationProfile:    ${scraped.elevationProfile?.samples.length ?? 0} samples`);
  console.log(`[persist]   motionProfile:       ${scraped.motionProfile?.samples.length ?? 0} samples`);

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
  await prisma.$disconnect();
}

main().catch((err) => { console.error("[persist] Crashed:", err); process.exit(1); });
