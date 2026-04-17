// =============================================================
// POST /api/competitors/discover — Auto-discover relevant competitors
// Uses brand context + Exa neural search + Claude ranking
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { createClaudeStructuredCompletion } from '@/lib/ai/exploration/ai-caller';

const EXA_BASE_URL = 'https://api.exa.ai';
const FETCH_TIMEOUT_MS = 10000;

// ─── Types ──────────────────────────────────────────────

interface DiscoveredCompetitor {
  name: string;
  websiteUrl: string;
  description: string;
  relevanceScore: number;
  relevanceReason: string;
  tier: 'DIRECT' | 'INDIRECT' | 'ASPIRATIONAL';
}

interface ExaResult {
  title?: string;
  url?: string;
  text?: string;
}

// ─── Route Handler ──────────────────────────────────────

export async function POST() {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Gather brand context from workspace
    const [workspace, brandAssets, products, existingCompetitors] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, websiteUrl: true },
      }),
      prisma.brandAsset.findMany({
        where: { workspaceId },
        select: { name: true, slug: true, content: true },
        take: 5,
      }),
      prisma.product.findMany({
        where: { workspaceId },
        select: { name: true, description: true, category: true },
        take: 5,
      }),
      prisma.competitor.findMany({
        where: { workspaceId },
        select: { name: true, websiteUrl: true },
      }),
    ]);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const brandName = workspace.name;
    // Derive industry/description from brand assets if available
    const purposeAsset = brandAssets.find((a) => a.slug === 'purpose-statement' || a.slug === 'brand-essence');
    const brandDescription = typeof purposeAsset?.content === 'string' ? purposeAsset.content : '';
    const industry = products.map((p) => p.category).filter(Boolean).join(', ') || '';
    const productNames = products.map((p) => p.name).join(', ');
    const productCategories = [...new Set(products.map((p) => p.category).filter(Boolean))].join(', ');
    const existingNames = existingCompetitors.map((c) => c.name.toLowerCase());

    // 2. Search for competitors via Exa neural search
    const queries = buildDiscoveryQueries(brandName, industry, productNames, productCategories);
    const exaResults = await searchExaMultiple(queries);

    if (exaResults.length === 0) {
      // Exa unavailable — fall back to pure AI discovery
      const aiOnly = await discoverViaAiOnly(
        brandName, industry, brandDescription, productNames, existingNames,
      );
      return NextResponse.json({ competitors: aiOnly });
    }

    // 3. Deduplicate and rank via Claude
    const ranked = await rankWithClaude(
      exaResults, brandName, industry, brandDescription, productNames, existingNames,
    );

    return NextResponse.json({ competitors: ranked });
  } catch (err) {
    console.error('[competitors/discover] Error:', err);
    return NextResponse.json(
      { error: 'Failed to discover competitors. Please try again.' },
      { status: 500 },
    );
  }
}

// ─── Exa Search ─────────────────────────────────────────

function buildDiscoveryQueries(
  brandName: string,
  industry: string,
  productNames: string,
  productCategories: string,
): string[] {
  const queries: string[] = [];

  if (industry) {
    queries.push(`leading ${industry} companies similar to ${brandName}`);
    queries.push(`top competitors and alternatives to ${brandName} in ${industry}`);
  } else {
    queries.push(`companies similar to ${brandName}`);
    queries.push(`top competitors and alternatives to ${brandName}`);
  }

  if (productNames) {
    queries.push(`companies offering ${productCategories || productNames}`);
  }

  return queries.slice(0, 3);
}

async function searchExaMultiple(queries: string[]): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const allResults: ExaResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(`${EXA_BASE_URL}/search`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          type: 'neural',
          numResults: 8,
          contents: { text: { maxCharacters: 300 } },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json() as { results?: ExaResult[] };
      for (const r of data.results ?? []) {
        if (!r.url) continue;
        try {
          const hostname = new URL(r.url).hostname;
          if (!seenUrls.has(hostname)) {
            seenUrls.add(hostname);
            allResults.push(r);
          }
        } catch {
          // Skip results with malformed URLs
        }
      }
    } catch {
      // Skip failed queries
    }
  }

  return allResults;
}

