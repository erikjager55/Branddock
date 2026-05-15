// =============================================================
// GET /api/media/similar-semantic
//
// Pattern G2 image-quality-chain — semantic search MediaAsset library via
// pgvector cosine-similarity. Geconsumed door Canvas Step 2
// ReuseDetectionBanner: vóór gebruiker Generate klikt zien we of een
// vergelijkbaar beeld al in de workspace library leeft.
//
// Query params:
//   - q: query-string (briefingText of vergelijkbaar). Min 8 chars.
//   - threshold: optional 0-1 (default 0.75)
//   - limit: optional 1-12 (default 6)
//   - mediaType: optional IMAGE/VIDEO (default IMAGE)
//
// Returns 200 met { matches: SimilarMediaAsset[] } of {matches:[]} bij
// te-korte query of geen workspace-embeddings. Failure-modes geven 5xx.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { findSimilarMediaAssets } from "@/lib/media/embedding-search";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 8) {
      return NextResponse.json({ matches: [] });
    }

    const thresholdRaw = Number(searchParams.get("threshold"));
    const threshold =
      Number.isFinite(thresholdRaw) && thresholdRaw >= 0 && thresholdRaw <= 1
        ? thresholdRaw
        : 0.75;

    const limitRaw = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitRaw) && limitRaw >= 1 && limitRaw <= 12
        ? Math.floor(limitRaw)
        : 6;

    const mediaType = searchParams.get("mediaType") ?? "IMAGE";

    const matches = await findSimilarMediaAssets(workspaceId, q, {
      threshold,
      limit,
      mediaType,
    });

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[GET /api/media/similar-semantic]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message, matches: [] }, { status: 500 });
  }
}
