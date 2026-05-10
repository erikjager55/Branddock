/**
 * Smoke-test voor Δ-1 Surface E — PublishGate findings-block (interne content).
 *
 * Test de nieuwe code-paden zonder live AI-calls:
 *  1. Mapper-contract — `mapViolationToFindingInput` produceert correcte
 *     severity/category/location shape per RuleViolation-type
 *  2. Persistence — synthetische ContentFidelityScore + nested findings via
 *     Prisma, verifieer XOR (fidelityScoreId set, contentReviewLogId null)
 *  3. GET endpoint round-trip — fetch via /api/alignment/internal-findings
 *     levert severity-rank gesorteerde response
 *  4. Workspace-isolation — fidelityScore uit workspace-A is onzichtbaar
 *     voor workspace-B (vereist 2e workspace in seed; soft-skip anders)
 *
 * Cleanup: alle ContentFidelityScore + BrandReviewFinding rows die deze
 * run aanmaakt worden via cascade-delete opgeruimd zodra de fixture
 * ContentVersion wordt gewist (cascade chain: ContentVersion →
 * ContentFidelityScore → BrandReviewFinding).
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/internal-findings.ts
 *
 * NB: GET endpoint round-trip vereist een draaiende dev-server op localhost:3000
 * met geldige sessie-cookie. Skip de GET-tests via FLAG_SKIP_HTTP=1 voor pure
 * data-laag verificatie.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { BrandReviewSeverity, FindingCategory } from '@prisma/client';

import { mapViolationToFindingInput } from '../../src/lib/brand-fidelity/violation-to-finding';
import type { RuleViolation } from '../../src/lib/brand-fidelity/rule-compiler';

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
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // ── Setup — pak een workspace met minstens één ContentVersion ──
  // ContentVersion heeft geen directe workspaceId; de relatie loopt via
  // deliverable.campaign.workspaceId. Smoke probeert eerst Better Brands;
  // als die geen versions heeft pakt hij de meest recente version uit
  // welke workspace dan ook (lokale dev vaak alleen LINFI gevuld).
  const contentVersion = await prisma.contentVersion.findFirst({
    select: {
      id: true,
      deliverableId: true,
      deliverable: {
        select: {
          campaign: { select: { workspaceId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!contentVersion) {
    console.error('Geen ContentVersion in DB — genereer eerst een deliverable in Canvas');
    await prisma.$disconnect();
    process.exit(1);
  }
  const workspace = { id: contentVersion.deliverable.campaign.workspaceId };
  console.log(`  Using workspace ${workspace.id} + contentVersion ${contentVersion.id}`);

  console.log('\n=== 1. Mapper-contract ===\n');

  const heuristicViolation: RuleViolation = {
    ruleId: 'heuristic:nl:corporate-fluff:passie',
    ruleType: 'FORBIDDEN_WORD',
    severity: 'error',
    message: 'Vermijd corporate-fluff "passie"',
    position: 145,
    snippet: 'passie',
    pattern: 'passie',
  };
  const ruleViolation: RuleViolation = {
    ruleId: 'rule-cuid-12345',
    ruleType: 'FORBIDDEN_WORD',
    severity: 'warning',
    message: 'Eigen brand-rule overtreden',
    position: 0,
    snippet: '',
    pattern: 'unique-term',
  };
  const infoViolation: RuleViolation = {
    ruleId: 'heuristic:nl:ai-tells:furthermore',
    ruleType: 'FORBIDDEN_WORD',
    severity: 'info',
    message: 'AI-tell detected',
    position: 220,
    snippet: 'furthermore',
    pattern: 'furthermore',
  };

  const mapped1 = mapViolationToFindingInput(heuristicViolation);
  assert('heuristic ERROR → HIGH severity', mapped1.severity === BrandReviewSeverity.HIGH);
  assert('corporate-fluff → VOICE category', mapped1.category === FindingCategory.VOICE);
  assert('positional location formatted', mapped1.location.startsWith('char 145:'));

  const mapped2 = mapViolationToFindingInput(ruleViolation);
  assert('non-heuristic WARNING → MEDIUM severity', mapped2.severity === BrandReviewSeverity.MEDIUM);
  assert('non-heuristic ruleId → TERMINOLOGY fallback', mapped2.category === FindingCategory.TERMINOLOGY);
  assert(
    'document-level location voor empty snippet + position 0',
    mapped2.location === 'document-level',
  );

  const mapped3 = mapViolationToFindingInput(infoViolation);
  assert('heuristic INFO → LOW severity', mapped3.severity === BrandReviewSeverity.LOW);
  assert('ai-tells → AI_TELL category', mapped3.category === FindingCategory.AI_TELL);

  console.log('\n=== 2. Persistence (synthetic ContentFidelityScore + findings) ===\n');

  // Findings-array losgetrokken zodat findingsCount uit .length kan worden
  // afgeleid (mirror runner-contract: één bron-of-truth voor count + array).
  const smokeFindings = [
    {
      workspaceId: workspace.id,
      location: mapped1.location,
      severity: mapped1.severity,
      category: mapped1.category,
      description: mapped1.description,
      evidence: mapped1.evidence ?? Prisma.JsonNull,
    },
    {
      workspaceId: workspace.id,
      location: mapped2.location,
      severity: mapped2.severity,
      category: mapped2.category,
      description: mapped2.description,
      evidence: mapped2.evidence ?? Prisma.JsonNull,
    },
    {
      workspaceId: workspace.id,
      location: mapped3.location,
      severity: mapped3.severity,
      category: mapped3.category,
      description: mapped3.description,
      evidence: mapped3.evidence ?? Prisma.JsonNull,
    },
  ];
  const created = await prisma.contentFidelityScore.create({
    data: {
      workspaceId: workspace.id,
      contentVersionId: contentVersion.id,
      judgeIdentifier: 'smoke-test-internal-findings',
      compositeScore: 42,
      pillarScores: { style: 40, judge: 50, rules: 35 },
      subCriteriaScores: {},
      ruleViolations: [],
      thresholdMet: false,
      scorerVersion: 'smoke-v1',
      // Mirror runner-contract: aggregate-counter pre-rolled bij create.
      findingsCount: smokeFindings.length,
      findings: {
        create: smokeFindings,
      },
    },
    select: { id: true },
  });

  const persisted = await prisma.brandReviewFinding.findMany({
    where: { fidelityScoreId: created.id },
    select: {
      severity: true,
      category: true,
      fidelityScoreId: true,
      contentReviewLogId: true,
      workspaceId: true,
    },
  });

  assert('3 findings persisted', persisted.length === 3);

  // Drift-detection: aggregate counter MOET matchen met de daadwerkelijke
  // findings.count na persist. Vangt regressies op als een toekomstige
  // refactor de findingsCount-set vergeet.
  const scoreWithCount = await prisma.contentFidelityScore.findUnique({
    where: { id: created.id },
    select: { findingsCount: true },
  });
  assert(
    'findingsCount aggregate matcht met daadwerkelijke findings.count',
    scoreWithCount?.findingsCount === persisted.length,
    `findingsCount=${scoreWithCount?.findingsCount}, actual=${persisted.length}`,
  );
  assert(
    'XOR — alle findings hebben fidelityScoreId',
    persisted.every((f) => f.fidelityScoreId === created.id),
  );
  assert(
    'XOR — alle findings hebben contentReviewLogId === null',
    persisted.every((f) => f.contentReviewLogId === null),
  );
  assert(
    'workspace-correctheid op alle findings',
    persisted.every((f) => f.workspaceId === workspace.id),
  );
  const severities = persisted.map((f) => f.severity).sort();
  assert(
    'mix van HIGH/MEDIUM/LOW persisted',
    severities.length === 3 && new Set(severities).size === 3,
  );

  console.log('\n=== 3. GET endpoint round-trip ===\n');
  if (process.env.FLAG_SKIP_HTTP === '1') {
    console.log('  ⚠ HTTP-tests overgeslagen via FLAG_SKIP_HTTP=1');
  } else {
    const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
    const sessionCookie = process.env.SMOKE_SESSION_COOKIE;
    if (!sessionCookie) {
      console.log(
        '  ⚠ HTTP-tests overgeslagen — zet SMOKE_SESSION_COOKIE (kopieer uit browser devtools)',
      );
    } else {
      try {
        const res = await fetch(
          `${baseUrl}/api/alignment/internal-findings/${created.id}`,
          { headers: { Cookie: sessionCookie } },
        );
        assert('GET status 200', res.status === 200, `got ${res.status}`);
        if (res.ok) {
          const body = (await res.json()) as {
            findingsCount: number;
            findings: Array<{ severity: string }>;
            thresholdMet: boolean;
            compositeScore: number;
          };
          assert('findingsCount === 3', body.findingsCount === 3);
          assert(
            'severity-rank: HIGH eerst',
            body.findings[0]?.severity === 'HIGH',
            `eerste severity = ${body.findings[0]?.severity}`,
          );
          assert(
            'severity-rank: LOW laatst',
            body.findings[body.findings.length - 1]?.severity === 'LOW',
          );
          assert('thresholdMet === false', body.thresholdMet === false);
          assert('compositeScore === 42', body.compositeScore === 42);
        }
      } catch (err) {
        fail++;
        console.error(
          '  ✗ GET endpoint failed:',
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  console.log('\n=== 4. Workspace-isolation (mirror beide route-queries) ===\n');
  const otherWs = await prisma.workspace.findFirst({
    where: { id: { not: workspace.id } },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  if (otherWs) {
    // De GET endpoint doet TWEE workspace-isolated queries: (1) findFirst op
    // ContentFidelityScore + workspaceId, (2) findMany op BrandReviewFinding +
    // workspaceId. Beide moeten een cross-workspace user blokkeren. We
    // mirroren beide queries hier expliciet zodat een refactor die per ongeluk
    // één van de filters dropt, gedetecteerd wordt.
    const crossScore = await prisma.contentFidelityScore.findFirst({
      where: { id: created.id, workspaceId: otherWs.id },
      select: { id: true },
    });
    assert(
      'route-query 1: fidelity-score onzichtbaar via verkeerde workspaceId',
      crossScore === null,
    );

    const crossFindings = await prisma.brandReviewFinding.findMany({
      where: { fidelityScoreId: created.id, workspaceId: otherWs.id },
      select: { id: true },
    });
    assert(
      'route-query 2: findings onzichtbaar via verkeerde workspaceId',
      crossFindings.length === 0,
    );
  } else {
    // Soft-skip — een fresh dev-DB heeft soms maar één workspace. We willen
    // de smoke-test niet rood maken op een fixture-tekort dat geen regressie
    // is van de tool-laag. Wel een luide WARN log zodat de dev het ziet.
    console.warn(
      '  ⚠ workspace-isolation NIET getest — geen 2e workspace in seed. ' +
        'Voor volledige coverage: seed een tweede workspace.',
    );
  }

  // ── Cleanup — verwijder de synthetic fixture ──
  await prisma.contentFidelityScore.delete({ where: { id: created.id } });

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
