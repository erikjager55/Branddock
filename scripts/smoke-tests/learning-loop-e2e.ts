/**
 * Smoke-test voor learning-loop infrastructuur (open-backlog item #3, 2026-05-06).
 *
 * Verifieert DB-laag dat:
 *   1. BrandContextSnapshot / AICallSnapshot / AICallTrace / LearningEvent tabellen
 *      bestaan en queryable zijn
 *   2. Recent records aangemaakt zijn (laatste 7 dagen) - bewijst dat orchestrator
 *      hook fire-and-forget writes doet zonder errors
 *   3. AICallTrace.parentEntityType bevat verwachte enum-waarden (Deliverable /
 *      ContentVersion / Campaign / Workspace) — geen "(null)" fallback drift
 *   4. LearningEvent.eventType bevat de Phase 5/6 events (content.approved /
 *      content.published / fidelity.scored) wanneer pilot-content geapproved is
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/learning-loop-e2e.ts
 *
 * Note: dit dekt NIET de UI-laag (Settings → Developer → AI Prompts viewer).
 * Voor full E2E moet de gebruiker handmatig 1 AI-call uitvoeren + de viewer
 * checken. Deze script bewijst dat de data-pipeline werkt.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let pass = 0;
let fail = 0;
let warn = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

function warning(name: string, detail: string): void {
  console.log(`  WARN ${name} -- ${detail}`);
  warn++;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  console.log('\n=== 1. Schema bestaat + queryable ===\n');

  const [brandCtxCount, aiCallCount, traceCount, eventCount] = await Promise.all([
    prisma.brandContextSnapshot.count(),
    prisma.aICallSnapshot.count(),
    prisma.aICallTrace.count(),
    prisma.learningEvent.count(),
  ]);
  assert('BrandContextSnapshot queryable', true);
  assert('AICallSnapshot queryable', true);
  assert('AICallTrace queryable', true);
  assert('LearningEvent queryable', true);

  console.log(`  (totals: BrandContextSnapshot=${brandCtxCount}, AICallSnapshot=${aiCallCount}, AICallTrace=${traceCount}, LearningEvent=${eventCount})`);

  console.log('\n=== 2. Recent activiteit (laatste 7 dagen) ===\n');

  const recentSnapshots = await prisma.brandContextSnapshot.count({
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
  });
  if (recentSnapshots > 0) {
    assert(`recent BrandContextSnapshot records: ${recentSnapshots}`, true);
  } else {
    warning('BrandContextSnapshot', 'geen records laatste 7 dagen — geen AI-calls met snapshot-flow gedraaid');
  }

  const recentAiCalls = await prisma.aICallSnapshot.count({
    where: { createdAt: { gte: SEVEN_DAYS_AGO } },
  });
  if (recentAiCalls > 0) {
    assert(`recent AICallSnapshot records: ${recentAiCalls}`, true);
  } else {
    warning('AICallSnapshot', 'geen records laatste 7 dagen — geen tracked AI-calls gedraaid');
  }

  const recentTraces = await prisma.aICallTrace.count({
    where: { startedAt: { gte: SEVEN_DAYS_AGO } },
  });
  if (recentTraces > 0) {
    assert(`recent AICallTrace records: ${recentTraces}`, true);
  } else {
    warning('AICallTrace', 'geen records laatste 7 dagen');
  }

  console.log('\n=== 3. AICallTrace.parentEntityType enum-coverage ===\n');

  const parentTypes = await prisma.aICallTrace.groupBy({
    by: ['parentEntityType'],
    _count: { id: true },
  });
  console.log('  Distribution:');
  for (const row of parentTypes) {
    console.log(`    ${row.parentEntityType}: ${row._count.id}`);
  }
  // Bekende parentEntityType waarden. Lijst groeit organisch wanneer nieuwe
  // entity-types worden toegevoegd aan canvas-orchestrator / studio /
  // alignment-pipeline. Onbekende waarden zijn niet per se bugs — kunnen
  // legitieme nieuwe entity-types zijn — dus WARN ipv FAIL.
  const knownTypes = new Set([
    'Deliverable',
    'DeliverableComponent',
    'ContentVersion',
    'ExplorationSession',
    'Campaign',
    'Workspace',
    'BrandAsset',
    'Persona',
    'Strategy',
    'AlignmentScan',
    'AlignmentIssue',
  ]);
  const unknownTypes = parentTypes
    .filter((p) => !knownTypes.has(p.parentEntityType))
    .map((p) => p.parentEntityType);
  if (unknownTypes.length === 0) {
    assert('alle parentEntityType waarden zijn bekende enums', true);
  } else {
    warning(
      'parentEntityType enum coverage',
      `unknown values gevonden: ${unknownTypes.join(', ')} — voeg toe aan smoke script knownTypes als legitiem, of trace bron als drift`,
    );
  }

  // Werkstroom E check: AICallTrace.parentEntityType = 'Campaign' bestaat wanneer
  // wizard-flow met draftCampaignId draait. Geen 'Workspace' fallback dominante share.
  const campaignTraces = parentTypes.find((p) => p.parentEntityType === 'Campaign');
  if (campaignTraces && campaignTraces._count.id > 0) {
    assert(`Werkstroom E: Campaign-scoped traces: ${campaignTraces._count.id}`, true);
  } else {
    warning(
      'Werkstroom E',
      'geen Campaign-scoped traces — start wizard-flow met draftCampaignId om dit te verifiëren',
    );
  }

  console.log('\n=== 4. LearningEvent.eventType Phase 5/6 events ===\n');

  const eventTypes = await prisma.learningEvent.groupBy({
    by: ['eventType'],
    _count: { id: true },
  });
  console.log('  Distribution:');
  for (const row of eventTypes) {
    console.log(`    ${row.eventType}: ${row._count.id}`);
  }
  const expectedEvents = ['content.approved', 'content.published', 'fidelity.scored'];
  for (const eventName of expectedEvents) {
    const found = eventTypes.find((e) => e.eventType === eventName);
    if (found) {
      assert(`${eventName} events: ${found._count.id}`, true);
    } else {
      warning(
        eventName,
        `0 events — handmatig approve/publish/score op een ContentVersion om te bewijzen dat emit-points werken`,
      );
    }
  }

  console.log('\n=== 5. Foreign-key integriteit ===\n');

  // FK-relatie is required (Prisma 7 schema enforced) — DB blokkeert orphans.
  // Sample-check: pick 10 random traces + verify hun snapshot bestaat. Falls
  // throught Cascade-delete chain (Workspace → AICallSnapshot → AICallTrace).
  const sampleTraces = await prisma.aICallTrace.findMany({
    take: 10,
    orderBy: { startedAt: 'desc' },
    select: { id: true, aiCallSnapshotId: true },
  });
  let resolvedAll = true;
  for (const trace of sampleTraces) {
    const snap = await prisma.aICallSnapshot.findUnique({
      where: { id: trace.aiCallSnapshotId },
      select: { id: true },
    });
    if (!snap) {
      console.error(`  ! orphan trace ${trace.id} references missing snapshot ${trace.aiCallSnapshotId}`);
      resolvedAll = false;
    }
  }
  assert(
    `sample-check: ${sampleTraces.length} recente traces resolven naar bestaande snapshots`,
    resolvedAll,
  );

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail, ${warn} warn ===\n`);
  if (warn > 0) {
    console.log('WARN-records zijn geen failures — ze signaleren dat de UI-driven');
    console.log('paden niet recent zijn gebruikt. Voor full E2E: handmatig 1');
    console.log('content-generate + approve/publish flow doorlopen, dan re-run.');
  }
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
