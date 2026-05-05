/**
 * WS3 Step 2 — Score voice-quality on the corpus.
 *
 * Runs the production quality-scorer (src/lib/studio/quality-scorer.ts) on each
 * piece in corpus.jsonl and extracts the Brand Voice Adherence dimension score
 * (default 4-dimension scorer, weight 0.25).
 *
 * Pre-registration decision: use the DEFAULT scorer (no deliverableTypeId), not
 * type-specific criteria. Reason: WS3 measures correlation between two scoring
 * mechanisms across all 16 pieces — we need consistent dimensions across types,
 * not type-specific variants. Type-specific criteria for blog-post vs case-study
 * use different dimension names ("Brand Alignment" vs "Authenticity" etc.) which
 * would make the cross-piece comparison apples-to-oranges.
 *
 * See:
 *   - docs/voice-fingerprinting-ws2-protocol.md §6 (WS3 scope)
 *   - scripts/voice-research/ws3/README.md (full pipeline)
 *
 * Usage:
 *   tsx scripts/voice-research/ws3/score-voice-quality.ts             # all 16 items
 *   tsx scripts/voice-research/ws3/score-voice-quality.ts --limit=2   # smoke test on first 2
 *
 * Cost estimate: ~$0.01-0.02 per item (Claude Sonnet on 1K-2K word inputs).
 * 16 items ≈ $0.16-0.32 total.
 *
 * Output: scripts/voice-research/ws3/output/voice-scores.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import { scoreContentQuality } from '@/lib/studio/quality-scorer';
import type { GenerationContext } from '@/lib/studio/context-builder';

// ─── Constants ────────────────────────────────────────────

const VOICE_DIMENSION_NAME = 'Brand Voice Adherence';
const DEFAULT_CORPUS_PATH = path.resolve(
  process.cwd(),
  'scripts/voice-research/ws3/output/corpus.jsonl',
);
const DEFAULT_OUTPUT_PATH = path.resolve(
  process.cwd(),
  'scripts/voice-research/ws3/output/voice-scores.json',
);

// ─── Types ────────────────────────────────────────────────

interface CorpusItem {
  id: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  isBrandAnchor: boolean;
  contentType: string;
  title: string;
  content: string;
  wordCount: number;
}

interface VoiceScoreResult {
  id: string;
  workspaceSlug: string;
  isBrandAnchor: boolean;
  contentType: string;
  wordCount: number;
  voiceScore: number; // 0-100, the Brand Voice Adherence dimension
  voiceExplanation: string;
  overallQuality: number; // 0-100, weighted total of all 4 dimensions
  dimensions: Array<{ name: string; score: number; weight: number }>;
  scoredAt: string;
  elapsedMs: number;
  /** True when the scorer fell back to the default 4-dim scoring (vs. type-specific) */
  usedDefaultScorer: boolean;
}

interface VoiceScoresFile {
  generated_at: string;
  protocol_version: string;
  protocol_commit: string;
  corpus_path: string;
  items_scored: number;
  items_failed: number;
  scorer_config: {
    dimension_name: string;
    used_default_scorer_for_all: boolean;
    rationale: string;
  };
  results: Record<string, VoiceScoreResult>;
}

interface CliArgs {
  corpusPath: string;
  outputPath: string;
  limit?: number;
}

