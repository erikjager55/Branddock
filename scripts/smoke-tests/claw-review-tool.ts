/**
 * Smoke-test voor Δ-1 Surface D — Brand Assistant `review_content` chat-tool.
 *
 * Test direct tegen de tool-execute (geen chat-route, geen Anthropic SDK):
 *  1. Paste-input met fluff-rijke NL-tekst — verifieer score + topFindings
 *  2. Paste-input te kort (<50 chars) — verwacht Zod-validatie-faal
 *  3. Workspace-isolation — review uit workspace A is onzichtbaar voor workspace B
 *  4. URL-input geblokkeerd op private IP — verwacht IngestError → render-friendly error
 *
 * Cleanup: alle ContentReviewLog + BrandReviewFinding rijen die deze run
 * aanmaakt worden via cascade-delete opgeruimd zodra de fixture-workspace
 * wordt gewist; voor een echte BB-workspace persist het in audit-log
 * (90-dagen retention via cron).
 *
 * Run: DATABASE_URL=... ANTHROPIC_API_KEY=... npx tsx scripts/smoke-tests/claw-review-tool.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { analyzeTools } from '../../src/lib/claw/tools/analyze-tools';

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

const FLUFF_TEXT = `In het hart van elke onderneming staat de fundamentele behoefte om zich te onderscheiden in een wereld vol concurrentie. Bij ons staat de klant altijd centraal en streven we ernaar om elke dag het beste van onszelf te geven. Onze kernwaarden zijn passie, kwaliteit en innovatie. Wij geloven dat door samenwerking en synergie de mooiste resultaten worden bereikt. Met meer dan 25 jaar ervaring in de markt bieden wij oplossingen op maat voor elke uitdaging die uw bedrijf tegenkomt.`;

// Tweede fixture-string voor de workspace-isolation test. Andere content
// zorgt dat een toekomstige content-hash dedup (mocht die ooit zonder
// workspace-scoping werken) de tweede review niet stiekem als hergebruik
// van de eerste behandelt — dan zou de assertion `reviewLogId !== first`
// vals positief slagen.
const FLUFF_TEXT_B = `Onze missie is helder: waarde leveren die echt het verschil maakt voor onze klanten. Door innovatieve aanpak en hands-on mentaliteit transformeren we uitdagingen naar duurzame oplossingen. Met een ervaren team van professionals staan we klaar om elke fase van het traject te begeleiden, van strategie tot uitvoering. Excellence is voor ons geen doel maar een dagelijkse standaard waarmee we vertrouwen opbouwen.`;

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY required');
    process.exit(1);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // Pak Better Brands workspace + user voor live F-VAL run.
  const workspace = await prisma.workspace.findFirst({
    where: { slug: 'better-brands' },
    select: { id: true },
  });
  if (!workspace) {
    console.error('Better Brands workspace not found — seed it eerst');
    await prisma.$disconnect();
    process.exit(1);
  }
  const user = await prisma.organizationMember.findFirst({
    where: { organization: { workspaces: { some: { id: workspace.id } } } },
    select: { userId: true },
  });
  if (!user) {
    console.error('No user found for Better Brands org');
    await prisma.$disconnect();
    process.exit(1);
  }

  const tool = analyzeTools.find((t) => t.name === 'review_content');
  if (!tool) {
    console.error('review_content tool not in analyzeTools registry');
    await prisma.$disconnect();
    process.exit(1);
  }

  const ctx = { workspaceId: workspace.id, userId: user.userId };
  const reviewLogIds: string[] = [];

  console.log('\n=== 1. Paste-input — fluff-rijke NL-tekst ===\n');
  try {
    const result = (await tool.execute(
      { sourceType: 'paste', content: FLUFF_TEXT },
      ctx,
    )) as Record<string, unknown>;

    assert('result.clientAction === review_findings_card', result.clientAction === 'review_findings_card');
    assert('result.reviewLogId is non-empty string', typeof result.reviewLogId === 'string' && (result.reviewLogId as string).length > 0);
    assert('result.compositeScore is number', typeof result.compositeScore === 'number');
    assert('result.thresholdMet is boolean', typeof result.thresholdMet === 'boolean');
    assert('result.findingsCount is number', typeof result.findingsCount === 'number');
    assert('result.topFindings is array', Array.isArray(result.topFindings));
    assert('topFindings length ≤ 3', (result.topFindings as unknown[]).length <= 3);

    if (typeof result.reviewLogId === 'string') reviewLogIds.push(result.reviewLogId);

    // Check severity-ranking: HIGH eerst (als er HIGHs zijn)
    const findings = result.topFindings as Array<{ severity: string }>;
    const hasHigh = findings.some((f) => f.severity === 'HIGH');
    if (hasHigh) {
      assert(
        'topFindings sorted HIGH-eerst',
        findings[0]?.severity === 'HIGH',
        `first severity = ${findings[0]?.severity}`,
      );
    }
  } catch (err) {
    fail++;
    console.error('  ✗ paste-test threw:', err instanceof Error ? err.message : String(err));
  }

  console.log('\n=== 2. Paste-input te kort (Zod validation) ===\n');
  try {
    const parsed = tool.inputSchema.safeParse({ sourceType: 'paste', content: 'short' });
    assert('Zod afwijst content < 50 chars', !parsed.success);
  } catch (err) {
    fail++;
    console.error('  ✗ Zod-test threw:', err instanceof Error ? err.message : String(err));
  }

  console.log('\n=== 3. Workspace-isolation (tool-level, niet alleen DB-level) ===\n');
  // Echte test: roep de tool aan met ctx.workspaceId van een ANDERE workspace
  // dan waar de review hoort. De tool moet workspace-A's review niet kunnen
  // lekken in workspace-B. (FK-cascade voorkomt cross-workspace findings al
  // op DB-niveau, maar de tool-execute zelf moet ook workspace-isolatie
  // afdwingen voor toekomstige refactors.)
  if (reviewLogIds.length > 0) {
    // Deterministic ordering — bij seeds met >2 workspaces voorkomt dit
    // dat de "andere" workspace per run varieert (test-flakiness).
    const otherWs = await prisma.workspace.findFirst({
      where: { id: { not: workspace.id } },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const otherUser = otherWs
      ? await prisma.organizationMember.findFirst({
          where: { organization: { workspaces: { some: { id: otherWs.id } } } },
          orderBy: { id: 'asc' },
          select: { userId: true },
        })
      : null;

    if (otherWs && otherUser) {
      // Tool execute met workspace-B context → moet eigen review aanmaken,
      // niet workspace-A's reviewLogId teruggeven. Andere fixture-string om
      // toekomstige content-hash-dedup niet vals positief te laten passen.
      const otherCtx = { workspaceId: otherWs.id, userId: otherUser.userId };
      const result = (await tool.execute(
        { sourceType: 'paste', content: FLUFF_TEXT_B },
        otherCtx,
      )) as Record<string, unknown>;

      assert(
        'tool met andere workspaceId maakt eigen reviewLog (niet hergebruik)',
        typeof result.reviewLogId === 'string' &&
          result.reviewLogId !== reviewLogIds[0],
      );

      // Ook: geen findings van workspace-A zouden via workspace-B context
      // een way-in moeten hebben naar tool-output. We verifiëren door alle
      // returned topFindings tegen de andere reviewLogId te checken.
      if (typeof result.reviewLogId === 'string') {
        const findingsForOther = await prisma.brandReviewFinding.findMany({
          where: { contentReviewLogId: result.reviewLogId },
          select: { workspaceId: true },
        });
        // .every() retourneert vacuously true bij lege array; daarom expliciet
        // op non-empty checken zodat een F-VAL run zonder findings geen stille
        // pass geeft op de isolation-claim. Eén gecombineerde assertion voorkomt
        // dubbele rode regels bij dezelfde root-cause.
        const allBelongToOtherWs =
          findingsForOther.length > 0 &&
          findingsForOther.every((f) => f.workspaceId === otherWs.id);
        assert(
          'otherCtx review levert ≥1 finding én alle findings behoren tot otherWs',
          allBelongToOtherWs,
          findingsForOther.length === 0
            ? 'F-VAL run leverde 0 findings — isolation niet getest'
            : 'er waren findings buiten otherWs.id',
        );
      }
    } else {
      // Loud-fail bij missing 2nd workspace: een silent-skip zou de
      // isolation-guarantee laten rotten. Dev moet de fixture seeden.
      assert(
        'workspace-isolation getest (vereist 2e workspace + user in seed)',
        false,
        'geen tweede workspace+user gevonden — seed een tweede workspace',
      );
    }
  } else {
    assert(
      'workspace-isolation getest (vereist geslaagde test 1)',
      false,
      'paste-test faalde, geen reviewLogId om isolation te testen',
    );
  }

  console.log('\n=== 4. URL-input naar private IP ===\n');
  try {
    const result = (await tool.execute(
      { sourceType: 'url', url: 'http://169.254.169.254/latest/meta-data/' },
      ctx,
    )) as Record<string, unknown>;
    assert(
      'private-IP URL retourneert error-shape',
      result.error !== undefined && result.failureReason === 'ingest_failed',
      `result keys = ${Object.keys(result).join(',')}`,
    );
    assert(
      'error-shape behoudt clientAction marker',
      result.clientAction === 'review_findings_card',
    );
  } catch (err) {
    // Een uncaught throw IS een fail: we willen render-friendly error-shape
    fail++;
    console.error('  ✗ URL-test threw uncaught:', err instanceof Error ? err.message : String(err));
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
