/**
 * Brand-analyzer re-run voor een workspace (designbibliotheek-verbeterplan W5).
 *
 * Default = REFRESH (niet-destructief): hergebruikt het bestaande
 * BrandStyleguide-record en laat de analysis-engine partial-upserten —
 * user-edits met *Override-flags, reviews en snapshots blijven bewaard.
 *
 * `--hard` = het oude destructieve pad: DELETE styleguide + cascade
 * (colors/fonts/components/reviews/rules) en bouw opnieuw op. Alleen
 * gebruiken wanneer het record zelf corrupt is.
 *
 * Run: npx tsx scripts/rescrape-brand.ts <workspaceNameContains|workspaceId> [--hard]
 *
 * 2026-08-20: twee blokkades weggenomen die een prod-re-analyse onmogelijk
 * maakten. (1) `Workspace.websiteUrl` is op productie voor bijna elk merk
 * `null`, terwijl de URL wél in `BrandStyleguide.sourceUrl` staat — daar wordt
 * nu op teruggevallen. (2) Drie workspaces heten "better brands"; `findFirst`
 * op naam pakte er willekeurig één. Een argument dat op `cm` begint en geen
 * spaties bevat, wordt daarom als workspace-ID gelezen.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { prisma } from "../src/lib/prisma";
import { analyzeUrl } from "../src/lib/brandstyle/analysis-engine";

async function main() {
  const args = process.argv.slice(2);
  const hard = args.includes("--hard");
  const arg = args.find((a) => !a.startsWith("--"));
  if (!arg) {
    console.error("Usage: rescrape-brand.ts <workspaceNameContains> [--hard]");
    process.exit(1);
  }
  // Een cuid (bv. cmrrgfox0000009j3vhyjnpea) is eenduidig; een naam niet.
  const lijktOpId = /^c[a-z0-9]{20,}$/i.test(arg);
  const workspace = lijktOpId
    ? await prisma.workspace.findUnique({ where: { id: arg } })
    : await prisma.workspace.findFirst({
        where: { name: { contains: arg, mode: "insensitive" } },
      });
  if (!workspace) {
    console.error(`Workspace met '${arg}' niet gevonden`);
    process.exit(1);
  }
  const existing = await prisma.brandStyleguide.findUnique({
    where: { workspaceId: workspace.id },
    select: { id: true, sourceUrl: true },
  });

  // Val terug op de URL waarmee de styleguide oorspronkelijk is gebouwd.
  // Op productie is `Workspace.websiteUrl` vrijwel overal null.
  const url = workspace.websiteUrl ?? existing?.sourceUrl ?? null;
  console.log(`[rescrape] workspace=${workspace.id} (${workspace.name}) url=${url}` +
    `${workspace.websiteUrl ? "" : " (uit BrandStyleguide.sourceUrl)"}` +
    ` mode=${hard ? "HARD (destructief)" : "refresh"}`);
  if (!url) {
    console.error("Geen URL: noch Workspace.websiteUrl noch BrandStyleguide.sourceUrl is gevuld");
    process.exit(1);
  }

  let styleguideId: string;
  if (existing && !hard) {
    // Refresh-pad: record blijft staan; de engine doet partial-upsert en
    // respecteert *Override-flags. Reviews/snapshots/rules blijven bewaard.
    await prisma.brandStyleguide.update({
      where: { id: existing.id },
      data: {
        status: "ANALYZING",
        analysisStatus: "SCANNING_STRUCTURE",
        analysisJobId: `manual_${Date.now()}`,
        errorMessage: null,
      },
    });
    styleguideId = existing.id;
    console.log(`[rescrape] Refreshing existing styleguide ${styleguideId} (edits/reviews behouden)`);
  } else {
    if (existing) {
      console.log(`[rescrape] --hard: removing existing styleguide ${existing.id}…`);
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
        sourceUrl: url,
        analysisStatus: "SCANNING_STRUCTURE",
        analysisJobId: `manual_${Date.now()}`,
        createdById: owner.id,
        workspaceId: workspace.id,
      },
    });
    styleguideId = sg.id;
    console.log(`[rescrape] Created styleguide ${styleguideId}`);
  }

  console.log(`[rescrape] Running analyzeUrl…`);
  const start = Date.now();
  await analyzeUrl(styleguideId, url);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[rescrape] Done in ${elapsed}s`);

  const result = await prisma.brandStyleguide.findUnique({
    where: { id: styleguideId },
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
