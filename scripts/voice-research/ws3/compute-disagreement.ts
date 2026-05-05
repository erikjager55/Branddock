/**
 * WS3 Step 4 — Disagreement-meting between quality-scorer Voice-dimension and
 * mStyleDistance embedding similarity.
 *
 * Reads three inputs:
 *   - corpus.jsonl              (extract-corpus.ts output)
 *   - voice-scores.json         (score-voice-quality.ts output)
 *   - embeddings.json           (compute-embeddings.py output)
 *
 * Computes:
 *   - Pearson r        (linear correlation, sensitive to ties — secondary)
 *   - Spearman rho     (rank correlation, robust to ties — leading per protocol v0.3)
 *   - Disagreement cases for qualitative inspection (PRIMARY signal per v0.3 §6.4)
 *
 * Output: scripts/voice-research/ws3/output/disagreement-result.json
 *
 * Per protocol v0.3 (commit 9db58cc):
 *   - Qualitative disagreement-case inspection by 2 raters is the PRIMARY signal
 *     for the F-VAL pijler 1 decision.
 *   - Correlation statistics (Pearson + Spearman) are secondary directional
 *     indicators, NOT threshold-based decisions.
 *
 * Usage:
 *   tsx scripts/voice-research/ws3/compute-disagreement.ts
 *   tsx scripts/voice-research/ws3/compute-disagreement.ts --threshold-z=1.5
 *
 * No DB access, no API calls — purely consumes upstream JSON outputs.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

// ─── Constants ────────────────────────────────────────────

const PROTOCOL_VERSION = 'v0.3';
const PROTOCOL_COMMIT = '9db58cc';
const SCRIPT_DIR = path.resolve(process.cwd(), 'scripts/voice-research/ws3');
const DEFAULT_CORPUS_PATH = path.join(SCRIPT_DIR, 'output/corpus.jsonl');
const DEFAULT_VOICE_SCORES_PATH = path.join(SCRIPT_DIR, 'output/voice-scores.json');
const DEFAULT_EMBEDDINGS_PATH = path.join(SCRIPT_DIR, 'output/embeddings.json');
const DEFAULT_OUTPUT_PATH = path.join(SCRIPT_DIR, 'output/disagreement-result.json');

/** Default disagreement threshold: |z-score of delta| > THRESHOLD_Z marks the case for review */
const DEFAULT_THRESHOLD_Z = 1.0;

const SNIPPET_WORDS = 500;

// ─── Input shapes ────────────────────────────────────────

interface CorpusItem {
  id: string;
  workspaceSlug: string;
  contentType: string;
  title: string;
  content: string;
  wordCount: number;
}

interface VoiceScoresFile {
  results: Record<
    string,
    {
      voiceScore: number; // 0-100
      voiceExplanation: string;
      overallQuality: number;
      usedDefaultScorer: boolean;
    }
  >;
}

interface EmbeddingsFile {
  model: string;
  items: Record<
    string,
    {
      workspace_slug: string;
      is_brand_anchor: boolean;
      content_type: string;
      word_count: number;
      similarity_to_linfi_centroid: number; // 0-1
      similarity_method: string;
    }
  >;
}

// ─── Statistical helpers ─────────────────────────────────

function mean(xs: number[]): number {
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

function stddev(xs: number[]): number {
  const m = mean(xs);
  const sumSq = xs.reduce((s, n) => s + (n - m) ** 2, 0);
  return Math.sqrt(sumSq / xs.length);
}

/**
 * Pearson r — linear correlation coefficient.
 * Returns NaN when either variable has zero variance.
 */
function pearsonR(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return NaN;
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return NaN;
  return num / Math.sqrt(denX * denY);
}

/**
 * Convert values to ranks. Tied values get the average rank (standard convention).
 * Example: [10, 20, 20, 30] -> [1, 2.5, 2.5, 4]
 */
function ranks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);

  const result = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    // Find run of ties
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    // Average rank for the tied group: ((i+1) + (j+1)) / 2
    const avgRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) {
      result[indexed[k].i] = avgRank;
    }
    i = j + 1;
  }
  return result;
}

/**
 * Spearman rank correlation — Pearson r on ranks. Robust to ties via average-rank.
 * Per protocol v0.3 §6.4: this is the LEADING correlation metric for WS3 due to
 * the thin score distribution observed in step 2.
 */
function spearmanRho(x: number[], y: number[]): number {
  return pearsonR(ranks(x), ranks(y));
}

function uniqueCount(xs: number[]): number {
  return new Set(xs).size;
}

// ─── Pipeline ────────────────────────────────────────────

function getDirectionalLabel(rho: number): string {
  if (isNaN(rho)) return 'undefined (zero variance)';
  if (rho > 0.7) return 'sterk gecorreleerd — kwalitatief waarschijnlijk redundantie';
  if (rho >= 0.4) return 'matig — kwalitatieve inspectie volledig leidend';
  if (rho >= -0.4) return 'zwak — kwalitatief waarschijnlijk additief signaal';
  return 'sterk negatief gecorreleerd — onverwachte inversie, vereist inspectie';
}

function firstNWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= n) return text;
  return words.slice(0, n).join(' ') + '…';
}

interface CliArgs {
  corpusPath: string;
  voiceScoresPath: string;
  embeddingsPath: string;
  outputPath: string;
  thresholdZ: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    corpusPath: DEFAULT_CORPUS_PATH,
    voiceScoresPath: DEFAULT_VOICE_SCORES_PATH,
    embeddingsPath: DEFAULT_EMBEDDINGS_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    thresholdZ: DEFAULT_THRESHOLD_Z,
  };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--corpus=')) args.corpusPath = arg.slice('--corpus='.length);
    else if (arg.startsWith('--voice-scores=')) {
      args.voiceScoresPath = arg.slice('--voice-scores='.length);
    } else if (arg.startsWith('--embeddings=')) {
      args.embeddingsPath = arg.slice('--embeddings='.length);
    } else if (arg.startsWith('--output=')) {
      args.outputPath = arg.slice('--output='.length);
    } else if (arg.startsWith('--threshold-z=')) {
      const n = parseFloat(arg.slice('--threshold-z='.length));
      if (!isNaN(n) && n > 0) args.thresholdZ = n;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log('━'.repeat(72));
  console.log('WS3 Step 4 — Disagreement-meting (Pearson + Spearman + qualitative cases)');
  console.log(`Corpus:        ${args.corpusPath}`);
  console.log(`Voice scores:  ${args.voiceScoresPath}`);
  console.log(`Embeddings:    ${args.embeddingsPath}`);
  console.log(`Output:        ${args.outputPath}`);
  console.log(`Threshold:     |z| > ${args.thresholdZ}`);
  console.log('━'.repeat(72));

  // Load all three inputs
  const corpusText = await readFile(args.corpusPath, 'utf-8');
  const corpus: CorpusItem[] = corpusText
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CorpusItem);

  const voiceScores: VoiceScoresFile = JSON.parse(
    await readFile(args.voiceScoresPath, 'utf-8'),
  );
  const embeddings: EmbeddingsFile = JSON.parse(
    await readFile(args.embeddingsPath, 'utf-8'),
  );

  console.log(
    `\nLoaded: corpus n=${corpus.length}, voice-scores n=${Object.keys(voiceScores.results).length}, embeddings n=${Object.keys(embeddings.items).length}`,
  );

  // Align by item ID — fail loudly on mismatches
  type Pair = {
    itemId: string;
    workspaceSlug: string;
    isBrandAnchor: boolean;
    contentType: string;
    title: string;
    wordCount: number;
    voiceScore: number; // 0-100
    voiceScoreNormalized: number; // 0-1
    voiceExplanation: string;
    similarity: number; // 0-1
    similarityMethod: string;
    contentSnippet: string;
  };

  const pairs: Pair[] = [];
  const missing: string[] = [];

  for (const item of corpus) {
    const vs = voiceScores.results[item.id];
    const emb = embeddings.items[item.id];
    if (!vs) {
      missing.push(`${item.id} (no voice score)`);
      continue;
    }
    if (!emb) {
      missing.push(`${item.id} (no embedding)`);
      continue;
    }
    pairs.push({
      itemId: item.id,
      workspaceSlug: item.workspaceSlug,
      isBrandAnchor: emb.is_brand_anchor,
      contentType: item.contentType,
      title: item.title,
      wordCount: item.wordCount,
      voiceScore: vs.voiceScore,
      voiceScoreNormalized: vs.voiceScore / 100,
      voiceExplanation: vs.voiceExplanation,
      similarity: emb.similarity_to_linfi_centroid,
      similarityMethod: emb.similarity_method,
      contentSnippet: firstNWords(item.content, SNIPPET_WORDS),
    });
  }

  if (missing.length > 0) {
    console.warn(`\n⚠ Missing data for ${missing.length} items — skipped:`);
    missing.slice(0, 5).forEach((m) => console.warn(`   ${m}`));
    if (missing.length > 5) console.warn(`   ...and ${missing.length - 5} more`);
  }

  if (pairs.length < 4) {
    console.error(`\nERROR: Only ${pairs.length} aligned pairs — too few for any meaningful correlation.`);
    process.exit(1);
  }

  // Correlations
  const voiceArr = pairs.map((p) => p.voiceScoreNormalized);
  const simArr = pairs.map((p) => p.similarity);
  const pearson = pearsonR(voiceArr, simArr);
  const spearman = spearmanRho(voiceArr, simArr);

  // Delta + z-scores for disagreement-case detection
  // Delta convention: voice - similarity. Positive delta = scorer says higher than embedding.
  const deltas = pairs.map((p) => p.voiceScoreNormalized - p.similarity);
  const meanDelta = mean(deltas);
  const stdDelta = stddev(deltas);

  const enrichedPairs = pairs.map((p, i) => {
    const delta = deltas[i];
    const z = stdDelta > 0 ? (delta - meanDelta) / stdDelta : 0;
    return { ...p, delta, deltaZScore: z };
  });

  const disagreementCases = enrichedPairs.filter((p) => Math.abs(p.deltaZScore) > args.thresholdZ);
  // Sort cases by absolute z-score descending — highest divergence first for review
  disagreementCases.sort((a, b) => Math.abs(b.deltaZScore) - Math.abs(a.deltaZScore));

  // Build output
  const output = {
    generated_at: new Date().toISOString(),
    protocol_version: PROTOCOL_VERSION,
    protocol_commit: PROTOCOL_COMMIT,
    n_pairs: pairs.length,
    n_missing: missing.length,
    threshold_z: args.thresholdZ,
    correlation: {
      pearson_r: pearson,
      spearman_rho: spearman,
      directional_interpretation:
        'Per protocol v0.3 §6.4: kwalitatieve disagreement-case inspectie is primair signaal. Correlation is secundair directional indicator, NIET threshold-based decision.',
      directional_label_spearman: getDirectionalLabel(spearman),
    },
    score_distribution: {
      voice_score: {
        n: pairs.length,
        unique_values: uniqueCount(pairs.map((p) => p.voiceScore)),
        min: Math.min(...pairs.map((p) => p.voiceScore)),
        max: Math.max(...pairs.map((p) => p.voiceScore)),
        mean: mean(pairs.map((p) => p.voiceScore)),
        stddev: stddev(pairs.map((p) => p.voiceScore)),
      },
      similarity: {
        n: pairs.length,
        min: Math.min(...simArr),
        max: Math.max(...simArr),
        mean: mean(simArr),
        stddev: stddev(simArr),
      },
      delta_voice_minus_similarity: {
        mean: meanDelta,
        stddev: stdDelta,
        min: Math.min(...deltas),
        max: Math.max(...deltas),
      },
    },
    disagreement_cases: disagreementCases.map((p) => ({
      item_id: p.itemId,
      workspace_slug: p.workspaceSlug,
      is_brand_anchor: p.isBrandAnchor,
      content_type: p.contentType,
      title: p.title,
      word_count: p.wordCount,
      voice_score: p.voiceScore,
      voice_score_normalized: p.voiceScoreNormalized,
      voice_explanation: p.voiceExplanation,
      similarity_to_linfi_centroid: p.similarity,
      similarity_method: p.similarityMethod,
      delta: p.delta,
      delta_z_score: p.deltaZScore,
      direction:
        p.delta > 0
          ? 'voice-scorer-higher-than-embedding'
          : 'embedding-higher-than-voice-scorer',
      content_snippet: p.contentSnippet,
    })),
    all_pairs: enrichedPairs.map((p) => ({
      item_id: p.itemId,
      workspace_slug: p.workspaceSlug,
      is_brand_anchor: p.isBrandAnchor,
      content_type: p.contentType,
      voice_score: p.voiceScore,
      similarity: p.similarity,
      delta: p.delta,
      delta_z_score: p.deltaZScore,
    })),
  };

  await mkdir(path.dirname(args.outputPath), { recursive: true });
  await writeFile(args.outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // Console report
  console.log('\n' + '━'.repeat(72));
  console.log(`Pairs aligned: ${pairs.length}/${corpus.length}`);
  console.log('\nCorrelation (per v0.3: secundair directional indicator):');
  console.log(`  Pearson r   = ${pearson.toFixed(4)}  (sensitive to ties at thin distribution)`);
  console.log(`  Spearman ρ  = ${spearman.toFixed(4)}  (LEADING — robust to ties)`);
  console.log(`  → ${getDirectionalLabel(spearman)}`);

  console.log('\nDelta distribution (voice_normalized - similarity):');
  console.log(`  mean=${meanDelta.toFixed(4)}  stddev=${stdDelta.toFixed(4)}  range=[${Math.min(...deltas).toFixed(4)}, ${Math.max(...deltas).toFixed(4)}]`);

  console.log(
    `\nDisagreement cases (|z| > ${args.thresholdZ}): ${disagreementCases.length}/${pairs.length}`,
  );
  if (disagreementCases.length > 0) {
    console.log(
      'Top cases for qualitative review (PRIMARY signal per protocol v0.3 §6.4):',
    );
    for (const c of disagreementCases.slice(0, 5)) {
      console.log(
        `  ${c.workspaceSlug}/${c.contentType} "${c.title.slice(0, 40)}" — voice=${c.voiceScore} sim=${c.similarity.toFixed(3)} z=${c.deltaZScore.toFixed(2)} (${c.delta > 0 ? 'scorer higher' : 'embedding higher'})`,
      );
    }
    if (disagreementCases.length > 5) {
      console.log(`   ... ${disagreementCases.length - 5} more in output JSON`);
    }
  } else {
    console.log(
      '  (none — voice and embedding agree within 1 stddev for all pairs; Spearman ρ leading)',
    );
  }

  console.log(`\n✓ Wrote ${args.outputPath}`);
  console.log('\nNext step: 2 raters review disagreement cases qualitatively per protocol §6.4.');
}

main().catch((err) => {
  console.error('Disagreement calc failed:', err);
  process.exit(1);
});
