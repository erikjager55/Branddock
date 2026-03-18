// =============================================================================
// Are.na API Client — Context enrichment for strategy generation
// Fetches curated cultural/strategic content from Are.na channels
// =============================================================================

// ─── Types ──────────────────────────────────────────────────

/** A single content block extracted from Are.na */
export interface ArenaBlock {
  /** The text content or link title */
  content: string;
  /** Source channel name */
  channelTitle: string;
  /** Source channel slug */
  channelSlug: string;
  /** Which query layer produced this block */
  queryLayer: 'strategic' | 'human' | 'creative';
}

/** Metadata about the Are.na enrichment for tracking */
export interface ArenaEnrichmentMeta {
  /** Channels that contributed blocks */
  channels: Array<{ title: string; slug: string; blockCount: number }>;
  /** Block count per query layer */
  layerCounts: { strategic: number; human: number; creative: number };
  /** Total blocks included */
  totalBlocks: number;
  /** Queries that were executed */
  queries: string[];
}

/** Complete result from the Are.na enrichment step */
export interface ArenaEnrichmentResult {
  /** Formatted context string for the prompt (empty string if no results) */
  contextText: string;
  /** Tracking metadata (null if enrichment was skipped/failed) */
  meta: ArenaEnrichmentMeta | null;
}

/** Raw Are.na API search response (partial — only fields we use) */
interface ArenaSearchResponse {
  blocks?: Array<{
    id: number;
    class: string;
    title?: string;
    content?: string;
    description?: string;
    generated_title?: string;
  }>;
  channels?: Array<{
    id: number;
    title: string;
    slug: string;
  }>;
}

// ─── Constants ──────────────────────────────────────────────

const ARENA_BASE_URL = 'https://api.are.na/v2';
const SEARCH_PER_PAGE = 8;
const MAX_TOTAL_BLOCKS = 30;
const FETCH_TIMEOUT_MS = 8000;

// ─── Fetch Helpers ──────────────────────────────────────────

let warnedNoToken = false;

function getAuthHeaders(): Record<string, string> {
  const token = process.env.ARENA_API_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  if (!warnedNoToken) {
    console.warn('[arena] ARENA_API_TOKEN not set — using unauthenticated access (lower rate limits)');
    warnedNoToken = true;
  }
  return {};
}

/**
 * Search Are.na for blocks matching a query.
 * Returns filtered blocks (Text and Link-with-title only).
 */
