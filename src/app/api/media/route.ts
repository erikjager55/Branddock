import { NextRequest, NextResponse } from "next/server";
import { MediaCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getServerSession } from "@/lib/auth-server";
import { getCached, setCache, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";
import { getStorageProvider, extractDominantColors } from "@/lib/storage";
import { generateMediaSlug, detectMediaType } from "@/features/media-library/utils/media-utils";
import { MAX_FILE_SIZES, formatFileSize } from "@/features/media-library/constants/media-constants";

const MEDIA_ASSET_INCLUDE = {
  tags: { include: { mediaTag: true } },
  uploadedBy: { select: { id: true, name: true, image: true } },
};


/** GET /api/media — List media assets with filters */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const mediaType = searchParams.get("mediaType") || "";
    const category = searchParams.get("category") || "";
    const source = searchParams.get("source") || "";
    const isFavorite = searchParams.get("isFavorite");
    const isArchived = searchParams.get("isArchived") === "true";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));

    // Cache unfiltered requests
    const isUnfiltered =
      !search && !mediaType && !category && !source && isFavorite === null && !isArchived;
    if (isUnfiltered) {
      const cached = getCached(cacheKeys.media.list(workspaceId));
      if (cached) {
        return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
      }
    }

    const where: Record<string, unknown> = {
      workspaceId,
      isArchived,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
        { aiDescription: { contains: search, mode: "insensitive" } },
      ];
    }

    if (mediaType) {
      where.mediaType = mediaType;
    }

    if (category) {
      where.category = category;
    }

    if (source) {
      where.source = source;
    }

    if (isFavorite === "true") {
      where.isFavorite = true;
    }

    const skip = (page - 1) * limit;

    const [assets, total, imageCount, videoCount, documentCount, audioCount] =
      await Promise.all([
        prisma.mediaAsset.findMany({
          where,
          include: MEDIA_ASSET_INCLUDE,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.mediaAsset.count({ where }),
        prisma.mediaAsset.count({ where: { workspaceId, mediaType: "IMAGE", isArchived: false } }),
        prisma.mediaAsset.count({ where: { workspaceId, mediaType: "VIDEO", isArchived: false } }),
        prisma.mediaAsset.count({
          where: { workspaceId, mediaType: "DOCUMENT", isArchived: false },
        }),
        prisma.mediaAsset.count({ where: { workspaceId, mediaType: "AUDIO", isArchived: false } }),
      ]);

    const totalAll = imageCount + videoCount + documentCount + audioCount;

    const response = {
      assets,
      total,
      stats: {
        total: totalAll,
        images: imageCount,
        videos: videoCount,
        documents: documentCount,
        audio: audioCount,
      },
    };

    if (isUnfiltered) {
      setCache(cacheKeys.media.list(workspaceId), response, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching media assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch media assets" },
      { status: 500 }
    );
  }
}

/** POST /api/media — Upload a new media asset */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 401 }
      );
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "";
    const categoryValue = (formData.get("category") as string) || "OTHER";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const mediaType = detectMediaType(mimeType);

    // Server-side file size validation
    const maxSize = MAX_FILE_SIZES[mediaType];
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File exceeds maximum size for ${mediaType.toLowerCase()} files`,
          limit: formatFileSize(maxSize),
          actual: formatFileSize(file.size),
        },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload via storage provider
    const storage = getStorageProvider();
    const uploadResult = await storage.upload(buffer, {
      workspaceId,
      fileName: file.name,
      contentType: mimeType,
      generateThumbnail: mediaType === "IMAGE",
    });

    // Extract dominant colors for images
    let dominantColors: string[] = [];
    if (mediaType === "IMAGE") {
      dominantColors = await extractDominantColors(buffer);
    }

    // Generate unique slug
    let slug = generateMediaSlug(name);
    const existingSlug = await prisma.mediaAsset.findFirst({
      where: { workspaceId, slug },
      select: { id: true },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        name: name.trim(),
        slug,
        fileUrl: uploadResult.url,
        fileType: mimeType,
        fileSize: uploadResult.fileSize,
        fileName: file.name,
        width: uploadResult.width ?? null,
        height: uploadResult.height ?? null,
        mediaType,
        category: categoryValue as MediaCategory,
        thumbnailUrl: uploadResult.thumbnailUrl ?? null,
        dominantColors,
        source: "UPLOAD",
        workspaceId,
        uploadedById: session.user.id,
      },
      include: MEDIA_ASSET_INCLUDE,
    });

    invalidateCache(cacheKeys.prefixes.media(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Error uploading media asset:", error);
    return NextResponse.json(
      { error: "Failed to upload media asset" },
      { status: 500 }
    );
  }
}
