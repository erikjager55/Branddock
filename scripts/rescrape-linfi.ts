/**
 * One-off script: re-scrape linfi.nl + check resultaat.
 *
 * Workflow:
 *   1. Lokaliseer LINFI workspace + bestaande BrandStyleguide
 *   2. Roep analyzeUrl direct aan (zoals de /api/brandstyle/analyze/url route)
 *   3. Wacht tot analysis-status COMPLETE is (polling)
 *   4. Print summary van geëxtraheerde rendering-profiles
 *
 * Run: npx tsx scripts/rescrape-linfi.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { prisma } from "../src/lib/prisma";
import { analyzeUrl } from "../src/lib/brandstyle/analysis-engine";

async function main() {
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: "Linfi", mode: "insensitive" } },
  });
  if (!workspace) {
    console.error("LINFI workspace niet gevonden");
    process.exit(1);
  }
  console.log(`[rescrape] workspace=${workspace.id} (${workspace.name}) url=${workspace.websiteUrl}`);

  if (!workspace.websiteUrl) {
    console.error("Workspace heeft geen websiteUrl");
    process.exit(1);
  }

  // Verwijder bestaande styleguide (cascade nuke colors + fonts + etc.)
  const existing = await prisma.brandStyleguide.findUnique({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });
  if (existing) {
    console.log(`[rescrape] Removing existing styleguide ${existing.id}…`);
    await prisma.$transaction([
      prisma.styleguideColor.deleteMany({ where: { styleguideId: existing.id } }),
      prisma.brandStyleguide.delete({ where: { id: existing.id } }),
    ]);
  }

  // Bouw nieuwe styleguide met initiële status
  // User-id voor createdById: probeer workspace-owner, anders pak een
  // organization-member, anders fallback first-user (script-context).
  let owner = await prisma.user.findFirst({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });
  if (!owner) {
    const member = await prisma.organizationMember.findFirst({
      where: { organization: { workspaces: { some: { id: workspace.id } } } },
      select: { userId: true },
    });
    if (member?.userId) {
      owner = { id: member.userId };
    }
  }
  if (!owner) {
    owner = await prisma.user.findFirst({ select: { id: true } });
  }
  if (!owner) {
    console.error("Geen user gevonden (fallback ook leeg)");
    process.exit(1);
  }
  console.log(`[rescrape] Using createdById=${owner.id}`);

  const sg = await prisma.brandStyleguide.create({
    data: {
      status: "ANALYZING",
      sourceType: "URL",
      sourceUrl: workspace.websiteUrl,
      analysisStatus: "SCANNING_STRUCTURE",
      analysisJobId: `manual_${Date.now()}`,
      createdById: owner.id,
      workspaceId: workspace.id,
    },
  });
  console.log(`[rescrape] Created styleguide ${sg.id}`);

  console.log(`[rescrape] Running analyzeUrl…`);
  const start = Date.now();
  await analyzeUrl(sg.id, workspace.websiteUrl);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[rescrape] Done in ${elapsed}s`);

  // Print rendering-profiles summary
  const result = await prisma.brandStyleguide.findUnique({
    where: { id: sg.id },
    select: {
      status: true,
      analysisStatus: true,
      primaryFontName: true,
      layoutStyle: true,
      layoutStyleInferred: true,
      archetype: true,
      buttonProfile: true,
      typographyProfile: true,
      spacingProfile: true,
      elevationProfile: true,
      radiusProfile: true,
      motionProfile: true,
      photographyStyle: true,
      colors: { take: 5, orderBy: { sortOrder: "asc" }, select: { hex: true, category: true, tags: true } },
    },
  });

  if (!result) {
    console.error("[rescrape] Styleguide verdwenen na analyse");
    process.exit(1);
  }

  console.log("\n=== LINFI Brandstyle Rendering-Profiles Summary ===");
  console.log(`status:               ${result.status} / ${result.analysisStatus}`);
  console.log(`primaryFontName:      ${result.primaryFontName ?? "(null)"}`);
  console.log(`layoutStyle:          ${result.layoutStyle} (inferred=${result.layoutStyleInferred})`);
  console.log(`archetype:            ${result.archetype ?? "(null)"}`);
  console.log(`colors (top 5):       ${result.colors.map((c) => `${c.hex}[${c.category}]`).join(", ")}`);

  function summarizeJson(label: string, value: unknown): void {
    if (value === null || value === undefined) {
      console.log(`${label.padEnd(22)}(null)`);
      return;
    }
    const json = JSON.stringify(value);
    const preview = json.length > 200 ? json.slice(0, 200) + "…" : json;
    console.log(`${label.padEnd(22)}${preview}`);
  }

  summarizeJson("buttonProfile:", result.buttonProfile);
  summarizeJson("typographyProfile:", result.typographyProfile);
  summarizeJson("spacingProfile:", result.spacingProfile);
  summarizeJson("elevationProfile:", result.elevationProfile);
  summarizeJson("radiusProfile:", result.radiusProfile);
  summarizeJson("motionProfile:", result.motionProfile);
  summarizeJson("photographyStyle:", result.photographyStyle);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[rescrape] Crashed:", err);
  process.exit(1);
});
