/**
 * DB-smoke voor de review-driftreset (W5).
 *
 * Bouwt een eigen scratch-organisatie + workspace + styleguide met reviews en
 * twee snapshots, en verifieert wat er ná een re-analyse met die reviews
 * gebeurt: alleen de gewijzigde secties verliezen hun goedkeuring, NEEDS_WORK
 * en `published` blijven ongemoeid, en een cosmetische wijziging trekt niets in.
 *
 * Hermetisch — raakt geen bestaande workspace aan en ruimt zichzelf op, ook bij
 * een fout.
 *
 * Run: DATABASE_URL=postgresql://... npx tsx scripts/smoke-tests/review-drift-reset.ts
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { resetReviewsAfterSnapshot } from '../../src/lib/brandstyle/review-drift-store';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

const SUFFIX = `drift-${process.pid}`;

/** Minimaal canonical model dat `computeSnapshotDiff` kan lezen. */
function tokensJson(primary: string, surface = '#FFFFFF'): Prisma.InputJsonValue {
  return {
    meta: { name: 'Scratch', generatedAt: '2026-08-14T00:00:00.000Z' },
    colors: {
      primary: { value: primary, role: 'primary' },
      surface: { value: surface, role: 'surface' },
    },
    typography: {},
    rounded: {},
    spacing: {},
    elevation: {},
    components: {},
    prose: {},
    extensions: {},
  } as unknown as Prisma.InputJsonValue;
}

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    console.error('Geen enkele User in de database — smoke kan geen styleguide aanmaken.');
    process.exit(1);
  }

  let organizationId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const org = await prisma.organization.create({
      data: { name: `Drift ${SUFFIX}`, slug: `drift-${SUFFIX}` },
      select: { id: true },
    });
    organizationId = org.id;
    const workspace = await prisma.workspace.create({
      data: {
        name: `__scratch_drift`,
        slug: `drift-ws-${SUFFIX}`,
        contentLanguage: 'nl',
        organizationId: org.id,
      },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const styleguide = await prisma.brandStyleguide.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        sourceType: 'URL',
        status: 'COMPLETE',
        published: true,
      },
      select: { id: true },
    });

    const seedReviews = async () => {
      await prisma.styleguideReview.deleteMany({ where: { styleguideId: styleguide.id } });
      await prisma.styleguideReview.createMany({
        data: [
          { styleguideId: styleguide.id, workspaceId: workspace.id, section: 'colors-brand', status: 'APPROVED' },
          { styleguideId: styleguide.id, workspaceId: workspace.id, section: 'colors-neutrals', status: 'APPROVED' },
          { styleguideId: styleguide.id, workspaceId: workspace.id, section: 'spacing-scale', status: 'APPROVED' },
          { styleguideId: styleguide.id, workspaceId: workspace.id, section: 'system-roles', status: 'APPROVED' },
          {
            styleguideId: styleguide.id,
            workspaceId: workspace.id,
            section: 'brand-assets-fonts',
            status: 'NEEDS_WORK',
            feedback: 'Body-font klopt niet',
          },
        ],
      });
    };

    const snapshot = async (
      capturedAt: string,
      primary: string,
      logoUrls: string[],
      surface = '#FFFFFF',
    ) =>
      prisma.brandstyleSnapshot.create({
        data: {
          brandstyleId: styleguide.id,
          workspaceId: workspace.id,
          capturedAt: new Date(capturedAt),
          tokensHash: `${primary}-${logoUrls.join('|')}-${surface}`,
          tokensJson: tokensJson(primary, surface),
          scrapedJson: { logoUrls } as unknown as Prisma.InputJsonValue,
          triggerSource: 'analyze-url',
        },
        select: { id: true },
      });

    const statuses = async () => {
      const rows = await prisma.styleguideReview.findMany({
        where: { styleguideId: styleguide.id },
        select: { section: true, status: true, staleAt: true, feedback: true },
      });
      return new Map(rows.map((r) => [r.section, r]));
    };

    // ── 1. Echte kleurwijziging ─────────────────────
    console.log('\n1. Niet-cosmetische kleurwijziging');

    await seedReviews();
    await snapshot('2026-08-01T00:00:00.000Z', '#0060A0', ['a.svg']);
    const s2 = await snapshot('2026-08-02T00:00:00.000Z', '#FF0000', ['a.svg']);

    const first = await resetReviewsAfterSnapshot(styleguide.id, s2.id);
    let map = await statuses();

    assert('colors-brand is ingetrokken', map.get('colors-brand')?.status === 'PENDING');
    assert('colors-brand draagt een staleAt-stempel', map.get('colors-brand')?.staleAt !== null);
    assert(
      'system-roles is ingetrokken (rol-toewijzing opnieuw afgeleid)',
      map.get('system-roles')?.status === 'PENDING',
    );
    assert(
      'colors-neutrals blijft goedgekeurd — surface veranderde niet',
      map.get('colors-neutrals')?.status === 'APPROVED',
    );
    assert(
      'spacing-scale blijft goedgekeurd',
      map.get('spacing-scale')?.status === 'APPROVED',
    );
    assert(
      'NEEDS_WORK blijft staan, inclusief feedback',
      map.get('brand-assets-fonts')?.status === 'NEEDS_WORK' &&
        map.get('brand-assets-fonts')?.feedback === 'Body-font klopt niet',
    );
    assert('twee goedkeuringen ingetrokken', first.reset === 2, `${first.reset}`);

    const sg = await prisma.brandStyleguide.findUnique({
      where: { id: styleguide.id },
      select: { published: true },
    });
    assert(
      'published blijft true — de merkcontext valt niet stil',
      sg?.published === true,
      'bewuste asymmetrie met een handmatige "needs work"',
    );

    // ── 2. Idempotent ───────────────────────────────
    console.log('\n2. Herhaalde run');

    const second = await resetReviewsAfterSnapshot(styleguide.id, s2.id);
    assert('tweede run trekt niets meer in', second.reset === 0, `${second.reset}`);

    // ── 3. Cosmetische wijziging ────────────────────
    console.log('\n3. Cosmetische wijziging');

    await seedReviews();
    const s3 = await snapshot('2026-08-03T00:00:00.000Z', '#FF0001', ['a.svg']);
    const cosmetic = await resetReviewsAfterSnapshot(styleguide.id, s3.id);
    map = await statuses();
    assert(
      'RGB-afstand < 3 trekt niets in',
      cosmetic.reset === 0 && map.get('colors-brand')?.status === 'APPROVED',
      `reset=${cosmetic.reset}`,
    );

    // ── 4. Logo-wijziging ───────────────────────────
    console.log('\n4. Logo-wijziging');

    await seedReviews();
    await prisma.styleguideReview.create({
      data: {
        styleguideId: styleguide.id,
        workspaceId: workspace.id,
        section: 'brand-assets-logos',
        status: 'APPROVED',
      },
    });
    const s4 = await snapshot('2026-08-04T00:00:00.000Z', '#FF0001', ['a.svg', 'b.svg']);
    const logoRun = await resetReviewsAfterSnapshot(styleguide.id, s4.id);
    map = await statuses();
    assert(
      'brand-assets-logos is ingetrokken',
      map.get('brand-assets-logos')?.status === 'PENDING',
    );
    assert(
      'een logo-wijziging raakt de kleuren niet',
      map.get('colors-brand')?.status === 'APPROVED',
      `reset=${logoRun.reset}`,
    );

    // ── 5. Eerste analyse ───────────────────────────
    console.log('\n5. Eerste analyse (geen vorige snapshot)');

    // De oudste snapshot heeft per definitie geen voorganger — dat is de
    // situatie van een eerste analyse.
    const oldest = await prisma.brandstyleSnapshot.findFirst({
      where: { brandstyleId: styleguide.id },
      orderBy: { capturedAt: 'asc' },
      select: { id: true },
    });
    await seedReviews();
    const firstRun = await resetReviewsAfterSnapshot(styleguide.id, oldest!.id);
    map = await statuses();
    assert(
      'zonder eerdere snapshot wordt niets ingetrokken',
      firstRun.reset === 0 && map.get('colors-brand')?.status === 'APPROVED',
      'een eerste analyse mag nooit een goedkeuring intrekken',
    );

    // ── 6. Onbekende snapshot ───────────────────────
    console.log('\n6. Onbekende snapshot');

    const unknown = await resetReviewsAfterSnapshot(styleguide.id, 'bestaat-niet');
    assert('onbekende snapshot-id is een veilige no-op', unknown.reset === 0);

  } finally {
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    if (organizationId)
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
