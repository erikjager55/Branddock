/**
 * WS3 Corpus Extractor — pulls existing long-form content from Branddock workspaces
 * for the disagreement-meting between quality-scorer Voice-dimension and mStyleDistance.
 *
 * See:
 *   - docs/voice-fingerprinting-ws2-protocol.md §6 (WS3 scope: scenario B, LINFI-anchored pool)
 *   - scripts/voice-research/ws3/README.md (full pipeline)
 *
 * Pre-registered scope (v0.2):
 *   - LINFI as brand-anchor (sufficient n for centroid-training)
 *   - Multi-workspace pool: Linfi + Napking + Branddock Demo + People Masterminds + Zwarthout + Better brands
 *   - Approved-status RELAXED — include DRAFT/IN_PROGRESS/APPROVED/PUBLISHED. Status is not
 *     methodologically relevant for a between-scorer correlation measurement.
 *   - Long-form content types: whitepaper, case-study, blog-post, ebook, pillar-page,
 *     research-paper, resource-guide, feature-article, thought-leadership
 *
 * Output: scripts/voice-research/ws3/output/corpus.jsonl
 *   One JSON object per line, each describing one Deliverable's selected text content.
 *
 * Usage:
 *   tsx scripts/voice-research/ws3/extract-corpus.ts
 *
 * Optional flags:
 *   --min-words=N        Filter pieces with fewer than N words (default: 500)
 *   --output=PATH        Override output path (default: scripts/voice-research/ws3/output/corpus.jsonl)
 *   --workspaces=a,b,c   Override workspace slugs (default: scenario B pool)
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

import { prisma } from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────

const LONG_FORM_CONTENT_TYPES = [
  'whitepaper',
  'case-study',
  'blog-post',
  'ebook',
  'pillar-page',
  'research-paper',
  'resource-guide',
  'feature-article',
  'thought-leadership',
];

/**
 * Scenario B workspace pool from protocol §6.2.
 * LINFI = brand-anchor (sufficient n for centroid). Other 5 = pool extension for n≥30 target.
 */
const DEFAULT_WORKSPACE_SLUGS = [
  'linfi',
  'napking',
  'branddock-demo',
  'people-masterminds',
  'zwarthout',
  'better-brands',
];

const DEFAULT_MIN_WORDS = 500;

// ─── Types ────────────────────────────────────────────────

interface CorpusItem {
  /** Stable Deliverable ID — primary key for cross-referencing with voice-scores + embeddings */
  id: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  /** Used to mark LINFI as the brand-anchor for centroid training, others as pool */
  isBrandAnchor: boolean;
  campaignId: string;
  contentType: string;
  title: string;
  /** Concatenated text from isSelected DeliverableComponents */
  content: string;
  wordCount: number;
  charCount: number;
  status: string;
  approvalStatus: string;
  createdAt: string;
  /** How many selected components contributed to the content */
  componentCount: number;
}

interface CliArgs {
  minWords: number;
  outputPath: string;
  workspaceSlugs: string[];
}

interface ExtractStats {
  workspacesQueried: number;
  deliverablesFound: number;
  deliverablesIncluded: number;
  deliverablesSkippedNoContent: number;
  deliverablesSkippedTooShort: number;
  perWorkspace: Record<string, { found: number; included: number }>;
}

