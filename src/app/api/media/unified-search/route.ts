// =============================================================
// GET /api/media/unified-search
//
// Pattern G3 image-quality-chain — unified result grid combinerend
// workspace library (semantic via pgvector) + Pexels (keyword API).
// Verving van de tab-separated UX in ImageSourcePanel waar gebruiker
// expliciet moest kiezen tussen Library / Stock voordat hij zocht.
//
// Query: q (min 3 chars), limit (default 12, max 24)
// Response: { results: UnifiedSearchResult[] } gesorteerd op
//           similarity desc (library) → Pexels resultaten daarna.
//
// Brandfetch + Unsplash deferred post-launch (geen API keys; zie roadmap).
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { findSimilarMediaAssets } from "@/lib/media/embedding-search";

interface UnifiedSearchResult {
  id: string;
  source: "library" | "pexels";
  url: string;
  thumbnailUrl: string;
  alt: string | null;
  /** 0-1 cosine-similarity voor library, null voor Pexels (geen score). */
  similarity: number | null;
  license: string;
  /** Voor library: MediaAsset.id. Voor Pexels: Pexels-photo-id. */
  sourceId: string;
  attribution: { name: string; url: string } | null;
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large: string;
    medium: string;
    small: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

async function searchPexels(query: string, limit: number): Promise<UnifiedSearchResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(Math.min(limit, 15)));
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PexelsResponse;
    return (data.photos ?? []).map((p) => ({
      id: `pexels-${p.id}`,
      source: "pexels" as const,
      url: p.src.large,
      thumbnailUrl: p.src.medium,
      alt: p.alt ?? null,
      similarity: null,
      license: "Pexels free use",
      sourceId: String(p.id),
      attribution: {
        name: p.photographer,
        url: p.photographer_url,
      },
    }));
  } catch (err) {
    console.warn(
      "[unified-search] Pexels error:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

async function searchLibrary(
  workspaceId: string,
  query: string,
  limit: number,
): Promise<UnifiedSearchResult[]> {
  try {
    const matches = await findSimilarMediaAssets(workspaceId, query, {
      threshold: 0.5,
      limit,
      mediaType: "IMAGE",
    });
    return matches.map((m) => ({
      id: `library-${m.id}`,
      source: "library" as const,
      url: m.fileUrl,
      thumbnailUrl: m.thumbnailUrl ?? m.fileUrl,
      alt: m.aiDescription ?? m.name,
      similarity: m.similarity,
      license: "Workspace asset",
      sourceId: m.id,
      attribution: null,
    }));
  } catch (err) {
    console.warn(
      "[unified-search] library error:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const limitRaw = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitRaw) && limitRaw >= 1 && limitRaw <= 24
        ? Math.floor(limitRaw)
        : 12;

    // Parallel fetch — splits limit gelijk over bronnen voor v1.
    const halfLimit = Math.ceil(limit / 2);
    const [libraryResults, pexelsResults] = await Promise.all([
      searchLibrary(workspaceId, q, halfLimit),
      searchPexels(q, halfLimit),
    ]);

    // Library eerst (workspace-asset = sterkst brand-fit signaal),
    // dan Pexels. Library is al gesorteerd op similarity desc.
    const results: UnifiedSearchResult[] = [
      ...libraryResults,
      ...pexelsResults,
    ].slice(0, limit);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[GET /api/media/unified-search]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
