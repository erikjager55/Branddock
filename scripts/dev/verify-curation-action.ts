/**
 * Verificatie-harnas voor het actiepad van de curatie-suggestie.
 *
 * De aggregatie kan kloppen terwijl de knop niets doet. Dit harnas bewijst de
 * andere helft: een term uit het voiceguide-bronveld halen laat de bijbehorende
 * `BrandRule` óók echt verdwijnen. Dat is niet vanzelfsprekend — de regel is
 * gesynct, en `/api/brand-rules/[id]` weigert die juist te bewerken; de enige
 * werkende weg loopt via de bron.
 *
 * Draait op een wegwerp-workspace en ruimt zichzelf op.
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/verify-curation-action.ts
 */
import { prisma } from '../../src/lib/prisma';
import { syncVoiceguideToRules } from '../../src/lib/brand-fidelity/brand-rule-sync';

const SUFFIX = `curation-${process.pid}`;
const TERM = 'luxe';

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

async function main(): Promise<void> {
  let organizationId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const org = await prisma.organization.create({
      data: { name: `Curation ${SUFFIX}`, slug: `curation-${SUFFIX}` },
      select: { id: true },
    });
    organizationId = org.id;
    const workspace = await prisma.workspace.create({
      data: {
        name: '__scratch_curation',
        slug: `curation-ws-${SUFFIX}`,
        contentLanguage: 'nl',
        organizationId: org.id,
      },
      select: { id: true },
    });
    workspaceId = workspace.id;

    // Alle drie de bronvelden vullen, niet alleen `wordsWeAvoid`. Anders is de
    // "de andere regels staan er nog"-assertie blind voor het echte gevaar:
    // `syncVoiceguideToRules` wist de wordsWeAvoid- én antiPatterns-stream
    // onvoorwaardelijk, dus een aanroep met een half payload sloopt de rest.
    await prisma.brandVoiceguide.create({
      data: {
        workspaceId: workspace.id,
        wordsWeAvoid: [TERM, 'premium', 'exclusief'],
        antiPatterns: ['jouw droomvloerluik'],
        vocabularyDont: ['synergie'],
      },
    });

    console.log('\n1. Sync vanuit de voiceguide');
    await syncVoiceguideToRules(workspace.id, {
      wordsWeAvoid: [TERM, 'premium', 'exclusief'],
      antiPatterns: ['jouw droomvloerluik'],
      vocabularyDont: ['synergie'],
    });
    const before = await prisma.brandRule.findMany({
      where: { workspaceId: workspace.id },
      select: { pattern: true, source: true },
    });
    assert(
      `de term "${TERM}" heeft een regel opgeleverd`,
      before.some((r) => r.pattern === TERM),
      before.map((r) => r.pattern).join(', '),
    );
    assert(
      'en die regel is auto-synced (dus niet direct bewerkbaar)',
      before.find((r) => r.pattern === TERM)?.source.startsWith('auto:') === true,
    );

    const premiumVoor = (
      await prisma.brandRule.findFirst({
        where: { workspaceId: workspace.id, pattern: 'premium' },
        select: { createdAt: true },
      })
    )?.createdAt;

    console.log('\n2. De curatie-actie: term uit het bronveld halen');
    const vg = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId: workspace.id },
      select: { wordsWeAvoid: true, antiPatterns: true, vocabularyDont: true, vocabularySavedForAi: true },
    });
    const next = (vg?.wordsWeAvoid ?? []).filter(
      (w) => w.trim().toLowerCase() !== TERM,
    );
    await prisma.brandVoiceguide.update({
      where: { workspaceId: workspace.id },
      data: { wordsWeAvoid: next },
    });
    // Exact het payload dat `PATCH /api/brandvoiceguide` doorgeeft: álle vier de
    // velden. `syncVoiceguideToRules` wist de wordsWeAvoid- én
    // antiPatterns-stream onvoorwaardelijk, dus een half payload sloopt de rest
    // — en dát is precies wat de assertie hieronder bewaakt.
    await syncVoiceguideToRules(workspace.id, {
      wordsWeAvoid: next,
      antiPatterns: vg?.antiPatterns ?? [],
      vocabularyDont: vg?.vocabularyDont ?? [],
      vocabularySavedForAi: vg?.vocabularySavedForAi ?? undefined,
    });

    const after = await prisma.brandRule.findMany({
      where: { workspaceId: workspace.id },
      select: { pattern: true },
    });
    assert(
      `de regel voor "${TERM}" is weg`,
      !after.some((r) => r.pattern === TERM),
      after.map((r) => r.pattern).join(', '),
    );
    assert(
      'de andere avoid-woorden staan er nog',
      after.some((r) => r.pattern === 'premium') && after.some((r) => r.pattern === 'exclusief'),
      `nu: ${after.map((r) => r.pattern).join(', ')}`,
    );
    assert(
      'en de andere lanes zijn niet meegesloopt',
      after.some((r) => r.pattern === 'jouw droomvloerluik') &&
        after.some((r) => r.pattern === 'synergie'),
      `antiPatterns/vocabularyDont weg? nu: ${after.map((r) => r.pattern).join(', ')}`,
    );
    // De aanmaakdatum moet de vervanging overleven, anders is `createdAt` als
    // leeftijd waardeloos en kan de curatie-loop een verse regel niet van een
    // oude onderscheiden (changelog #467).
    const premiumNa = await prisma.brandRule.findFirst({
      where: { workspaceId: workspace.id, pattern: 'premium' },
      select: { createdAt: true },
    });
    assert(
      'de aanmaakdatum overleeft de delete+create van de sync',
      premiumNa != null && premiumVoor != null &&
        Math.abs(premiumNa.createdAt.getTime() - premiumVoor.getTime()) < 1000,
      `voor: ${premiumVoor?.toISOString()} na: ${premiumNa?.createdAt.toISOString()}`,
    );

    assert(
      'de stem-variant van een ander woord bestaat óók als regel',
      after.some((r) => r.pattern === 'exclusieve'),
      'dit is waarom de correctie op de bron-term moet werken, niet op het pattern',
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