// ─── Claude Ranking ─────────────────────────────────────

async function rankWithClaude(
  exaResults: ExaResult[],
  brandName: string,
  industry: string,
  brandDescription: string,
  productNames: string,
  existingNames: string[],
): Promise<DiscoveredCompetitor[]> {
  const resultsText = exaResults
    .slice(0, 20)
    .map((r, i) => `${i + 1}. ${r.title ?? 'Unknown'} — ${r.url ?? ''}\n   ${r.text ?? ''}`)
    .join('\n\n');

  const excludeList = existingNames.length > 0
    ? `\n\nEXCLUDE these (already added): ${existingNames.join(', ')}`
    : '';

  const result = await createClaudeStructuredCompletion<{ competitors: DiscoveredCompetitor[] }>(
    `You are a competitive intelligence analyst. Given search results about companies in a market, identify the TOP 5 most relevant competitors for a specific brand. Rank by true market relevance — not just name recognition.

RULES:
1. Return exactly 5 competitors, ranked by relevanceScore (highest first)
2. relevanceScore is 0-100 based on: market overlap (40%), product similarity (30%), audience overlap (20%), competitive threat level (10%)
3. tier: DIRECT (same market, same products), INDIRECT (adjacent market or substitutes), ASPIRATIONAL (market leaders to aspire to)
4. Prefer DIRECT competitors — at least 3 of 5 should be DIRECT
5. websiteUrl must be a real, valid company URL (not a review site or directory)
6. Exclude the brand itself, review sites, directories, and news articles
7. description: 1-2 sentences about what makes them a relevant competitor
8. relevanceReason: why specifically they compete with this brand
9. Return ONLY valid JSON. No markdown.`,
    `Identify the top 5 competitors for:

Brand: ${brandName}
Industry: ${industry || 'Not specified'}
Description: ${brandDescription || 'Not available'}
Products/Services: ${productNames || 'Not specified'}
${excludeList}

Search results to analyze:
${resultsText}

Return JSON: { "competitors": [{ "name", "websiteUrl", "description", "relevanceScore" (0-100), "relevanceReason", "tier" ("DIRECT"|"INDIRECT"|"ASPIRATIONAL") }] }`,
    { temperature: 0.2, maxTokens: 2000 },
  );

  return (result.competitors ?? [])
    .filter((c) => c.name && c.websiteUrl && !existingNames.includes(c.name.toLowerCase()))
    .slice(0, 5);
}

// ─── AI-Only Fallback ───────────────────────────────────

async function discoverViaAiOnly(
  brandName: string,
  industry: string,
  brandDescription: string,
  productNames: string,
  existingNames: string[],
): Promise<DiscoveredCompetitor[]> {
  const excludeList = existingNames.length > 0
    ? `\nEXCLUDE: ${existingNames.join(', ')}`
    : '';

  const result = await createClaudeStructuredCompletion<{ competitors: DiscoveredCompetitor[] }>(
    `You are a competitive intelligence analyst. Identify the 5 most relevant real-world competitors for a brand based on the information provided. Only name companies you are confident exist and are actual competitors.

RULES:
1. Return exactly 5 competitors ranked by relevanceScore (0-100)
2. All companies must be REAL, currently operating businesses
3. websiteUrl must be their actual company website (not LinkedIn/Crunchbase)
4. tier: DIRECT (same market+products), INDIRECT (adjacent/substitutes), ASPIRATIONAL (leaders)
5. At least 3 must be DIRECT competitors
6. Return ONLY valid JSON.`,
    `Brand: ${brandName}
Industry: ${industry || 'Not specified'}
Description: ${brandDescription || 'Not available'}
Products: ${productNames || 'Not specified'}
${excludeList}

Return JSON: { "competitors": [{ "name", "websiteUrl", "description", "relevanceScore", "relevanceReason", "tier" }] }`,
    { temperature: 0.3, maxTokens: 2000 },
  );

  return (result.competitors ?? [])
    .filter((c) => c.name && c.websiteUrl && !existingNames.includes(c.name.toLowerCase()))
    .slice(0, 5);
}
