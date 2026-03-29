import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { getStorageProvider } from "@/lib/storage";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { isPrivateHostname } from "@/lib/utils/ssrf";
import { generateMediaSlug, detectMediaType } from "@/features/media-library/utils/media-utils";

/** Extract a filename from URL or Content-Disposition header */
function extractFileName(url: string, contentDisposition?: string | null): string {
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      return match[1].replace(/['"]/g, "").trim();
    }
  }
  const urlPath = new URL(url).pathname;
  const segments = urlPath.split("/").filter(Boolean);
  return segments[segments.length - 1] || "imported-file";
}

/** POST /api/media/import-url — import media from a URL */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, name, category } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Block private/internal IPs (SSRF protection)
    if (isPrivateHostname(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "URL points to a private/internal address" },
        { status: 400 }
      );
    }

    // Fetch the URL content
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Branddock-MediaImporter/1.0",
        },
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: "Failed to fetch URL content" },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `URL returned status ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const mimeType = contentType.split(";")[0].trim();
    const contentDisposition = response.headers.get("content-disposition");
    const fileName = extractFileName(url, contentDisposition);
    const mediaType = detectMediaType(mimeType);

    // Read response body as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const MAX_IMPORT_SIZE = 100 * 1024 * 1024; // 100MB
    if (buffer.length > MAX_IMPORT_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed size of 100MB" },
        { status: 413 }
      );
    }

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "URL returned empty content" },
        { status: 400 }
      );
    }

    // Upload via storage provider
    const storage = getStorageProvider();
    const uploadResult = await storage.upload(buffer, {
      workspaceId,
      fileName,
      contentType: mimeType,
      generateThumbnail: mediaType === "IMAGE",
    });

    // Generate asset name and slug
    const assetName = name?.trim() || fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    let slug = generateMediaSlug(assetName);

    // Handle slug conflicts
    const existingSlug = await prisma.mediaAsset.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        name: assetName,
        slug,
        fileUrl: uploadResult.url,
        fileType: mimeType,
        fileSize: uploadResult.fileSize,
        fileName,
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        mediaType,
        category: category || "OTHER",
        source: "URL_IMPORT",
        sourceUrl: url,
        thumbnailUrl: uploadResult.thumbnailUrl || null,
        workspaceId,
        uploadedById: session.user.id,
      },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(
      {
        id: asset.id,
        name: asset.name,
        slug: asset.slug,
        fileUrl: asset.fileUrl,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        mediaType: asset.mediaType,
        category: asset.category,
        source: asset.source,
        sourceUrl: asset.sourceUrl,
        thumbnailUrl: asset.thumbnailUrl,
        width: asset.width,
        height: asset.height,
        createdAt: asset.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error importing media from URL:", error);
    return NextResponse.json(
      { error: "Failed to import media from URL" },
      { status: 500 }
    );
  }
}
