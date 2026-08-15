/**
 * Verificatie-harnas voor de twee nieuwe R4-signalen: token-overrides en
 * review-feedback.
 *
 * Waarom dit bestaat: op de échte data staan beide op nul, en dat is geen
 * toeval maar de beginstand. De `source`-kolom is gisteren aangemaakt met alles
 * op 'scraped', dus een override kan pas ontstaan nadat iemand ná die deploy
 * iets bewerkt. En er is geen enkele StyleguideReview-rij, want `finalize`
 * wist ze.
 *
 * Zonder dit harnas zou ik alleen kunnen aantonen dát de signalen niets tonen.
 * Hier zetten we de staat expliciet en controleren we dat beide asks precies
 * verschijnen zoals bedoeld — inclusief de drempels.
 *
 * Hermetisch: eigen wegwerp-workspace, ruimt zichzelf op.
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/verify-r4-signals.ts
 */
import { prisma } from '../../src/lib/prisma';
import { buildBrandstyleCalibrationReport } from '../../src/lib/brandstyle/calibration-report';
import { reviewFeedbackToCalibrationInput } from '../../src/lib/brandstyle/review-sections';

const SUFFIX = `r4-${process.pid}`;
const MIN_OVERRIDE_RATE = 0.25;
const MIN_OVERRIDES = 3;

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

/**
 * Spiegelt de telling uit de route. Let op de noemer: alleen kleuren mét een
 * `detectorSource` — dus wat de scraper daadwerkelijk extraheerde. Handmatig
 * toegevoegde en geïmporteerde kleuren horen er niet in, anders meldt het
 * signaal "je corrigeerde 100%" op een workspace waar niemand iets corrigeerde.
 */
function overrideSignal(extracted: number, corrected: number) {
  return extracted > 0 && corrected >= MIN_OVERRIDES && corrected / extracted >= MIN_OVERRIDE_RATE
    ? [{ section: 'colors' as const, label: 'extracted colors', overridden: corrected, total: extracted }]
    : [];
}

