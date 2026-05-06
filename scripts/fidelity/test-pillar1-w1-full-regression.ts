/**
 * scripts/fidelity/test-pillar1-w1-full-regression.ts
 *
 * W-1-full algo regression — quantifies the impact of adding semantic
 * voice-similarity (cosine on BrandVoiceguide.centroidEmbedding) to F-VAL
 * Pijler 1 alongside the existing string-match.
 *
 * Methode:
 *   1. Sample up to N ContentVersions from workspaces that HAVE a voiceguide
 *      centroid (otherwise the test is moot).
 *   2. For each sample, compute:
 *      BEFORE = scoreBrandStyle composite (string-match only, current main)
 *      AFTER  = round((scoreBrandStyle composite + projectSimilarityToScore(cosine)) / 2)
 *   3. Aggregate cosine distribution + score deltas per workspace + global.
 *
 * PASS criterion is NOT "delta < 5" (that's for data-source swaps where we
 * expect near-zero divergence). For an algo switch, PASS means:
 *   - all cosine similarities are in plausible range (0.4 - 1.0)
 *   - no embed errors
 *   - workspace-level mean |delta| reported, no hard threshold
 *
 * Output:
 *   - Console summary (cosine min/max/mean/p50/p95, score delta dist)
 *   - Markdown report → research/fidelity-week1/reports/pillar1-w1-full-regression-report.md
 *   - Exit 0 if no embed errors and ≥10 comparable samples, else 1
 *
 * Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *     scripts/fidelity/test-pillar1-w1-full-regression.ts [--limit=100]
 *
 * Cost: ~$0.01 per 100 samples (text-embedding-3-small @ $0.02/1M tokens).
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// ─── Config ─────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const SAMPLE_LIMIT = limitArg ? Math.max(1, parseInt(limitArg, 10) || 100) : 100;
const MIN_TEXT_CHARS = 30;
const MIN_COMPARABLE_FOR_VERDICT = 10;

// ─── Inline shape mirrors ───────────────────────────

interface PersonalityTraitInput {
  name?: string;
  description?: string;
  weAreThis?: string;
  butNeverThat?: string;
}

interface BrandPersonalityInput {
  personalityTraits?: PersonalityTraitInput[];
  wordsWeUse?: string[];
  brandVoiceDescription?: string;
}

// ─── Helpers ────────────────────────────────────────

function extractText(snapshot: unknown): string {
  if (!snapshot) return '';
  if (typeof snapshot === 'string') return snapshot;
  if (typeof snapshot === 'object') {
    const obj = snapshot as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.content === 'string') return obj.content;
    if (typeof obj.html === 'string') return obj.html.replace(/<[^>]+>/g, '');
    if (typeof obj.markdown === 'string') return obj.markdown;
    return Object.values(obj)
      .filter((v): v is string => typeof v === 'string')
      .join('\n\n');
  }
  return '';
}

async function fetchSignals(workspaceId: string): Promise<BrandPersonalityInput | null> {
  const { prisma } = await import('../../src/lib/prisma');
  const [voiceguide, asset] = await Promise.all([
    prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: { wordsWeUse: true, voiceDescription: true },
    }),
    prisma.brandAsset.findFirst({
      where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
      select: { frameworkData: true },
    }),
  ]);

  const data = (asset?.frameworkData ?? null) as Record<string, unknown> | null;
  let wordsWeUse: string[] = [];
  let brandVoiceDescription: string | undefined;

  if (voiceguide && (voiceguide.wordsWeUse?.length || voiceguide.voiceDescription)) {
    wordsWeUse = (voiceguide.wordsWeUse ?? []).filter((w): w is string => typeof w === 'string');
    brandVoiceDescription =
      typeof voiceguide.voiceDescription === 'string' && voiceguide.voiceDescription.length > 0
        ? voiceguide.voiceDescription
        : undefined;
  } else if (data) {
    if (Array.isArray(data.wordsWeUse)) {
      wordsWeUse = data.wordsWeUse.filter((w): w is string => typeof w === 'string');
    }
    if (typeof data.brandVoiceDescription === 'string') {
      brandVoiceDescription = data.brandVoiceDescription;
    }
  }

  const traitsRaw = data && Array.isArray(data.personalityTraits) ? data.personalityTraits : [];
  const personalityTraits: PersonalityTraitInput[] = traitsRaw
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      name: typeof t.name === 'string' ? t.name : undefined,
      description: typeof t.description === 'string' ? t.description : undefined,
      weAreThis: typeof t.weAreThis === 'string' ? t.weAreThis : undefined,
      butNeverThat: typeof t.butNeverThat === 'string' ? t.butNeverThat : undefined,
    }));

  if (wordsWeUse.length === 0 && personalityTraits.length === 0) return null;
  return { wordsWeUse, personalityTraits, brandVoiceDescription };
}

// ─── Stats helpers ──────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function fmtNum(n: number, dp = 2): string {
  if (Number.isNaN(n)) return 'n/a';
  return n.toFixed(dp);
}

// ─── Main ───────────────────────────────────────────

interface SampleResult {
  versionId: string;
  workspaceId: string;
  workspaceName: string;
  beforeScore: number | null;
  cosine: number | null;
  semanticScore: number | null;
  afterScore: number | null;
  delta: number | null;
  declaredSignalCount: number;
  wordCount: number;
  error?: string;
}

async function main() {
  console.log('━━━ W-1-full Pillar 1 algo regression ━━━\n');

  const { prisma } = await import('../../src/lib/prisma');
  const { scoreBrandStyle } = await import('../../src/lib/brand-fidelity/style-scorer');
  const {
    fetchVoiceguideCentroid,
    embedContentForVoiceMatch,
    cosineSimilarity,
    projectSimilarityToScore,
  } = await import('../../src/lib/brand-fidelity/voice-similarity');

  // ── Step 1: API key check ─────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    console.error('  ✗ OPENAI_API_KEY missing — embedding calls will fail');
    process.exit(2);
  }
  console.log('Step 1: env OK (OPENAI_API_KEY set)\n');

  // ── Step 2: Find workspaces with both voiceguide centroid AND content ──
  console.log('Step 2: discovering workspaces with voiceguide centroids...');
  type WorkspaceRow = { id: string; name: string };
  const candidateWorkspaces = await prisma.$queryRaw<WorkspaceRow[]>`
    SELECT w.id, w.name
    FROM "Workspace" w
    WHERE EXISTS (
      SELECT 1 FROM "BrandVoiceguide" bvg
      WHERE bvg."workspaceId" = w.id
        AND bvg."centroidEmbedding" IS NOT NULL
    )
    ORDER BY w.name
  `;
  console.log(`  ${candidateWorkspaces.length} workspaces with non-null centroid\n`);

  if (candidateWorkspaces.length === 0) {
    console.log('  ⚠ no workspace has a centroid embedding yet.');
    console.log('  Run /api/brandvoiceguide/recompute-centroid against a workspace first.');
    process.exit(2);
  }

  // ── Step 3: Sample content from BOTH paths (Studio + Canvas) ──
  // Studio writes ContentVersion records; Canvas writes DeliverableComponent
  // records (no ContentVersion until persistence-flow gets wired). Sample
  // both so Canvas-heavy workspaces actually have data to score against.
  console.log(`Step 3: sampling up to ${SAMPLE_LIMIT} pieces of content...`);
  const wsIds = candidateWorkspaces.map((w) => w.id);
  const halfLimit = Math.ceil(SAMPLE_LIMIT / 2);

  const studioVersions = await prisma.contentVersion.findMany({
    where: {
      deliverable: { campaign: { workspaceId: { in: wsIds } } },
    },
    select: {
      id: true,
      contentSnapshot: true,
      deliverable: { select: { campaign: { select: { workspaceId: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: halfLimit,
  });

  const canvasComponents = await prisma.deliverableComponent.findMany({
    where: {
      deliverable: { campaign: { workspaceId: { in: wsIds } } },
      generatedContent: { not: null },
    },
    select: {
      id: true,
      generatedContent: true,
      deliverable: { select: { campaign: { select: { workspaceId: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: halfLimit,
  });

  // Normalize to a uniform shape
  type SampleRow = {
    id: string;
    workspaceId: string;
    text: string;
    source: 'ContentVersion' | 'DeliverableComponent';
  };

  const samples: SampleRow[] = [
    ...studioVersions.map((v) => ({
      id: v.id,
      workspaceId: v.deliverable.campaign.workspaceId,
      text: extractText(v.contentSnapshot),
      source: 'ContentVersion' as const,
    })),
    ...canvasComponents.map((c) => ({
      id: c.id,
      workspaceId: c.deliverable.campaign.workspaceId,
      text: typeof c.generatedContent === 'string' ? c.generatedContent : '',
      source: 'DeliverableComponent' as const,
    })),
  ].slice(0, SAMPLE_LIMIT);

  console.log(`  ${samples.length} samples (${studioVersions.length} ContentVersion + ${canvasComponents.length} DeliverableComponent)\n`);

  if (samples.length === 0) {
    console.log('  ⚠ no content in voiceguide-equipped workspaces (neither path).');
    console.log('  Generate canvas content in those workspaces first.');
    process.exit(2);
  }

  // ── Step 4: Per-workspace cache for signals + centroid ────────
  const wsCache = new Map<
    string,
    { signals: BrandPersonalityInput | null; centroid: number[] | null }
  >();
  const wsName = new Map<string, string>();
  for (const w of candidateWorkspaces) wsName.set(w.id, w.name);

  // ── Step 5: Score each sample ─────────────────────────────────
  console.log(`Step 5: scoring (${samples.length} samples × 1 embedding each = ~$${(samples.length * 0.0001).toFixed(3)})...\n`);
  const results: SampleResult[] = [];
  let progress = 0;
  for (const s of samples) {
    const workspaceId = s.workspaceId;
    const workspaceName = wsName.get(workspaceId) ?? workspaceId;

    const text = s.text;
    if (text.trim().length < MIN_TEXT_CHARS) {
      results.push({
        versionId: s.id,
        workspaceId,
        workspaceName,
        beforeScore: null,
        cosine: null,
        semanticScore: null,
        afterScore: null,
        delta: null,
        declaredSignalCount: 0,
        wordCount: 0,
        error: 'text too short',
      });
      continue;
    }

    let cached = wsCache.get(workspaceId);
    if (!cached) {
      const [signals, centroid] = await Promise.all([
        fetchSignals(workspaceId),
        fetchVoiceguideCentroid(workspaceId),
      ]);
      cached = { signals, centroid };
      wsCache.set(workspaceId, cached);
    }

    const before = scoreBrandStyle(text, cached.signals);
    if (!cached.centroid) {
      results.push({
        versionId: s.id,
        workspaceId,
        workspaceName,
        beforeScore: before.compositeScore,
        cosine: null,
        semanticScore: null,
        afterScore: before.compositeScore,
        delta: 0,
        declaredSignalCount: before.declaredSignalCount,
        wordCount: before.wordCount,
        error: 'no centroid for this workspace',
      });
      continue;
    }

    const queryVector = await embedContentForVoiceMatch(text);
    if (!queryVector) {
      results.push({
        versionId: s.id,
        workspaceId,
        workspaceName,
        beforeScore: before.compositeScore,
        cosine: null,
        semanticScore: null,
        afterScore: before.compositeScore,
        delta: 0,
        declaredSignalCount: before.declaredSignalCount,
        wordCount: before.wordCount,
        error: 'embed failed',
      });
      continue;
    }

    const cosine = cosineSimilarity(queryVector, cached.centroid);
    const semanticScore = projectSimilarityToScore(cosine);

    let afterScore: number;
    const hasStringSignal = before.declaredSignalCount > 0;
    if (hasStringSignal) {
      afterScore = Math.round(before.compositeScore * 0.5 + semanticScore * 0.5);
    } else {
      afterScore = semanticScore;
    }

    results.push({
      versionId: s.id,
      workspaceId,
      workspaceName,
      beforeScore: before.compositeScore,
      cosine,
      semanticScore,
      afterScore,
      delta: afterScore - before.compositeScore,
      declaredSignalCount: before.declaredSignalCount,
      wordCount: before.wordCount,
    });

    progress++;
    if (progress % 10 === 0) {
      console.log(`  ${progress}/${samples.length} processed`);
    }
  }
  console.log(`  done (${progress}/${samples.length})\n`);

  // ── Step 6: Aggregate ────────────────────────────────────────
  const comparable = results.filter((r) => r.cosine !== null && r.delta !== null);
  const skipped = results.length - comparable.length;
  const embedErrors = results.filter((r) => r.error === 'embed failed').length;

  console.log('Step 6: results');
  console.log(`  total samples:    ${results.length}`);
  console.log(`  comparable:       ${comparable.length}`);
  console.log(`  skipped:          ${skipped} (text < ${MIN_TEXT_CHARS} chars / no centroid / embed failed)`);
  console.log(`  embed errors:     ${embedErrors}`);
  console.log();

  if (comparable.length === 0) {
    console.log('━━━ INSUFFICIENT DATA — no comparable samples produced ━━━');
    process.exit(1);
  }

  // Cosine distribution
  const cosines = comparable.map((r) => r.cosine!).sort((a, b) => a - b);
  const semanticScores = comparable.map((r) => r.semanticScore!);
  const beforeScores = comparable.map((r) => r.beforeScore!);
  const afterScores = comparable.map((r) => r.afterScore!);
  const deltas = comparable.map((r) => r.delta!);
  const sortedAbsDeltas = comparable.map((r) => Math.abs(r.delta!)).sort((a, b) => a - b);

  console.log('  Cosine similarity distribution:');
  console.log(`    min:    ${fmtNum(cosines[0], 4)}`);
  console.log(`    p50:    ${fmtNum(percentile(cosines, 50), 4)}`);
  console.log(`    mean:   ${fmtNum(mean(cosines), 4)}`);
  console.log(`    p95:    ${fmtNum(percentile(cosines, 95), 4)}`);
  console.log(`    max:    ${fmtNum(cosines[cosines.length - 1], 4)}`);
  console.log();

  console.log('  Semantic score (cosine→0-100) distribution:');
  const sortedSem = [...semanticScores].sort((a, b) => a - b);
  console.log(`    min/p50/mean/p95/max: ${sortedSem[0]} / ${percentile(sortedSem, 50)} / ${fmtNum(mean(semanticScores), 1)} / ${percentile(sortedSem, 95)} / ${sortedSem[sortedSem.length - 1]}`);
  console.log();

  console.log('  BEFORE (string-match only) vs AFTER (50/50 string + semantic):');
  console.log(`    BEFORE mean:   ${fmtNum(mean(beforeScores), 1)}`);
  console.log(`    AFTER mean:    ${fmtNum(mean(afterScores), 1)}`);
  console.log(`    Δ mean:        ${fmtNum(mean(deltas), 2)} (${mean(deltas) > 0 ? 'AFTER higher' : 'AFTER lower'})`);
  console.log(`    |Δ| mean:      ${fmtNum(mean(sortedAbsDeltas), 2)}`);
  console.log(`    |Δ| p95:       ${fmtNum(percentile(sortedAbsDeltas, 95), 2)}`);
  console.log(`    |Δ| max:       ${fmtNum(sortedAbsDeltas[sortedAbsDeltas.length - 1], 2)}`);
  console.log();

  // Per-workspace breakdown
  const byWs = new Map<string, SampleResult[]>();
  for (const r of comparable) {
    if (!byWs.has(r.workspaceId)) byWs.set(r.workspaceId, []);
    byWs.get(r.workspaceId)!.push(r);
  }
  console.log('  Per workspace:');
  console.log('    ' + 'workspace'.padEnd(28) + 'n'.padStart(5) + ' cosineMean  before→after Δmean');
  console.log('    ' + '─'.repeat(72));
  for (const [wsId, rows] of byWs.entries()) {
    const name = wsName.get(wsId) ?? wsId;
    const cMean = mean(rows.map((r) => r.cosine!));
    const bMean = mean(rows.map((r) => r.beforeScore!));
    const aMean = mean(rows.map((r) => r.afterScore!));
    const dMean = mean(rows.map((r) => r.delta!));
    console.log(
      '    ' +
        name.slice(0, 26).padEnd(28) +
        String(rows.length).padStart(5) +
        '   ' +
        fmtNum(cMean, 4).padStart(7) +
        '   ' +
        fmtNum(bMean, 1).padStart(5) + '→' + fmtNum(aMean, 1).padStart(5) +
        '   ' +
        (dMean >= 0 ? '+' : '') + fmtNum(dMean, 2),
    );
  }
  console.log();

  // ── Step 7: Sanity checks ─────────────────────────────────────
  console.log('Step 7: sanity');
  const minCosine = cosines[0];
  const maxCosine = cosines[cosines.length - 1];
  const checks = [
    {
      label: 'all cosines in [0.3, 1.0]',
      pass: minCosine >= 0.3 && maxCosine <= 1.0,
      detail: `min=${fmtNum(minCosine, 4)} max=${fmtNum(maxCosine, 4)}`,
    },
    {
      label: 'no embed errors',
      pass: embedErrors === 0,
      detail: `${embedErrors} errors`,
    },
    {
      label: `≥${MIN_COMPARABLE_FOR_VERDICT} comparable samples`,
      pass: comparable.length >= MIN_COMPARABLE_FOR_VERDICT,
      detail: `${comparable.length} comparable`,
    },
  ];
  let allPass = true;
  for (const c of checks) {
    const sym = c.pass ? '✓' : '✗';
    console.log(`  ${sym} ${c.label} (${c.detail})`);
    if (!c.pass) allPass = false;
  }
  console.log();

  // ── Step 8: Markdown report ───────────────────────────────────
  const reportPath = resolve(
    process.cwd(),
    'research/fidelity-week1/reports/pillar1-w1-full-regression-report.md',
  );
  mkdirSync(dirname(reportPath), { recursive: true });

  const reportLines: string[] = [];
  reportLines.push(`# W-1-full Pillar 1 algo regression report`);
  reportLines.push('');
  reportLines.push(`Generated: ${new Date().toISOString()}`);
  reportLines.push(`Sample size: ${results.length} (limit ${SAMPLE_LIMIT})`);
  reportLines.push(`Comparable: ${comparable.length}`);
  reportLines.push(`Embed errors: ${embedErrors}`);
  reportLines.push('');
  reportLines.push(`## Cosine distribution`);
  reportLines.push('');
  reportLines.push(`| stat | cosine |`);
  reportLines.push(`|---|---|`);
  reportLines.push(`| min  | ${fmtNum(cosines[0], 4)} |`);
  reportLines.push(`| p50  | ${fmtNum(percentile(cosines, 50), 4)} |`);
  reportLines.push(`| mean | ${fmtNum(mean(cosines), 4)} |`);
  reportLines.push(`| p95  | ${fmtNum(percentile(cosines, 95), 4)} |`);
  reportLines.push(`| max  | ${fmtNum(cosines[cosines.length - 1], 4)} |`);
  reportLines.push('');
  reportLines.push(`## BEFORE vs AFTER`);
  reportLines.push('');
  reportLines.push(`| metric | BEFORE | AFTER | Δ |`);
  reportLines.push(`|---|---|---|---|`);
  reportLines.push(`| mean | ${fmtNum(mean(beforeScores), 1)} | ${fmtNum(mean(afterScores), 1)} | ${fmtNum(mean(deltas), 2)} |`);
  reportLines.push('');
  reportLines.push(`## Per workspace`);
  reportLines.push('');
  reportLines.push(`| workspace | n | cosine mean | BEFORE mean | AFTER mean | Δ mean |`);
  reportLines.push(`|---|---|---|---|---|---|`);
  for (const [wsId, rows] of byWs.entries()) {
    const name = wsName.get(wsId) ?? wsId;
    reportLines.push(
      `| ${name} | ${rows.length} | ${fmtNum(mean(rows.map((r) => r.cosine!)), 4)} | ${fmtNum(mean(rows.map((r) => r.beforeScore!)), 1)} | ${fmtNum(mean(rows.map((r) => r.afterScore!)), 1)} | ${fmtNum(mean(rows.map((r) => r.delta!)), 2)} |`,
    );
  }
  reportLines.push('');
  reportLines.push(`## Verdict`);
  reportLines.push('');
  reportLines.push(allPass ? `**PASS** — algorithm runs cleanly, cosines in plausible range.` : `**FAIL** — see sanity checks.`);

  writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`Report written: ${reportPath}\n`);

  if (allPass) {
    console.log('━━━ PASS — W-1-full algo runs cleanly on this dataset ━━━');
    process.exit(0);
  } else {
    console.log('━━━ FAIL — see ✗ marks above ━━━');
    process.exit(1);
  }
}

main()
  .catch(async (err) => {
    console.error('\n✗ harness crashed:', err instanceof Error ? err.stack : err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../../src/lib/prisma');
    void prisma.$disconnect();
  });
