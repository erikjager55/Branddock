import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { getStorageProvider } from "@/lib/storage";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { validateBinaryFile } from "@/lib/security/file-validator";
import type { FontRole } from "@/features/brandstyle/types/brandstyle.types";

const ALLOWED_FONT_EXTENSIONS = ["woff2", "woff", "ttf", "otf"] as const;
const ALLOWED_FONT_MIMES: ReadonlySet<string> = new Set([
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-otf",
]);
const MAX_FONT_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_ROLES: FontRole[] = ["DISPLAY", "UI", "EYEBROW_META", "BODY"];

// =============================================================
// GET /api/brandstyle/fonts — list fonts for workspace styleguide
// =============================================================
export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const fonts = await prisma.styleguideFont.findMany({
      where: { workspaceId },
      orderBy: [{ role: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ fonts });
  } catch (error) {
    console.error("[GET /api/brandstyle/fonts]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/brandstyle/fonts — upload a font file (multipart)
// Fields: file (File), name (string), role (FontRole), weight?, style?
// If a DETECTED font with matching name exists, upgrade it to UPLOADED
// instead of creating a duplicate.
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
    const rawName = formData.get("name");
    const rawRole = formData.get("role");
    const rawWeight = formData.get("weight");
    const rawStyle = formData.get("style");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const role = typeof rawRole === "string" ? rawRole : "UI";
    if (!name) return NextResponse.json({ error: "Missing name field" }, { status: 400 });
    if (!VALID_ROLES.includes(role as FontRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Validate extension + size
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_FONT_EXTENSIONS.includes(ext as typeof ALLOWED_FONT_EXTENSIONS[number])) {
      return NextResponse.json(
        { error: `Invalid font type. Allowed: ${ALLOWED_FONT_EXTENSIONS.join(", ")}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FONT_SIZE) {
      return NextResponse.json({ error: "Font too large (max 5MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic-byte validation for fonts — blocks malicious binaries
    // dressed up as font files (e.g. an EXE renamed to .woff2).
    const contentCheck = await validateBinaryFile(buffer, ALLOWED_FONT_MIMES);
    if (!contentCheck.ok) {
      return NextResponse.json(
        { error: contentCheck.error ?? "Invalid font content" },
        { status: 400 },
      );
    }

    const contentType =
      ext === "woff2" ? "font/woff2" :
      ext === "woff" ? "font/woff" :
      ext === "ttf" ? "font/ttf" :
      "font/otf";

    const storage = getStorageProvider();
    const result = await storage.upload(buffer, {
      workspaceId,
      fileName: file.name,
      contentType,
      generateThumbnail: false,
    });

    // Try to upgrade a DETECTED record with matching name, else create new
    const existingDetected = await prisma.styleguideFont.findFirst({
      where: {
        workspaceId,
        styleguideId: styleguide.id,
        source: "DETECTED",
        name: { equals: name, mode: "insensitive" },
      },
    });

    const font = existingDetected
      ? await prisma.styleguideFont.update({
          where: { id: existingDetected.id },
          data: {
            source: "UPLOADED",
            availability: "UPLOADED",
            role: role as FontRole,
            fileUrl: result.url,
            fileName: file.name,
            fileType: ext,
            fileSize: result.fileSize,
            fontFamily: name,
            weight: typeof rawWeight === "string" && rawWeight ? rawWeight : null,
            style: typeof rawStyle === "string" && rawStyle ? rawStyle : null,
            uploadedById: session.user.id,
          },
        })
      : await prisma.styleguideFont.create({
          data: {
            styleguideId: styleguide.id,
            workspaceId,
            name,
            role: role as FontRole,
            source: "UPLOADED",
            availability: "UPLOADED",
            fileUrl: result.url,
            fileName: file.name,
            fileType: ext,
            fileSize: result.fileSize,
            fontFamily: name,
            weight: typeof rawWeight === "string" && rawWeight ? rawWeight : null,
            style: typeof rawStyle === "string" && rawStyle ? rawStyle : null,
            uploadedById: session.user.id,
          },
        });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ font }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/fonts]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