async function searchArena(query: string): Promise<{
  blocks: Array<{ content: string; channelTitle: string; channelSlug: string }>;
  channels: Array<{ title: string; slug: string }>;
}> {
  const url = `${ARENA_BASE_URL}/search?q=${encodeURIComponent(query)}&per=${SEARCH_PER_PAGE}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
        'Accept': 'application/json',
      },
      signal: controller.signal,
      // Cache Are.na results for 1 hour via Next.js fetch cache (only effective in Route Handler context)
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`[arena] Search failed for "${query}": ${res.status} ${res.statusText}`);
      return { blocks: [], channels: [] };
    }

    const data = (await res.json()) as ArenaSearchResponse;

    // Extract usable text from blocks
    const blocks = (data.blocks ?? [])
      .filter(block => {
        // Keep Text blocks and Link blocks that have a title/description
        if (block.class === 'Text' && block.content) return true;
        if (block.class === 'Link' && (block.title || block.generated_title)) return true;
        return false;
      })
      .map(block => {
        // Prefer content > title > description > generated_title
        const content = (
          block.content ||
          block.title ||
          block.description ||
          block.generated_title ||
          ''
        ).trim();

        return {
          content,
          // Blocks from search don't have channel info directly,
          // but we track the query context
          channelTitle: '',
          channelSlug: '',
        };
      })
      .filter(b => b.content.length > 0);

    const channels = (data.channels ?? []).map(ch => ({
      title: ch.title,
      slug: ch.slug,
    }));

    return { blocks, channels };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('abort')) {
      console.warn(`[arena] Search timed out for "${query}" after ${FETCH_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[arena] Search error for "${query}": ${msg}`);
    }
    return { blocks: [], channels: [] };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Main Enrichment Function ───────────────────────────────

/**
 * Fetch Are.na context for strategy enrichment.
 * Runs 3 parallel searches, deduplicates, and formats as prompt context.
 * Never throws — returns empty result on any failure.
 */
export async function fetchArenaContext(
  queries: Array<{ query: string; layer: 'strategic' | 'human' | 'creative' }>,
): Promise<ArenaEnrichmentResult> {
  if (queries.length === 0) {
    return { contextText: '', meta: null };
  }

  try {
    // Run all queries in parallel — failures don't block success
    const results = await Promise.allSettled(
      queries.map(async ({ query, layer }) => {
        const result = await searchArena(query);
        return {
          layer,
          query,
          blocks: result.blocks.map(b => ({ ...b, queryLayer: layer })),
          channels: result.channels,
        };
      }),
    );

    // Collect all blocks and channels
    const allBlocks: ArenaBlock[] = [];
    const allChannels: Array<{ title: string; slug: string; blockCount: number }> = [];
    const executedQueries: string[] = [];
    const layerCounts = { strategic: 0, human: 0, creative: 0 };

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const { layer, query, blocks, channels } = result.value;

      executedQueries.push(query);

      for (const block of blocks) {
        allBlocks.push({
          content: block.content,
          channelTitle: block.channelTitle,
          channelSlug: block.channelSlug,
          queryLayer: layer,
        });
      }

      // NOTE: Are.na search returns channels matching the query, NOT the channels
      // containing the returned blocks. blockCount is an estimate, not exact attribution.
      for (const ch of channels) {
        const existing = allChannels.find(c => c.slug === ch.slug);
        if (existing) {
          existing.blockCount += blocks.length;
        } else {
          allChannels.push({ ...ch, blockCount: blocks.length });
        }
      }
    }

    // Deduplicate by content string (case-insensitive, trimmed)
    const seen = new Set<string>();
    const dedupedBlocks = allBlocks.filter(block => {
      const key = block.content.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Cap at MAX_TOTAL_BLOCKS
    const finalBlocks = dedupedBlocks.slice(0, MAX_TOTAL_BLOCKS);

    if (finalBlocks.length === 0) {
      return { contextText: '', meta: null };
    }

    // Count per layer
    for (const block of finalBlocks) {
      layerCounts[block.queryLayer]++;
    }

    // Format as prompt context
    const contextText = formatArenaContext(finalBlocks, allChannels);

    return {
      contextText,
      meta: {
        channels: allChannels,
        layerCounts,
        totalBlocks: finalBlocks.length,
        queries: executedQueries,
      },
    };
  } catch (error) {
    console.warn('[arena] Enrichment failed, proceeding without Are.na context:', error);
    return { contextText: '', meta: null };
  }
}

// ─── Prompt Formatter ───────────────────────────────────────

/**
 * Format Are.na blocks as a markdown section for the strategy prompt.
 * Groups by query layer with source attribution.
 */
function formatArenaContext(
  blocks: ArenaBlock[],
  channels: Array<{ title: string; slug: string; blockCount: number }>,
): string {
  const strategic = blocks.filter(b => b.queryLayer === 'strategic');
  const human = blocks.filter(b => b.queryLayer === 'human');
  const creative = blocks.filter(b => b.queryLayer === 'creative');

  const parts: string[] = [];

  if (strategic.length > 0) {
    parts.push('### Strategic Associations');
    parts.push(strategic.map(b => `- ${truncate(b.content, 300)}`).join('\n'));
  }

  if (human.length > 0) {
    parts.push('### Human & Behavioral Patterns');
    parts.push(human.map(b => `- ${truncate(b.content, 300)}`).join('\n'));
  }

  if (creative.length > 0) {
    parts.push('### Creative & Cultural References');
    parts.push(creative.map(b => `- ${truncate(b.content, 300)}`).join('\n'));
  }

  // Add source attribution
  if (channels.length > 0) {
    const channelList = channels
      .slice(0, 10)
      .map(c => c.title)
      .join(', ');
    parts.push(`\n_Sources: Are.na channels — ${channelList}_`);
  }

  return parts.join('\n\n');
}

/** Truncate text to a maximum length, adding ellipsis if needed */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
