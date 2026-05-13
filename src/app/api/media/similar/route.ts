// =============================================================================
// GET /api/media/similar?keywords=... — F42-bis (audit 2026-05-13)
//
// Match MediaAssets uit Media Library tegen briefingText keywords. Gebruikt
// aiTags overlap (gevuld door F41 DAM auto-tagger). Returnt top-N matches
// gesorteerd op aiTags-overlap-count.
//
// Voor Cross-content asset reuse: blog-hero kan herbruikt worden in social-
// variants zonder regenerate als de tags overeenstemmen met de nieuwe brief.
// =============================================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

// Common Dutch + English stopwords die we NIET als match-keywords willen
// gebruiken (vermijdt false-positives waar elke asset op "een", "de", "het"
// matched).
const STOPWORDS = new Set([
  'een', 'het', 'de', 'van', 'op', 'in', 'met', 'voor', 'aan', 'is', 'en',
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'and', 'or', 'for', 'with',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 20);
}

export async function GET(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const keywordsParam = url.searchParams.get('keywords') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '6', 10) || 6, 20);
    const keywords = extractKeywords(keywordsParam);

    if (keywords.length === 0) {
      return NextResponse.json({ matches: [], reason: 'No keywords to match against' });
    }

    // Fetch tagged image-assets (eerste cap op 200 zodat we client-side rank)
    const candidates = await prisma.mediaAsset.findMany({
      where: {
        workspaceId,
        mediaType: 'IMAGE',
        isArchived: false,
        // Alleen assets die aiTags hebben (DAM-getagged)
        NOT: { aiTags: { isEmpty: true } },
      },
      select: { id: true, fileUrl: true, name: true, thumbnailUrl: true, aiTags: true, aiDescription: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    // Score per asset = aantal keyword-matches in aiTags (case-insensitive,
    // strip 'style:' en 'auth:' prefixes uit F41 die geen content-tags zijn)
    const scored = candidates
      .map((c) => {
        const cleanTags = (c.aiTags ?? [])
          .map((t) => t.toLowerCase().replace(/^(style|auth):/, ''))
          .filter(Boolean);
        const matched = keywords.filter((k) =>
          cleanTags.some((tag) => tag.includes(k) || k.includes(tag)),
        );
        return {
          asset: {
            id: c.id,
            fileUrl: c.fileUrl,
            thumbnailUrl: c.thumbnailUrl,
            name: c.name,
            aiDescription: c.aiDescription,
          },
          matchCount: matched.length,
          matchedKeywords: matched,
        };
      })
      .filter((s) => s.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, limit);

    return NextResponse.json({
      matches: scored,
      reason:
        scored.length === 0
          ? 'No tagged assets matched the provided keywords'
          : undefined,
    });
  } catch (err) {
    console.error('[GET /api/media/similar]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
