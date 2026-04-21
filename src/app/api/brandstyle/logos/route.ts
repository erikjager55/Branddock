import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { getStorageProvider } from "@/lib/storage";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { validateBinaryFile, validateSvgContent } from "@/lib/security/file-validator";
import type { LogoVariant } from "@/features/brandstyle/types/brandstyle.types";

const ALLOWED_LOGO_EXTENSIONS = ["svg", "png", "jpg", "jpeg"] as const;
const RASTER_MIMES: ReadonlySet<string> = new Set(["image/png", "image/jpeg"]);
const MAX_LOGO_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_VARIANTS: LogoVariant[] = ["PRIMARY", "LIGHT", "DARK", "ICON", "WORDMARK", "LOCKUP"];

// =============================================================
// GET /api/brandstyle/logos — list logos for workspace styleguide
// =============================================================
export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const logos = await prisma.styleguideLogo.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ logos });
  } catch (error) {
    console.error("[GET /api/brandstyle/logos]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/brandstyle/logos — upload a logo file (multipart)
// Fields: file (File), variant (LogoVariant), description?
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { id: true },
    });
    if (!styleguide) return NextResponse.json({ error: "No styleguide found" }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file");
    const rawVariant = formData.get("variant");
    const rawDescription = formData.get("description");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    const variant = typeof rawVariant === "string" ? rawVariant : "PRIMARY";
    if (!VALID_VARIANTS.includes(variant as LogoVariant)) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }

    const extRaw = file.name.split(".").pop()?.toLowerCase() ?? "";
    const ext = extRaw === "jpeg" ? "jpg" : extRaw;
    if (!ALLOWED_LOGO_EXTENSIONS.includes(extRaw as typeof ALLOWED_LOGO_EXTENSIONS[number])) {
      return NextResponse.json(
        { error: `Invalid logo type. Allowed: ${ALLOWED_LOGO_EXTENSIONS.join(", ")}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: "Logo too large (max 10MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic-byte MIME validation. SVG gets a separate XML/script-scrub
    // path because file-type can't detect text-based formats reliably.
    if (ext === "svg") {
      const svgCheck = validateSvgContent(buffer);
      if (!svgCheck.ok) {
        return NextResponse.json(
          { error: svgCheck.error ?? "Invalid SVG content" },
          { status: 400 },
        );
      }
    } else {
      const rasterCheck = await validateBinaryFile(buffer, RASTER_MIMES);
      if (!rasterCheck.ok) {
        return NextResponse.json(
          { error: rasterCheck.error ?? "Invalid image content" },
          { status: 400 },
        );
      }
    }

    const contentType =
      ext === "svg" ? "image/svg+xml" :
      ext === "png" ? "image/png" :
      "image/jpeg";

    const storage = getStorageProvider();
    // SVGs don't need thumbnail generation; storage provider skips it anyway.
    const result = await storage.upload(buffer, {
      workspaceId,
      fileName: file.name,
      contentType,
      generateThumbnail: ext !== "svg",
    });

    const existingCount = await prisma.styleguideLogo.count({
      where: { workspaceId, styleguideId: styleguide.id },
    });

    const logo = await prisma.styleguideLogo.create({
      data: {
        styleguideId: styleguide.id,
        workspaceId,
        variant: variant as LogoVariant,
        fileUrl: result.url,
        fileName: file.name,
        fileType: ext,
        fileSize: result.fileSize,
        width: result.width ?? null,
        height: result.height ?? null,
        description: typeof rawDescription === "string" && rawDescription.trim() ? rawDescription.trim() : null,
        sortOrder: existingCount,
        uploadedById: session.user.id,
      },
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ logo }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/logos]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
