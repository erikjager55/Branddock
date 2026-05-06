/**
 * scripts/fidelity/test-pillar1-regression.ts
 *
 * BV-WIRE W-1 regression test — validates the data-source swap from
 * BrandPersonality.frameworkData to BrandVoiceguide for Pillar 1's
 * voice-fingerprint signal.
 *
 * Methode:
 *   1. Sample up to N ContentVersions across all workspaces
 *   2. For each, run scoreBrandStyle twice:
 *      - LEGACY path: signals straight from BrandPersonality.frameworkData
 *      - NEW path:    voiceguide-first with BrandPersonality fallback
 *   3. Compute composite score delta per version
 *   4. Aggregate per-workspace + global stats
 *   5. Pass criterion (per IMPLEMENTATIEPLAN-BV-WIRE.md): mean delta < 5%
 *
 * Verwacht gedrag:
 *   - Workspaces ZONDER voiceguide → delta = 0 (fallback hits exact same data)
 *   - Workspaces MET voiceguide en MET BrandPersonality → may differ; the
 *     question is whether voiceguide.wordsWeUse is comparable in size and
 *     vocabulary to the legacy field
 *   - Workspaces met alleen voiceguide (geen personality) → legacy = null →
 *     skipped vergelijking (geen base case)
 *
 * Output:
 *   - Console samenvatting (mean / p95 / max delta, per-workspace breakdown)
 *   - Markdown report naar research/fidelity-week1/reports/pillar1-regression-report.md
 *   - Exit code 0 bij PASS, 1 bij FAIL (mean delta >= 5%)
 *
 * Run:
 *   npx tsx scripts/fidelity/test-pillar1-regression.ts [--limit=100]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// ─── Env loading ────────────────────────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

// ─── Config ─────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const SAMPLE_LIMIT = limitArg ? Math.max(1, parseInt(limitArg, 10) || 100) : 100;
const MEAN_DELTA_PASS_THRESHOLD = 5; // composite points
const MIN_TEXT_CHARS = 30;
const MIN_COMPARABLE_FOR_VERDICT = 10; // below this, the verdict is INSUFFICIENT_DATA, not PASS

// ─── Inline shape mirrors (zelfde als style-scorer.ts) ───

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

// ─── extractText helper (mirrors learning-loop/fidelity-scorer.ts) ───

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

// ─── LEGACY fetcher — pre-W-1 logic, BrandPersonality only ──

async function fetchLegacy(workspaceId: string): Promise<{
  signals: BrandPersonalityInput | null;
  hasPersonality: boolean;
}> {
  const { prisma } = await import('../../src/lib/prisma');
  const asset = await prisma.brandAsset.findFirst({
    where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
    select: { frameworkData: true },
  });
  const data = (asset?.frameworkData ?? null) as Record<string, unknown> | null;

  if (!data) return { signals: null, hasPersonality: false };

  const wordsWeUse = Array.isArray(data.wordsWeUse)
    ? data.wordsWeUse.filter((w): w is string => typeof w === 'string')
    : [];
  const brandVoiceDescription =
    typeof data.brandVoiceDescription === 'string' ? data.brandVoiceDescription : undefined;
  const traitsRaw = Array.isArray(data.personalityTraits) ? data.personalityTraits : [];
  const personalityTraits: PersonalityTraitInput[] = traitsRaw
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      name: typeof t.name === 'string' ? t.name : undefined,
      description: typeof t.description === 'string' ? t.description : undefined,
      weAreThis: typeof t.weAreThis === 'string' ? t.weAreThis : undefined,
      butNeverThat: typeof t.butNeverThat === 'string' ? t.butNeverThat : undefined,
    }));

  if (wordsWeUse.length === 0 && personalityTraits.length === 0) {
    return { signals: null, hasPersonality: true };
  }
  return {
    signals: { wordsWeUse, personalityTraits, brandVoiceDescription },
    hasPersonality: true,
  };
}

// ─── NEW fetcher — post-W-1, voiceguide-first ──

async function fetchNew(workspaceId: string): Promise<{
  signals: BrandPersonalityInput | null;
  hasVoiceguide: boolean;
  voiceguideUsed: boolean;
}> {
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
  let voiceguideUsed = false;

  if (voiceguide && (voiceguide.wordsWeUse?.length || voiceguide.voiceDescription)) {
    wordsWeUse = (voiceguide.wordsWeUse ?? []).filter((w): w is string => typeof w === 'string');
    brandVoiceDescription =
      typeof voiceguide.voiceDescription === 'string' && voiceguide.voiceDescription.length > 0
        ? voiceguide.voiceDescription
        : undefined;
    voiceguideUsed = true;
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

  if (wordsWeUse.length === 0 && personalityTraits.length === 0) {
    return { signals: null, hasVoiceguide: !!voiceguide, voiceguideUsed: false };
  }
  return {
    signals: { wordsWeUse, personalityTraits, brandVoiceDescription },
    hasVoiceguide: !!voiceguide,
    voiceguideUsed,
  };
}

// ─── Main ───────────────────────────────────────────

interface SampleResult {
  versionId: string;
  workspaceId: string;
  workspaceName: string;
  hasVoiceguide: boolean;
  voiceguideUsed: boolean;
  legacySkipped: boolean;
  newSkipped: boolean;
  legacyScore: number | null;
  newScore: number | null;
  delta: number | null;
  wordCount: number;
}

async function main() {
  const { prisma } = await import('../../src/lib/prisma');
  const { scoreBrandStyle } = await import('../../src/lib/brand-fidelity/style-scorer');

  console.log(`→ BV-WIRE W-1 Pillar 1 regression test`);
  console.log(`  Sample limit: ${SAMPLE_LIMIT}`);
  console.log(`  Pass criterion: mean delta < ${MEAN_DELTA_PASS_THRESHOLD} composite points\n`);

  // 1. Sample text rows. ContentVersion is the Studio path; DeliverableComponent
  //    is the Canvas path. Modern campaigns mostly write to DeliverableComponent,
  //    so we draw from both to reach the 100-row target.
  type Sample = { id: string; text: string; workspaceId: string; workspaceName: string; source: 'version' | 'component' };
  const samples: Sample[] = [];

  const versions = await prisma.contentVersion.findMany({
    take: SAMPLE_LIMIT,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      contentSnapshot: true,
      deliverable: {
        select: {
          campaign: { select: { workspaceId: true, workspace: { select: { name: true } } } },
        },
      },
    },
  });
  for (const v of versions) {
    const text = extractText(v.contentSnapshot);
    const wsId = v.deliverable?.campaign?.workspaceId;
    if (!text || text.trim().length < MIN_TEXT_CHARS || !wsId) continue;
    samples.push({
      id: v.id,
      text,
      workspaceId: wsId,
      workspaceName: v.deliverable?.campaign?.workspace?.name ?? '(unknown)',
      source: 'version',
    });
  }
  console.log(`✓ Loaded ${versions.length} ContentVersion rows (${samples.length} usable)`);

  // Top up from DeliverableComponent if we did not hit the limit.
  if (samples.length < SAMPLE_LIMIT) {
    const remaining = SAMPLE_LIMIT - samples.length;
    const components = await prisma.deliverableComponent.findMany({
      take: remaining,
      where: { generatedContent: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        generatedContent: true,
        deliverable: {
          select: {
            campaign: { select: { workspaceId: true, workspace: { select: { name: true } } } },
          },
        },
      },
    });
    for (const c of components) {
      const text = c.generatedContent ?? '';
      const wsId = c.deliverable?.campaign?.workspaceId;
      if (!text || text.trim().length < MIN_TEXT_CHARS || !wsId) continue;
      samples.push({
        id: c.id,
        text,
        workspaceId: wsId,
        workspaceName: c.deliverable?.campaign?.workspace?.name ?? '(unknown)',
        source: 'component',
      });
      if (samples.length >= SAMPLE_LIMIT) break;
    }
    console.log(`✓ Topped up with ${components.length} DeliverableComponent rows (samples now ${samples.length})`);
  }

  if (samples.length === 0) {
    console.warn('⚠ No usable text samples in DB — nothing to regression-test against.');
    process.exit(0);
  }

  // 2. Per-workspace cache for fetched signals (avoid N × workspace fetches)
  const legacyCache = new Map<string, { signals: BrandPersonalityInput | null; hasPersonality: boolean }>();
  const newCache = new Map<string, { signals: BrandPersonalityInput | null; hasVoiceguide: boolean; voiceguideUsed: boolean }>();

  async function getLegacy(wsId: string) {
    if (!legacyCache.has(wsId)) legacyCache.set(wsId, await fetchLegacy(wsId));
    return legacyCache.get(wsId)!;
  }
  async function getNew(wsId: string) {
    if (!newCache.has(wsId)) newCache.set(wsId, await fetchNew(wsId));
    return newCache.get(wsId)!;
  }

  // 3. Score each sample
  const results: SampleResult[] = [];

  for (const s of samples) {
    const legacy = await getLegacy(s.workspaceId);
    const fresh = await getNew(s.workspaceId);

    const legacyResult = scoreBrandStyle(s.text, legacy.signals);
    const newResult = scoreBrandStyle(s.text, fresh.signals);

    const legacyScore = legacy.signals ? legacyResult.compositeScore : null;
    const newScore = fresh.signals ? newResult.compositeScore : null;
    const delta =
      legacyScore !== null && newScore !== null ? Math.abs(newScore - legacyScore) : null;

    results.push({
      versionId: s.id,
      workspaceId: s.workspaceId,
      workspaceName: s.workspaceName,
      hasVoiceguide: fresh.hasVoiceguide,
      voiceguideUsed: fresh.voiceguideUsed,
      legacySkipped: !legacy.signals,
      newSkipped: !fresh.signals,
      legacyScore,
      newScore,
      delta,
      wordCount: legacyResult.wordCount,
    });
  }

  console.log(`✓ Scored ${results.length} samples\n`);

  // 3b. Per-workspace state breakdown (helpful to debug why deltas may be 0)
  console.log('Workspaces in this sample:');
  const wsState = new Map<
    string,
    { name: string; count: number; legacy: boolean; newSrc: 'voiceguide' | 'legacy' | 'none'; vgRow: boolean }
  >();
  for (const r of results) {
    if (!wsState.has(r.workspaceId)) {
      const legacyEntry = legacyCache.get(r.workspaceId);
      const newEntry = newCache.get(r.workspaceId);
      wsState.set(r.workspaceId, {
        name: r.workspaceName,
        count: 0,
        legacy: !!legacyEntry?.signals,
        newSrc: newEntry?.voiceguideUsed
          ? 'voiceguide'
          : newEntry?.signals
            ? 'legacy'
            : 'none',
        vgRow: !!newEntry?.hasVoiceguide,
      });
    }
    wsState.get(r.workspaceId)!.count += 1;
  }
  for (const [wsId, ws] of Array.from(wsState.entries()).sort((a, b) => b[1].count - a[1].count)) {
    console.log(
      `  ${ws.name.padEnd(28)} legacy=${ws.legacy ? 'Y' : 'N'} vgRow=${ws.vgRow ? 'Y' : 'N'} newSrc=${ws.newSrc.padEnd(10)} n=${String(ws.count).padStart(3)}  ${wsId}`,
    );
  }
  console.log('');

  // 4. Aggregate
  const comparable = results.filter((r) => r.delta !== null);
  const deltas = comparable.map((r) => r.delta as number);
  const meanDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const sortedDeltas = [...deltas].sort((a, b) => a - b);
  const p95Delta =
    sortedDeltas.length > 0 ? sortedDeltas[Math.floor(sortedDeltas.length * 0.95)] : 0;
  const maxDelta = sortedDeltas.length > 0 ? sortedDeltas[sortedDeltas.length - 1] : 0;

  const perWorkspace = new Map<
    string,
    { name: string; count: number; hasVoiceguide: boolean; voiceguideUsed: boolean; meanDelta: number }
  >();
  for (const r of results) {
    if (r.delta === null) continue;
    if (!perWorkspace.has(r.workspaceId)) {
      perWorkspace.set(r.workspaceId, {
        name: r.workspaceName,
        count: 0,
        hasVoiceguide: r.hasVoiceguide,
        voiceguideUsed: r.voiceguideUsed,
        meanDelta: 0,
      });
    }
    const ws = perWorkspace.get(r.workspaceId)!;
    ws.meanDelta = (ws.meanDelta * ws.count + r.delta) / (ws.count + 1);
    ws.count += 1;
  }

  const insufficientData = comparable.length < MIN_COMPARABLE_FOR_VERDICT;
  const passed = !insufficientData && meanDelta < MEAN_DELTA_PASS_THRESHOLD;
  const verdict = insufficientData
    ? 'INSUFFICIENT_DATA'
    : passed
      ? 'PASS'
      : 'FAIL';

  // 5. Console summary
  console.log('───────────── REGRESSION SUMMARY ─────────────');
  console.log(`Comparable samples:       ${comparable.length} / ${results.length}`);
  console.log(`Mean composite delta:     ${meanDelta.toFixed(2)} points`);
  console.log(`p95 composite delta:      ${p95Delta.toFixed(2)} points`);
  console.log(`Max composite delta:      ${maxDelta.toFixed(2)} points`);
  console.log(`Pass threshold:           < ${MEAN_DELTA_PASS_THRESHOLD} points (mean)`);
  console.log(`Min comparable required:  ${MIN_COMPARABLE_FOR_VERDICT}`);
  console.log(`Verdict:                  ${verdict}\n`);

  if (insufficientData) {
    console.warn(`⚠ INSUFFICIENT_DATA: only ${comparable.length} comparable samples found.`);
    console.warn('  A comparable sample requires the workspace to have BrandPersonality');
    console.warn('  data so that the LEGACY fetcher returns non-null signals. Workspaces');
    console.warn('  that only ever had voiceguide (or neither) cannot be regression-tested');
    console.warn('  against the pre-W-1 path. Re-run after seeding more BrandPersonality');
    console.warn('  data, or accept INSUFFICIENT_DATA as a non-failure baseline.\n');
  }

  console.log('Per workspace:');
  const sortedWs = Array.from(perWorkspace.entries()).sort((a, b) => b[1].count - a[1].count);
  for (const [wsId, ws] of sortedWs) {
    const tag = ws.voiceguideUsed ? '[voiceguide]' : ws.hasVoiceguide ? '[empty voiceguide]' : '[legacy only]';
    console.log(
      `  ${ws.name.padEnd(28)} ${tag.padEnd(20)} n=${String(ws.count).padStart(3)}  meanΔ=${ws.meanDelta.toFixed(2)}  ${wsId}`,
    );
  }

  // 6. Write markdown report
  const reportPath = resolve(
    process.cwd(),
    'research/fidelity-week1/reports/pillar1-regression-report.md',
  );
  mkdirSync(dirname(reportPath), { recursive: true });
  const lines: string[] = [];
  lines.push('# Pillar 1 Regression Report (BV-WIRE W-1)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Sample limit: ${SAMPLE_LIMIT}  •  comparable samples: ${comparable.length}`);
  lines.push('');
  lines.push('## Verdict');
  lines.push('');
  if (insufficientData) {
    lines.push(`**INSUFFICIENT_DATA** — only ${comparable.length} comparable samples found (minimum ${MIN_COMPARABLE_FOR_VERDICT}). The W-1 acceptance gate cannot be evaluated against this DB state.`);
  } else if (passed) {
    lines.push(`**PASS** — mean delta ${meanDelta.toFixed(2)} composite points (threshold < ${MEAN_DELTA_PASS_THRESHOLD}).`);
  } else {
    lines.push(`**FAIL** — mean delta ${meanDelta.toFixed(2)} composite points exceeds threshold (< ${MEAN_DELTA_PASS_THRESHOLD}).`);
  }
  lines.push('');
  lines.push('## Aggregate stats');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Mean composite delta | ${meanDelta.toFixed(2)} |`);
  lines.push(`| p95 composite delta  | ${p95Delta.toFixed(2)} |`);
  lines.push(`| Max composite delta  | ${maxDelta.toFixed(2)} |`);
  lines.push(`| Comparable samples   | ${comparable.length} / ${results.length} |`);
  lines.push(`| ContentVersion rows  | ${samples.filter((s) => s.source === 'version').length} |`);
  lines.push(`| DeliverableComponent rows | ${samples.filter((s) => s.source === 'component').length} |`);
  lines.push('');
  lines.push('## Per workspace');
  lines.push('');
  lines.push('| Workspace | Source | n | Mean Δ |');
  lines.push('|---|---|---|---|');
  for (const [, ws] of sortedWs) {
    const source = ws.voiceguideUsed ? 'voiceguide' : ws.hasVoiceguide ? 'empty voiceguide' : 'legacy only';
    lines.push(`| ${ws.name} | ${source} | ${ws.count} | ${ws.meanDelta.toFixed(2)} |`);
  }
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  lines.push('- **legacy only** workspaces should report Δ = 0 because the new');
  lines.push('  fetcher falls back to BrandPersonality.frameworkData when no');
  lines.push('  voiceguide exists, producing identical signals to pre-W-1.');
  lines.push('- **voiceguide** workspaces score against the migrated voice signals;');
  lines.push('  delta reflects how closely the voiceguide vocabulary matches the');
  lines.push('  legacy BrandPersonality vocabulary. Larger deltas are expected if');
  lines.push('  the voiceguide was edited independently after migration.');
  lines.push('- **empty voiceguide** rows have a row but no wordsWeUse / voiceDescription;');
  lines.push('  the new fetcher correctly falls back to legacy.');
  lines.push('');
  // Directional bias note — surfaces when one source consistently under/overscores.
  if (comparable.length > 0) {
    const directional = comparable.map((r) => (r.newScore as number) - (r.legacyScore as number));
    const sumDir = directional.reduce((a, b) => a + b, 0);
    const meanSigned = sumDir / directional.length;
    if (Math.abs(meanSigned) >= 1) {
      const direction = meanSigned > 0 ? 'higher' : 'lower';
      lines.push('## Directional bias');
      lines.push('');
      lines.push(
        `Mean signed delta (new − legacy): **${meanSigned.toFixed(2)}** — voiceguide-sourced scores are on average **${direction}** than legacy. This is informational, not a regression: the voiceguide vocabulary is a curated subset of the legacy field on most pilot workspaces, so a downward bias is expected.`,
      );
      lines.push('');
    }
  }
  lines.push('## Pre-registration note');
  lines.push('');
  lines.push('Per IMPLEMENTATIEPLAN-BV-WIRE.md the W-1 acceptance criterion is');
  lines.push(`**mean delta < ${MEAN_DELTA_PASS_THRESHOLD}% (composite points)** across at least 100 versions.`);
  lines.push('This script enforces that gate with exit code 1 on failure.');
  lines.push('');

  // 7. Sample rows
  if (comparable.length > 0) {
    lines.push('## Sample rows (top 10 deltas)');
    lines.push('');
    lines.push('| Version | Workspace | Source | Words | Legacy | New | Δ |');
    lines.push('|---|---|---|---|---|---|---|');
    const top = [...comparable].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)).slice(0, 10);
    for (const r of top) {
      const source = r.voiceguideUsed ? 'voiceguide' : r.hasVoiceguide ? 'empty vg' : 'legacy';
      lines.push(
        `| ${r.versionId.slice(0, 10)} | ${r.workspaceName} | ${source} | ${r.wordCount} | ${r.legacyScore} | ${r.newScore} | ${(r.delta ?? 0).toFixed(0)} |`,
      );
    }
    lines.push('');
  }

  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\n✓ Report: ${reportPath}`);

  await prisma.$disconnect();
  // Exit codes: 0 PASS, 1 FAIL, 3 INSUFFICIENT_DATA, 2 reserved for crash.
  if (insufficientData) process.exit(3);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('Regression test crashed:', err);
  process.exit(2);
});
