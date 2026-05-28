/**
 * Generieke volledige brand-analyzer re-run voor een workspace.
 *
 * Workflow:
 *   1. Lokaliseer workspace (op naam) + bestaande BrandStyleguide
 *   2. DELETE styleguide + cascade colors/fonts/components/reviews
 *   3. Roep analyzeUrl aan voor verse rendering-profiles + components
 *   4. Print summary
 *
 * DESTRUCTIEF — alle reviews / approvals / handmatige edits gaan verloren.
 *
 * Run: npx tsx scripts/rescrape-brand.ts <workspaceNameContains>
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { prisma } from "../src/lib/prisma";
import { analyzeUrl } from "../src/lib/brandstyle/analysis-engine";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: rescrape-brand.ts <workspaceNameContains>");
    process.exit(1);
  }
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: arg, mode: "insensitive" } },
  });
  if (!workspace) {
    console.error(`Workspace met '${arg}' niet gevonden`);
    process.exit(1);
  }
  console.log(`[rescrape] workspace=${workspace.id} (${workspace.name}) url=${workspace.websiteUrl}`);
  if (!workspace.websiteUrl) {
    console.error("Workspace heeft geen websiteUrl");
    process.exit(1);
  }

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

  // createdById fallback chain
  let owner = await prisma.user.findFirst({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });
  if (!owner) {
    const member = await prisma.organizationMember.findFirst({
      where: { organization: { workspaces: { some: { id: workspace.id } } } },
      select: { userId: true },
    });
    if (member?.userId) owner = { id: member.userId };
  }
  if (!owner) owner = await prisma.user.findFirst({ select: { id: true } });
  if (!owner) { console.error("Geen user gevonden"); process.exit(1); }
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

  const result = await prisma.brandStyleguide.findUnique({
    where: { id: sg.id },
    select: {
      status: true, analysisStatus: true, primaryFontName: true,
      layoutStyle: true, layoutStyleInferred: true, archetype: true,
      colors: { take: 5, orderBy: { sortOrder: "asc" }, select: { hex: true, category: true } },
      components: { select: { type: true } },
    },
  });
  if (!result) { console.error("Styleguide verdwenen"); process.exit(1); }
  console.log(`\n=== ${workspace.name} Summary ===`);
  console.log(`status:        ${result.status} / ${result.analysisStatus}`);
  console.log(`primaryFont:   ${result.primaryFontName ?? "(null)"}`);
  console.log(`layoutStyle:   ${result.layoutStyle}`);
  console.log(`archetype:     ${result.archetype ?? "(null)"}`);
  console.log(`colors:        ${result.colors.map((c) => `${c.hex}[${c.category}]`).join(", ")}`);
  const compTypes = result.components.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);
  console.log(`components:    ${Object.entries(compTypes).map(([k,v]) => `${k}×${v}`).join(", ")}`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error("[rescrape] Crashed:", err); process.exit(1); });