// ─── CLI parsing ──────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    corpusPath: DEFAULT_CORPUS_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
  };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--corpus=')) args.corpusPath = arg.slice('--corpus='.length);
    else if (arg.startsWith('--output=')) args.outputPath = arg.slice('--output='.length);
    else if (arg.startsWith('--limit=')) {
      const n = parseInt(arg.slice('--limit='.length), 10);
      if (!isNaN(n) && n > 0) args.limit = n;
    }
  }
  return args;
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log('━'.repeat(72));
  console.log('WS3 Step 2 — Voice quality scoring on corpus');
  console.log(`Corpus:  ${args.corpusPath}`);
  console.log(`Output:  ${args.outputPath}`);
  if (args.limit) console.log(`Limit:   first ${args.limit} items`);
  console.log('━'.repeat(72));

  // Load corpus
  let corpusText: string;
  try {
    corpusText = await readFile(args.corpusPath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read corpus: ${args.corpusPath}`);
    console.error('Run extract-corpus.ts first.');
    process.exit(1);
  }

  const items: CorpusItem[] = corpusText
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CorpusItem);

  const workItems = args.limit ? items.slice(0, args.limit) : items;
  console.log(`\nLoaded ${items.length} corpus items, scoring ${workItems.length}.`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set — required for quality-scorer Claude call.');
    process.exit(1);
  }

  // Cache brand contexts per workspace to avoid redundant fetches
  const brandCtxCache = new Map<string, GenerationContext>();
  async function getCachedContext(workspaceId: string): Promise<GenerationContext> {
    const cached = brandCtxCache.get(workspaceId);
    if (cached) return cached;
    const ctx = await getBrandContext(workspaceId);
    const generationContext: GenerationContext = {
      brandContext: formatBrandContext(ctx),
      personaContext: '',
      campaignContext: '',
      deliverableBrief: '',
    };
    brandCtxCache.set(workspaceId, generationContext);
    return generationContext;
  }

  const results: Record<string, VoiceScoreResult> = {};
  let failed = 0;
  const overallStart = Date.now();

  for (let i = 0; i < workItems.length; i++) {
    const item = workItems[i];
    const prefix = `[${i + 1}/${workItems.length}]`;
    console.log(
      `\n${prefix} ${item.workspaceSlug}/${item.contentType} — "${item.title}" (${item.wordCount}w)`,
    );

    try {
      const generationContext = await getCachedContext(item.workspaceId);

      const scoreStart = Date.now();
      // CRITICAL: pass deliverableTypeId=undefined to force the default 4-dimension scorer.
      // This guarantees consistent "Brand Voice Adherence" dimension across all 16 pieces,
      // regardless of contentType. See file header for rationale.
      const result = await scoreContentQuality(
        item.content,
        generationContext,
        item.contentType,
        item.title,
        item.workspaceId,
        undefined, // ← deliverableTypeId omitted — forces default scorer
        undefined,
      );
      const scoreElapsed = Date.now() - scoreStart;

      // Find Voice dimension by exact name match (default scorer guarantees this name)
      const voiceDim = result.dimensions.find((d) => d.name === VOICE_DIMENSION_NAME);
      if (!voiceDim) {
        console.warn(
          `  ⚠ "${VOICE_DIMENSION_NAME}" dimension not found in result — type-specific scorer was used? Skipping.`,
        );
        console.warn(`  Available dimensions: ${result.dimensions.map((d) => d.name).join(', ')}`);
        failed += 1;
        continue;
      }

      // Sanity check: usedDefaultScorer should be true if the dimensions match the default 4
      const expectedDefaultDims = [
        'Brand Voice Adherence',
        'Brand Strategy Alignment',
        'Engagement',
        'Clarity',
      ];
      const actualNames = result.dimensions.map((d) => d.name);
      const usedDefaultScorer =
        actualNames.length === expectedDefaultDims.length &&
        expectedDefaultDims.every((n) => actualNames.includes(n));

      results[item.id] = {
        id: item.id,
        workspaceSlug: item.workspaceSlug,
        isBrandAnchor: item.isBrandAnchor,
        contentType: item.contentType,
        wordCount: item.wordCount,
        voiceScore: voiceDim.score,
        voiceExplanation: voiceDim.explanation,
        overallQuality: result.overall,
        dimensions: result.dimensions.map((d) => ({
          name: d.name,
          score: d.score,
          weight: d.weight,
        })),
        scoredAt: new Date().toISOString(),
        elapsedMs: scoreElapsed,
        usedDefaultScorer,
      };

      console.log(
        `  voice=${voiceDim.score} overall=${result.overall} (${(scoreElapsed / 1000).toFixed(1)}s)`,
      );
    } catch (err) {
      console.error(`  ✗ Scoring failed:`, err instanceof Error ? err.message : err);
      failed += 1;
    }
  }

  // Write output
  await mkdir(path.dirname(args.outputPath), { recursive: true });
  const output: VoiceScoresFile = {
    generated_at: new Date().toISOString(),
    protocol_version: 'v0.2',
    protocol_commit: '446f92b',
    corpus_path: args.corpusPath,
    items_scored: Object.keys(results).length,
    items_failed: failed,
    scorer_config: {
      dimension_name: VOICE_DIMENSION_NAME,
      used_default_scorer_for_all: true,
      rationale:
        'Forced default 4-dimension scorer via deliverableTypeId=undefined to guarantee consistent dimension names across all 16 pieces (different contentTypes have different type-specific criteria, would break cross-piece comparison).',
    },
    results,
  };
  await writeFile(args.outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // Summary
  const elapsedTotal = (Date.now() - overallStart) / 1000;
  console.log('\n' + '━'.repeat(72));
  console.log(
    `Scored: ${Object.keys(results).length}/${workItems.length}   Failed: ${failed}   Elapsed: ${elapsedTotal.toFixed(1)}s`,
  );

  if (Object.keys(results).length > 0) {
    const scores = Object.values(results).map((r) => r.voiceScore);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const mean = scores.reduce((s, n) => s + n, 0) / scores.length;
    const median = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)];
    console.log(
      `Voice scores: min=${min}  median=${median}  mean=${mean.toFixed(1)}  max=${max}`,
    );
    // Per-workspace breakdown
    const byWorkspace = new Map<string, number[]>();
    for (const r of Object.values(results)) {
      if (!byWorkspace.has(r.workspaceSlug)) byWorkspace.set(r.workspaceSlug, []);
      byWorkspace.get(r.workspaceSlug)!.push(r.voiceScore);
    }
    console.log('Per workspace:');
    for (const [slug, ws] of byWorkspace) {
      const avg = ws.reduce((s, n) => s + n, 0) / ws.length;
      const anchor = slug === 'linfi' ? ' (anchor)' : '';
      console.log(`  ${slug.padEnd(22)} n=${ws.length}  mean=${avg.toFixed(1)}${anchor}`);
    }
  }

  console.log(`\n✓ Wrote ${Object.keys(results).length} scores to ${args.outputPath}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Score run failed:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