const EMPTY = {
  colors: [] as { confidence: string | null; category: string }[],
  fonts: [] as { source: string; availability: string; fileUrl: string | null }[],
  logos: [{ variant: 'PRIMARY' }],
  typeScaleCount: 5,
};

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error('Geen User in de database');

  let organizationId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const org = await prisma.organization.create({
      data: { name: `R4 ${SUFFIX}`, slug: `r4-${SUFFIX}` },
      select: { id: true },
    });
    organizationId = org.id;
    const workspace = await prisma.workspace.create({
      data: { name: '__scratch_r4', slug: `r4-ws-${SUFFIX}`, contentLanguage: 'nl', organizationId: org.id },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const styleguide = await prisma.brandStyleguide.create({
      data: { workspaceId: workspace.id, createdById: user.id, sourceType: 'URL', status: 'COMPLETE' },
      select: { id: true },
    });

    // ── 1. Token-overrides ──────────────────────────────
    console.log('\n1. Token-overrides als signaal');

    // 12 geëxtraheerde kleuren (mét detectorSource), waarvan 4 gecorrigeerd,
    // plus 3 handmatig TOEGEVOEGDE kleuren (zonder detectorSource) die níet
    // als correctie mogen tellen — dat is precies het onderscheid dat een
    // review blootlegde.
    for (let i = 0; i < 12; i++) {
      await prisma.styleguideColor.create({
        data: {
          name: `Kleur ${i}`,
          hex: `#0000${i.toString(16).padStart(2, '0')}`,
          category: 'PRIMARY',
          detectorSource: 'css-variable',
          source: i < 4 ? 'user' : 'scraped',
          sortOrder: i,
          styleguideId: styleguide.id,
        },
      });
    }
    for (let i = 0; i < 3; i++) {
      await prisma.styleguideColor.create({
        data: {
          name: `Zelf toegevoegd ${i}`,
          hex: `#ff00${i.toString(16).padStart(2, '0')}`,
          category: 'NEUTRAL',
          source: 'user', // POST zet dit, maar detectorSource blijft leeg
          sortOrder: 100 + i,
          styleguideId: styleguide.id,
        },
      });
    }
    const total = await prisma.styleguideColor.count({
      where: { styleguideId: styleguide.id, detectorSource: { not: null } },
    });
    const overridden = await prisma.styleguideColor.count({
      where: { styleguideId: styleguide.id, detectorSource: { not: null }, source: 'user' },
    });
    assert('4 van de 12 geëxtraheerde kleuren staan op user', total === 12 && overridden === 4);
    assert(
      'de 3 zelf toegevoegde kleuren tellen niet als correctie',
      (await prisma.styleguideColor.count({ where: { styleguideId: styleguide.id, source: 'user' } })) === 7,
      'source=user is 7, maar alleen de 4 met detectorSource zijn correcties',
    );

    const withSignal = buildBrandstyleCalibrationReport({
      ...EMPTY,
      overrideSignals: overrideSignal(total, overridden),
    });
    const ask = withSignal.asks.find((a) => a.id === 'override-colors');
    assert('er verschijnt een override-ask', Boolean(ask));
    assert(
      'de ask noemt de verhouding',
      ask?.title.includes('4 of 12') === true,
      ask?.title,
    );
    assert('en het percentage', ask?.detail.includes('33%') === true, ask?.detail.slice(0, 60));

    assert(
      'onder de drempel verschijnt er niets',
      buildBrandstyleCalibrationReport({ ...EMPTY, overrideSignals: overrideSignal(12, 2) }).asks
        .every((a) => a.id !== 'override-colors'),
      '2 van 12 = 17%, onder de 25%',
    );
    assert(
      'en bij te weinig absolute correcties ook niet',
      buildBrandstyleCalibrationReport({ ...EMPTY, overrideSignals: overrideSignal(4, 2) }).asks
        .every((a) => a.id !== 'override-colors'),
      '2 van 4 = 50%, maar 2 < 3 correcties',
    );

    // ── 2. Review-feedback ──────────────────────────────
    console.log('\n2. Review-feedback als signaal');

    await prisma.styleguideReview.createMany({
      data: [
        {
          styleguideId: styleguide.id,
          workspaceId: workspace.id,
          section: 'colors-brand',
          status: 'NEEDS_WORK',
          feedback: 'De primaire kleur klopt niet, dat is de accentkleur van de oude site.',
        },
        {
          styleguideId: styleguide.id,
          workspaceId: workspace.id,
          section: 'brand-assets-fonts',
          status: 'NEEDS_WORK',
          feedback: null,
        },
        {
          styleguideId: styleguide.id,
          workspaceId: workspace.id,
          section: 'spacing-scale',
          status: 'APPROVED',
          feedback: 'Prima zo, mooi consistent.',
        },
      ],
    });

    const reviews = await prisma.styleguideReview.findMany({
      where: { styleguideId: styleguide.id },
      select: { section: true, status: true, feedback: true },
    });
    const feedbackInput = reviewFeedbackToCalibrationInput(reviews);

    assert(
      'alleen de NEEDS_WORK-review mét tekst telt',
      feedbackInput.length === 1 && feedbackInput[0].key === 'colors-brand',
      `${feedbackInput.length} — NEEDS_WORK zonder tekst en APPROVED mét tekst horen er niet in`,
    );

    const report = buildBrandstyleCalibrationReport({ ...EMPTY, reviewFeedback: feedbackInput });
    const fbAsk = report.asks.find((a) => a.id === 'review-feedback-colors-brand');
    assert('er verschijnt een feedback-ask', Boolean(fbAsk));
    assert(
      'die de tekst van de gebruiker citeert',
      fbAsk?.title.includes('De primaire kleur klopt niet') === true,
      fbAsk?.title,
    );
    assert(
      'en deep-linkt naar de juiste sectie',
      fbAsk?.section === 'colors',
      fbAsk?.section,
    );

    // ── 3. Lege staat ───────────────────────────────────
    console.log('\n3. Zonder signalen blijft het rapport schoon');

    assert(
      'geen overrides en geen feedback levert geen enkele van deze asks op',
      buildBrandstyleCalibrationReport(EMPTY).asks.every(
        (a) => !a.id.startsWith('override-') && !a.id.startsWith('review-feedback-'),
      ),
      'de signalen mogen niets verzinnen wanneer er niets is',
    );
  } finally {
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    if (organizationId)
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
    console.log('\nScratch-workspace opgeruimd.');
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
