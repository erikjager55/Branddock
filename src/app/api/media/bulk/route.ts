import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { getStorageProvider } from "@/lib/storage";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { generateMediaSlug, detectMediaType } from "@/features/media-library/utils/media-utils";
import { MAX_FILE_SIZES, formatFileSize } from "@/features/media-library/constants/media-constants";

/** POST /api/media/bulk — bulk upload multiple files */
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

    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const results: Array<{
      id: string;
      name: string;
      slug: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      mediaType: string;
      thumbnailUrl: string | null;
      error?: string;
    }> = [];

    // Fetch existing slugs to handle conflicts
    const existingSlugs = new Set(
      (
        await prisma.mediaAsset.findMany({
          where: { workspaceId },
          select: { slug: true },
        })
      ).map((a) => a.slug)
    );

    for (const fileEntry of files) {
      if (!(fileEntry instanceof File)) {
        results.push({
          id: "",
          name: "unknown",
          slug: "",
          fileUrl: "",
          fileType: "",
          fileSize: 0,
          mediaType: "",
          thumbnailUrl: null,
          error: "Invalid file entry",
        });
        continue;
      }

      try {
        const file = fileEntry as File;
        const mimeType = file.type || "application/octet-stream";
        const mediaType = detectMediaType(mimeType);
        const fileName = file.name || "unnamed-file";

        // Server-side file size validation
        const maxSize = MAX_FILE_SIZES[mediaType];
        if (file.size > maxSize) {
          results.push({
            id: "",
            name: fileName,
            slug: "",
            fileUrl: "",
            fileType: mimeType,
            fileSize: file.size,
            mediaType,
            thumbnailUrl: null,
            error: `File exceeds maximum size for ${mediaType.toLowerCase()} files (limit: ${formatFileSize(maxSize)}, actual: ${formatFileSize(file.size)})`,
          });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const assetName = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

        let slug = generateMediaSlug(assetName);
        while (existingSlugs.has(slug)) {
          slug = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        }
        existingSlugs.add(slug);

        const uploadResult = await storage.upload(buffer, {
          workspaceId,
          fileName,
          contentType: mimeType,
          generateThumbnail: mediaType === "IMAGE",
        });

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
            category: "OTHER",
            source: "UPLOAD",
            thumbnailUrl: uploadResult.thumbnailUrl || null,
            workspaceId,
            uploadedById: session.user.id,
          },
        });

        results.push({
          id: asset.id,
          name: asset.name,
          slug: asset.slug,
          fileUrl: asset.fileUrl,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          mediaType: asset.mediaType,
          thumbnailUrl: asset.thumbnailUrl,
        });
      } catch (fileError) {
        console.error("Error uploading file:", fileEntry instanceof File ? fileEntry.name : "unknown", fileError);
        results.push({
          id: "",
          name: fileEntry instanceof File ? fileEntry.name : "unknown",
          slug: "",
          fileUrl: "",
          fileType: "",
          fileSize: 0,
          mediaType: "",
          thumbnailUrl: null,
          error: "Failed to upload file",
        });
      }
    }

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    const successCount = results.filter((r) => !r.error).length;
    const failureCount = results.filter((r) => r.error).length;

    return NextResponse.json(
      {
        uploaded: successCount,
        failed: failureCount,
        total: results.length,
        assets: results,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in bulk upload:", error);
    return NextResponse.json(
      { error: "Failed to process bulk upload" },
      { status: 500 }
    );
  }
}

/** DELETE /api/media/bulk — bulk delete by ids array */
export async function DELETE(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Verify all string IDs
    if (ids.some((id: unknown) => typeof id !== "string")) {
      return NextResponse.json(
        { error: "All ids must be strings" },
        { status: 400 }
      );
    }

    // Fetch assets to get file paths before deleting
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: ids }, workspaceId },
      select: { fileUrl: true, thumbnailUrl: true },
    });

    // Delete physical files
    const storage = getStorageProvider();
    for (const asset of assets) {
      if (asset.fileUrl) {
        await storage.delete(asset.fileUrl).catch(() => {/* non-critical */});
      }
      if (asset.thumbnailUrl) {
        await storage.delete(asset.thumbnailUrl).catch(() => {/* non-critical */});
      }
    }

    // Delete DB records
    const deleteResult = await prisma.mediaAsset.deleteMany({
      where: {
        id: { in: ids },
        workspaceId,
      },
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      deleted: deleteResult.count,
      requested: ids.length,
    });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    return NextResponse.json(
      { error: "Failed to process bulk delete" },
      { status: 500 }
    );
  }
}
