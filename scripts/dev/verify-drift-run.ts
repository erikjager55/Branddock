/**
 * Verificatie-harnas: draait een ECHTE URL-analyse en controleert dat de
 * driftreset in fase 6 daadwerkelijk vuurt.
 *
 * Waarom dit naast de DB-smoke bestaat: die test `resetReviewsAfterSnapshot`
 * in isolatie. Wat hij niet aantoont is dat de analyse-engine de functie
 * überhaupt aanroept en dat de analyse er niet op stukloopt. Les uit
 * gotchas.md (2026-07-12): een wijziging aan een laag die prompts/analyses
 * voedt is pas bewezen na een echte run van díe laag.
 *
 * Opzet: een wegwerp-workspace met een echte site-URL, een *synthetische*
 * oudere snapshot met een afwijkende primary, en dan de echte analyse. De
 * verse snapshot verschilt daardoor gegarandeerd van de vorige, dus de
 * driftreset hoort te vuren. Ruimt zichzelf op.
 *
 * Kost één volledige scrape + AI-analyse.
 *
 * Run: DATABASE_URL=... ANTHROPIC_API_KEY=... npx tsx scripts/dev/verify-drift-run.ts [url]
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { analyzeUrl } from '../../src/lib/brandstyle/analysis-engine';

const URL_TO_ANALYSE = process.argv[2] ?? 'https://www.dtsede.nl';
const SUFFIX = `driftrun-${process.pid}`;

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error('Geen User in de database');

  let organizationId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const org = await prisma.organization.create({
      data: { name: `Driftrun ${SUFFIX}`, slug: `driftrun-${SUFFIX}` },
      select: { id: true },
    });
    organizationId = org.id;
    const workspace = await prisma.workspace.create({
      data: {
        name: '__scratch_driftrun',
        slug: `driftrun-ws-${SUFFIX}`,
        contentLanguage: 'nl',
        organizationId: org.id,
        websiteUrl: URL_TO_ANALYSE,
      },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const styleguide = await prisma.brandStyleguide.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        sourceType: 'URL',
        sourceUrl: URL_TO_ANALYSE,
        status: 'ANALYZING',
        published: true,
      },
      select: { id: true },
    });

    // Synthetische "voor"-snapshot met een afwijkende primary, zodat de verse
    // analyse gegarandeerd een andere hash oplevert en de drift echt vuurt.
    await prisma.brandstyleSnapshot.create({
      data: {
        brandstyleId: styleguide.id,
        workspaceId: workspace.id,
        capturedAt: new Date('2020-01-01T00:00:00.000Z'),
        tokensHash: 'synthetic-before',
        tokensJson: {
          meta: { name: 'Before' },
          colors: { primary: { value: '#123456', role: 'primary' } },
          typography: {},
          rounded: {},
          spacing: {},
          elevation: {},
          components: {},
          prose: {},
          extensions: {},
        } as unknown as Prisma.InputJsonValue,
        scrapedJson: { logoUrls: ['https://example.test/old-logo.svg'] } as unknown as Prisma.InputJsonValue,
        triggerSource: 'manual',
      },
    });

    await prisma.styleguideReview.createMany({
      data: [
        { styleguideId: styleguide.id, workspaceId: workspace.id, section: 'colors-brand', status: 'APPROVED' },
        { styleguideId: styleguide.id, workspaceId: workspace.id, section: 'brand-assets-logos', status: 'APPROVED' },
        { styleguideId: styleguide.id, workspaceId: workspace.id, section: 'spacing-scale', status: 'APPROVED' },
      ],
    });

    console.log(`\nEchte analyse van ${URL_TO_ANALYSE} …\n`);
    await analyzeUrl(styleguide.id, URL_TO_ANALYSE);

    const [reviews, sg, snapshots] = await Promise.all([
      prisma.styleguideReview.findMany({
        where: { styleguideId: styleguide.id },
        select: { section: true, status: true, staleAt: true },
        orderBy: { section: 'asc' },
      }),
      prisma.brandStyleguide.findUnique({
        where: { id: styleguide.id },
        select: { published: true, status: true },
      }),
      prisma.brandstyleSnapshot.count({ where: { brandstyleId: styleguide.id } }),
    ]);

    console.log(`\nAnalyse-status: ${sg?.status} · published: ${sg?.published} · snapshots: ${snapshots}`);
    console.log('Reviews na de analyse:');
    for (const r of reviews) {
      console.log(`  ${r.section.padEnd(22)} ${r.status.padEnd(10)} stale=${r.staleAt ? 'ja' : 'nee'}`);
    }

    const reset = reviews.filter((r) => r.staleAt !== null);
    console.log(
      reset.length > 0
        ? `\n✓ Driftreset gevuurd via de echte analyse-keten (${reset.length} sectie(s)).`
        : '\n✗ Geen enkele reset — controleer of fase 6 een nieuwe snapshot schreef.',
    );
    console.log(
      sg?.published === true
        ? '✓ published ongewijzigd gebleven.'
        : '✗ published is veranderd — dat hoort niet.',
    );
  } finally {
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    if (organizationId)
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
    console.log('\nScratch-workspace opgeruimd.');
  }
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