// ─── CLI parsing ──────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  let minWords = DEFAULT_MIN_WORDS;
  let outputPath = path.resolve(
    process.cwd(),
    'scripts/voice-research/ws3/output/corpus.jsonl',
  );
  let workspaceSlugs = DEFAULT_WORKSPACE_SLUGS;

  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--min-words=')) {
      const n = parseInt(arg.slice('--min-words='.length), 10);
      if (!isNaN(n) && n >= 0) minWords = n;
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.slice('--output='.length);
    } else if (arg.startsWith('--workspaces=')) {
      workspaceSlugs = arg
        .slice('--workspaces='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return { minWords, outputPath, workspaceSlugs };
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  console.log('━'.repeat(72));
  console.log('WS3 Corpus Extractor — Voice Fingerprinting disagreement measurement');
  console.log(`Workspaces: ${args.workspaceSlugs.join(', ')}`);
  console.log(`Min words:  ${args.minWords}`);
  console.log(`Output:     ${args.outputPath}`);
  console.log('━'.repeat(72));

  // Resolve workspaces by slug
  const workspaces = await prisma.workspace.findMany({
    where: { slug: { in: args.workspaceSlugs } },
    select: { id: true, slug: true, name: true },
  });
  const workspacesBySlug = new Map(workspaces.map((w) => [w.slug, w]));

  for (const slug of args.workspaceSlugs) {
    if (!workspacesBySlug.has(slug)) {
      console.warn(`⚠ Workspace not found: ${slug} — skipping`);
    }
  }

  if (workspaces.length === 0) {
    console.error('No workspaces resolved. Aborting.');
    process.exit(1);
  }

  const workspaceIds = workspaces.map((w) => w.id);

  // Pull all candidate Deliverables with their selected components
  const deliverables = await prisma.deliverable.findMany({
    where: {
      contentType: { in: LONG_FORM_CONTENT_TYPES },
      campaign: { workspaceId: { in: workspaceIds } },
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      status: true,
      approvalStatus: true,
      createdAt: true,
      campaignId: true,
      campaign: { select: { workspaceId: true } },
      components: {
        where: { isSelected: true },
        select: { id: true, variantGroup: true, generatedContent: true, variantIndex: true },
        orderBy: [{ variantGroup: 'asc' }, { variantIndex: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats: ExtractStats = {
    workspacesQueried: workspaces.length,
    deliverablesFound: deliverables.length,
    deliverablesIncluded: 0,
    deliverablesSkippedNoContent: 0,
    deliverablesSkippedTooShort: 0,
    perWorkspace: {},
  };

  // Initialize per-workspace counters
  for (const w of workspaces) {
    stats.perWorkspace[w.slug] = { found: 0, included: 0 };
  }

  const items: CorpusItem[] = [];

  for (const d of deliverables) {
    const workspace = workspaces.find((w) => w.id === d.campaign.workspaceId);
    if (!workspace) continue; // shouldn't happen

    stats.perWorkspace[workspace.slug].found += 1;

    // Concatenate selected component text. Each component is one variant group's chosen variant.
    // Skip empty/null content. Preserve group ordering for natural reading flow.
    const contentParts = d.components
      .map((c) => (c.generatedContent ?? '').trim())
      .filter((s) => s.length > 0);

    if (contentParts.length === 0) {
      stats.deliverablesSkippedNoContent += 1;
      continue;
    }

    const content = contentParts.join('\n\n');
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    if (wordCount < args.minWords) {
      stats.deliverablesSkippedTooShort += 1;
      continue;
    }

    items.push({
      id: d.id,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      workspaceName: workspace.name,
      isBrandAnchor: workspace.slug === 'linfi',
      campaignId: d.campaignId,
      contentType: d.contentType ?? 'unknown',
      title: d.title,
      content,
      wordCount,
      charCount: content.length,
      status: d.status,
      approvalStatus: d.approvalStatus,
      createdAt: d.createdAt.toISOString(),
      componentCount: contentParts.length,
    });
    stats.perWorkspace[workspace.slug].included += 1;
    stats.deliverablesIncluded += 1;
  }

  // Write JSONL
  await mkdir(path.dirname(args.outputPath), { recursive: true });
  const jsonl = items.map((item) => JSON.stringify(item)).join('\n') + '\n';
  await writeFile(args.outputPath, jsonl, 'utf-8');

  // Report
  console.log('\n─── Extract complete ───');
  console.log(
    `Total deliverables found:    ${stats.deliverablesFound} (across ${stats.workspacesQueried} workspaces)`,
  );
  console.log(`  - Included in corpus:      ${stats.deliverablesIncluded}`);
  console.log(`  - Skipped (no content):    ${stats.deliverablesSkippedNoContent}`);
  console.log(
    `  - Skipped (< ${args.minWords} words): ${stats.deliverablesSkippedTooShort}`,
  );
  console.log('\nPer workspace:');
  for (const [slug, counts] of Object.entries(stats.perWorkspace)) {
    const anchor = slug === 'linfi' ? ' (brand-anchor)' : '';
    console.log(`  ${slug.padEnd(22)} ${counts.included}/${counts.found}${anchor}`);
  }

  // Word-count distribution
  if (items.length > 0) {
    const wordCounts = items.map((i) => i.wordCount).sort((a, b) => a - b);
    const min = wordCounts[0];
    const max = wordCounts[wordCounts.length - 1];
    const median = wordCounts[Math.floor(wordCounts.length / 2)];
    const total = wordCounts.reduce((s, n) => s + n, 0);
    console.log('\nWord-count distribution:');
    console.log(`  min: ${min}    median: ${median}    max: ${max}    total: ${total}`);
  }

  // LINFI split for centroid training (per protocol §6.2)
  const linfiItems = items.filter((i) => i.workspaceSlug === 'linfi');
  if (linfiItems.length >= 4) {
    const splitIdx = Math.floor(linfiItems.length / 2);
    console.log(
      `\nLINFI corpus: ${linfiItems.length} pieces → split ${splitIdx} centroid-training / ${linfiItems.length - splitIdx} test-set`,
    );
  } else {
    console.warn(
      `\n⚠ LINFI corpus only ${linfiItems.length} pieces — too few for meaningful centroid training. Consider relaxing --min-words.`,
    );
  }

  console.log(`\n✓ Wrote ${items.length} items to ${args.outputPath}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Extract failed:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
