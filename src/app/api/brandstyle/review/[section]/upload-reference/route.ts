import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { getStorageProvider } from "@/lib/storage";
import { isValidReviewSection } from "@/lib/brandstyle/review-sections";

type RouteContext = { params: Promise<{ section: string }> };

const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp"] as const;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// =============================================================
// POST /api/brandstyle/review/[section]/upload-reference
//
// Accepts an inspirational image the user attaches to "Needs work"
// feedback. Returns the stored URL — the caller then PATCHes
// `/api/brandstyle/review/[section]` with `referenceImageUrl`.
// =============================================================
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const { section } = await context.params;
    if (!isValidReviewSection(section)) {
      return NextResponse.json({ error: `Unknown review section: ${section}` }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }

    const extRaw = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(extRaw as typeof ALLOWED_EXT[number])) {
      return NextResponse.json(
        { error: `Invalid image type. Allowed: ${ALLOWED_EXT.join(", ")}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      extRaw === "png" ? "image/png" :
      extRaw === "webp" ? "image/webp" :
      "image/jpeg";

    const storage = getStorageProvider();
    const result = await storage.upload(buffer, {
      workspaceId,
      fileName: `review-${section}-${Date.now()}.${extRaw}`,
      contentType,
      generateThumbnail: false,
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("[POST /api/brandstyle/review/:section/upload-reference]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
