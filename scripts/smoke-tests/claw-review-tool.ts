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

  console.log('\n=== 3. Workspace-isolation ===\n');
  if (reviewLogIds.length > 0) {
    const otherWs = await prisma.workspace.findFirst({
      where: { id: { not: workspace.id } },
      select: { id: true },
    });
    if (otherWs) {
      const findings = await prisma.brandReviewFinding.findMany({
        where: {
          contentReviewLogId: reviewLogIds[0],
          workspaceId: otherWs.id,
        },
      });
      assert(
        'findings van workspace-A onzichtbaar via workspace-B filter',
        findings.length === 0,
      );
    } else {
      console.log('  ⚠ skipped (geen tweede workspace beschikbaar)');
    }
  } else {
    console.log('  ⚠ skipped (paste-test faalde, geen reviewLogId)');
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
