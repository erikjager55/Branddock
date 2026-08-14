/**
 * Genereer/ververs het Brand Manifest voor alle workspaces in één run
 * (designbibliotheek-verbeterplan W1, vervolgactie na db push + donts-migratie).
 *
 * Per BrandStyleguide: deterministische build via manifest-builder,
 * persist met versie-bump. Publiceert NIETS — rapporteert alleen welke
 * styleguides ongepubliceerd zijn (daar bereikt het manifest de
 * AI-context nog niet vanwege de publish-gate).
 *
 * Run: DATABASE_URL=... npx tsx scripts/generate-brand-manifests.ts
 */
import { prisma } from '../src/lib/prisma';
import { buildBrandManifest } from '../src/lib/brandstyle/manifest-builder';

async function main() {
  const styleguides = await prisma.brandStyleguide.findMany({
    include: { colors: true, fonts: true, logos: true, rules: true },
  });
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: styleguides.map((s) => s.workspaceId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(workspaces.map((w) => [w.id, w.name]));

  const unpublished: string[] = [];
  for (const sg of styleguides) {
    const brandName = nameById.get(sg.workspaceId) ?? 'Brand';
    const voiceguide = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId: sg.workspaceId },
    });
    const manifest = buildBrandManifest(sg, voiceguide, brandName);
    await prisma.brandStyleguide.update({
      where: { id: sg.id },
      data: {
        brandManifest: manifest as unknown as object,
        manifestGeneratedAt: new Date(),
        manifestVersion: manifest.manifestVersion,
      },
    });
    const state = sg.published ? 'published' : 'NIET gepubliceerd';
    console.log(
      `${brandName.padEnd(24)} manifest v${manifest.manifestVersion} · ${manifest.hardRules.length} regels · ${manifest.knownGaps.length} gaps · ${state}`,
    );
    if (!sg.published) unpublished.push(brandName);
  }

  console.log(`\nKlaar: ${styleguides.length} manifesten gegenereerd.`);
  if (unpublished.length > 0) {
    console.log(
      `Let op — bij ${unpublished.length} workspace(s) bereikt het manifest de AI-context nog niet (publish-gate): ${unpublished.join(', ')}.\nPubliceer die styleguides in de UI (of via finalize) wanneer ze er klaar voor zijn.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
