import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { uploadWebFile, generateKey, isStorageConfigured } from "@/lib/storage";

// ─── Constants ─────────────────────────────────────────────

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  // SVG excluded: can contain embedded JavaScript (XSS risk)
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

// ─── Helpers ───────────────────────────────────────────────

function mapResource(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    type: r.type,
    category: r.category,
    author: r.author,
    estimatedDuration: r.estimatedDuration,
    rating: r.rating,
    isFavorite: r.isFavorite,
    isFeatured: r.isFeatured,
    fileUrl: r.fileUrl,
    fileName: r.fileName,
    fileSize: r.fileSize,
    fileType: r.fileType,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function detectTypeFromMime(mimeType: string): string {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "podcast";
  if (mimeType === "application/pdf") return "template";
  if (mimeType.startsWith("image/")) return "design";
  return "article";
}

// ─── POST /api/knowledge-resources/upload ──────────────────

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const fileField = formData.get("file");

    // Validate that the field is actually a File, not a string
    if (!fileField || typeof fileField === 'string' || !('arrayBuffer' in fileField)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const file = fileField as File;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed.` },
        { status: 400 }
      );
    }

    const detectedType = detectTypeFromMime(file.type);
    const title = formData.get("title")?.toString() || file.name;
    const category = formData.get("category")?.toString() || "General";
    const slug = generateSlug(title);

    // Upload to R2 — required for actual file storage
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: "File storage is not configured. Set R2_* environment variables." },
        { status: 503 }
      );
    }

    const key = generateKey('knowledge-resources', workspaceId, file.name);
    const uploadResult = await uploadWebFile(key, file);
    const fileUrl = uploadResult.url;

    const resource = await prisma.knowledgeResource.create({
      data: {
        title,
        slug,
        description: "",
        type: detectedType,
        category,
        author: formData.get("author")?.toString() || "Unknown",
        url: "",
        source: "FILE_UPLOAD",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl,
        tags: [],
        rating: 0,
        isFeatured: false,
        isFavorite: false,
        isArchived: false,
        language: "en",
        status: "active",
        workspaceId,
      },
    });

    return NextResponse.json(mapResource(resource as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
