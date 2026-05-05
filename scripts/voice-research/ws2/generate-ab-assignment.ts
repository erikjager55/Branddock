/**
 * WS2 — Generate sealed A/B assignment CSV.
 *
 * Reads topics.csv (one row per merk + content_type + topic) and produces a
 * sealed CSV that randomly assigns each (merk, content_type) pair to:
 *   - blind label V1 → either BASELINE (production BVD) or PROPAGATION (BVD + A.1-A.4)
 *   - blind label V2 → the other condition
 *
 * Per protocol §7.1: random A/B-toewijzing in sealed CSV vooraf vastgelegd.
 * Niet zichtbaar voor raters tot na scoring. Naming choice "V1/V2" instead of
 * "A/B" to avoid confusion with generate-piece.ts internal --condition=A|B
 * (where A=BASELINE, B=PROPAGATION). The blind labels in this CSV are
 * arbitrary symbols revealed only post-scoring.
 *
 * Usage:
 *   tsx scripts/voice-research/ws2/generate-ab-assignment.ts \
 *     --topics=scripts/voice-research/ws2/topics.csv \
 *     --output=scripts/voice-research/ws2/output/sealed/ab-assignment.csv
 *
 * Optional:
 *   --seed=NUMBER   Override RNG seed for reproducibility (default: cryptographic random)
 *
 * Output CSV columns:
 *   merk, content_type, topic, v1_condition, v2_condition, seed
 *
 * Where v1_condition + v2_condition are exactly { "BASELINE", "PROPAGATION" }
 * with random assignment per row.
 *
 * SEALED OUTPUT IS GITIGNORED. Treat as confidential until scoring complete.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

// ─── Constants ────────────────────────────────────────────

const SCRIPT_DIR = path.resolve(process.cwd(), 'scripts/voice-research/ws2');
const DEFAULT_TOPICS = path.join(SCRIPT_DIR, 'topics.csv');
const DEFAULT_OUTPUT = path.join(SCRIPT_DIR, 'output/sealed/ab-assignment.csv');

// ─── Seedable RNG (mulberry32) ───────────────────────────

/**
 * Seedable pseudo-random number generator.
 * Returns a function that produces values in [0, 1) given an integer seed.
 * Deterministic per seed — required for reproducible A/B assignment.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── CSV parsing ─────────────────────────────────────────

interface TopicRow {
  merk: string;
  content_type: string;
  topic: string;
}

function parseCsv(text: string): TopicRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('topics.csv must have at least one header row + one data row');
  }

  const header = parseCsvLine(lines[0]);
  const merkIdx = header.indexOf('merk');
  const typeIdx = header.indexOf('content_type');
  const topicIdx = header.indexOf('topic');

  if (merkIdx === -1 || typeIdx === -1 || topicIdx === -1) {
    throw new Error(
      `topics.csv header must contain "merk", "content_type", "topic" — got: ${header.join(', ')}`,
    );
  }

  const rows: TopicRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const topic = cells[topicIdx]?.trim();
    if (!topic || topic.startsWith('REPLACE:')) {
      throw new Error(
        `Row ${i + 1}: topic still placeholder "${topic}" — fill in real topics before generating assignment.`,
      );
    }
    rows.push({
      merk: cells[merkIdx]?.trim() ?? '',
      content_type: cells[typeIdx]?.trim() ?? '',
      topic,
    });
  }
  return rows;
}

/**
 * Minimal CSV-line parser — handles double-quoted fields with embedded commas.
 * Does NOT handle escaped quotes inside quoted fields (not needed for our format).
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function quoteCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Validation ───────────────────────────────────────────

const VALID_LONG_FORM_TYPES = new Set([
  'whitepaper',
  'case-study',
  'blog-post',
  'ebook',
  'pillar-page',
  'research-paper',
  'resource-guide',
  'feature-article',
]);

function validateRow(row: TopicRow, lineNumber: number): void {
  if (!VALID_LONG_FORM_TYPES.has(row.content_type)) {
    throw new Error(
      `Row ${lineNumber}: content_type "${row.content_type}" is not a long-form type. ` +
        `Valid: ${Array.from(VALID_LONG_FORM_TYPES).join(', ')}`,
    );
  }
}

// ─── CLI parsing ──────────────────────────────────────────

interface CliArgs {
  topicsPath: string;
  outputPath: string;
  seed?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { topicsPath: DEFAULT_TOPICS, outputPath: DEFAULT_OUTPUT };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--topics=')) args.topicsPath = arg.slice('--topics='.length);
    else if (arg.startsWith('--output=')) args.outputPath = arg.slice('--output='.length);
    else if (arg.startsWith('--seed=')) {
      const n = parseInt(arg.slice('--seed='.length), 10);
      if (!isNaN(n)) args.seed = n;
    }
  }
  return args;
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log('━'.repeat(72));
  console.log('WS2 — Sealed A/B assignment generator');
  console.log(`Topics:  ${args.topicsPath}`);
  console.log(`Output:  ${args.outputPath}`);
  console.log('━'.repeat(72));

  // Read + parse topics
  let topicsText: string;
  try {
    topicsText = await readFile(args.topicsPath, 'utf-8');
  } catch {
    console.error(`\nERROR: Topics file not found at ${args.topicsPath}`);
    console.error(
      `Hint: copy topics-template.csv to topics.csv, fill in 6 real topics (3 merken × 2 types).`,
    );
    process.exit(1);
  }

  const rows = parseCsv(topicsText);
  rows.forEach((r, i) => validateRow(r, i + 2));

  console.log(`\nParsed ${rows.length} topic rows`);
  if (rows.length !== 6) {
    console.warn(
      `⚠ Expected 6 rows (3 merken × 2 content_types) per protocol §2; got ${rows.length}`,
    );
  }

  // Generate seed (deterministic if provided, else cryptographic random)
  const seed = args.seed ?? randomBytes(4).readUInt32BE(0);
  console.log(`\nSeed: ${seed} (${args.seed !== undefined ? 'provided' : 'random'})`);
  const rng = mulberry32(seed);

  // Random assignment per row
  type SealedRow = TopicRow & {
    v1_condition: 'BASELINE' | 'PROPAGATION';
    v2_condition: 'BASELINE' | 'PROPAGATION';
  };
  const sealed: SealedRow[] = rows.map((r) => {
    const baselineFirst = rng() < 0.5;
    return {
      ...r,
      v1_condition: baselineFirst ? 'BASELINE' : 'PROPAGATION',
      v2_condition: baselineFirst ? 'PROPAGATION' : 'BASELINE',
    };
  });

  // Verify exactly 50/50 split per condition (sanity)
  const v1Baseline = sealed.filter((r) => r.v1_condition === 'BASELINE').length;
  const v2Baseline = sealed.filter((r) => r.v2_condition === 'BASELINE').length;
  console.log(`\nSplit check: V1=BASELINE in ${v1Baseline}/${rows.length} rows (expected balanced ±1)`);

  // Write CSV
  const lines = [
    `# WS2 sealed A/B assignment — generated ${new Date().toISOString()}`,
    `# Seed: ${seed} — DO NOT REVEAL until rater scoring complete`,
    `# Per protocol §7.1: blind labels v1/v2 are arbitrary; conditions BASELINE/PROPAGATION`,
    `# are revealed post-scoring for analysis attribution.`,
    'merk,content_type,topic,v1_condition,v2_condition,seed',
    ...sealed.map((r) =>
      [r.merk, r.content_type, quoteCsvCell(r.topic), r.v1_condition, r.v2_condition, seed].join(
        ',',
      ),
    ),
  ];

  await mkdir(path.dirname(args.outputPath), { recursive: true });
  await writeFile(args.outputPath, lines.join('\n') + '\n', 'utf-8');

  console.log(`\n✓ Wrote sealed assignment to ${args.outputPath}`);
  console.log(`\nSEALED — DO NOT SHARE WITH RATERS until scoring complete.`);
  console.log(`This file is gitignored. Backup safely if you need to recover the seed.`);
}

main().catch((err) => {
  console.error('Assignment generation failed:', err);
  process.exit(1);
});
