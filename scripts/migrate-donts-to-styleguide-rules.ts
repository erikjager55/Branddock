/**
 * Eenmalige migratie (designbibliotheek-verbeterplan W2): importeer de
 * legacy *Donts-stringvelden van elke BrandStyleguide als gestructureerde
 * StyleguideRule-records (kind DONT, severity ADVISORY, source per
 * OBSERVED/RECOMMENDED-marker).
 *
 * Idempotent: workspaces die al rules hebben worden overgeslagen —
 * draai dus vóór er handmatig regels zijn toegevoegd, of accepteer skip.
 *
 * Run (lokaal): npx tsx scripts/migrate-donts-to-styleguide-rules.ts
 */
import { prisma } from '../src/lib/prisma';
import { stripAnalyzerMarkers } from '../src/lib/brandstyle/analyzer-markers';

const DONT_FIELDS = [
  { field: 'colorDonts', section: 'colors' },
  { field: 'logoDonts', section: 'logo' },
  { field: 'imageryDonts', section: 'imagery' },
  { field: 'iconographyDonts', section: 'design-language' },
  { field: 'graphicElementsDonts', section: 'design-language' },
] as const;

async function main() {
  const styleguides = await prisma.brandStyleguide.findMany({
    select: {
      id: true,
      workspaceId: true,
      colorDonts: true,
      logoDonts: true,
      imageryDonts: true,
      iconographyDonts: true,
      graphicElementsDonts: true,
      _count: { select: { rules: true } },
    },
  });

  let created = 0;
  let skipped = 0;
  for (const sg of styleguides) {
    if (sg._count.rules > 0) {
      skipped++;
      continue;
    }
    const rows: Array<{
      styleguideId: string;
      section: string;
      kind: 'DONT';
      severity: 'ADVISORY';
      source: string;
      title: string;
    }> = [];
    for (const { field, section } of DONT_FIELDS) {
      for (const raw of sg[field] ?? []) {
        const title = stripAnalyzerMarkers(raw);
        if (!title) continue;
        rows.push({
          styleguideId: sg.id,
          section,
          kind: 'DONT',
          severity: 'ADVISORY',
          source: /^\s*recommended:/i.test(raw) ? 'recommended' : 'scraped',
          title,
        });
      }
    }
    if (rows.length > 0) {
      await prisma.styleguideRule.createMany({ data: rows });
      created += rows.length;
      console.log(`workspace ${sg.workspaceId}: ${rows.length} rules`);
    }
  }
  console.log(`\nDone: ${created} rules created, ${skipped} styleguides skipped (already had rules).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
