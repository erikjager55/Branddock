import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { validateBinaryFile } from "@/lib/security/file-validator";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { KnowledgeResource } from "@prisma/client";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Text formats don't have stable magic bytes — allowlist them by
// MIME/extension and skip the byte check.
const TEXT_MIME_TYPES: ReadonlySet<string> = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const BINARY_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  ...TEXT_MIME_TYPES,
  ...BINARY_MIME_TYPES,
]);

const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".md", ".csv", ".png", ".jpg", ".jpeg", ".webp",
]);

function mapResource(r: KnowledgeResource) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug ?? "",
    description: r.description,
    type: r.type,
    category: r.category,
    author: r.author,
    estimatedDuration: r.estimatedDuration,
    rating: r.rating,
    isFavorite: r.isFavorite,
    isFeatured: r.isFeatured,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Strip unsafe chars from a filename (for display/logging only — actual disk name is random). */
function sanitizeDisplayName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 200);
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "resource"}-${suffix}`;
}

function detectTypeFromMime(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "design";
  if (mimeType === "application/pdf") return "template";
  if (mimeType.startsWith("text/")) return "article";
  return "template";
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 413 },
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `File extension "${ext}" not allowed` },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" not allowed` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic-byte MIME validation for binary types. Text types (plain,
    // markdown, csv) have no reliable signature so we keep the MIME
    // allowlist check only.
    if (!TEXT_MIME_TYPES.has(file.type)) {
      const contentCheck = await validateBinaryFile(buffer, BINARY_MIME_TYPES);
      if (!contentCheck.ok) {
        return NextResponse.json(
          { error: contentCheck.error ?? "Invalid file content" },
          { status: 400 },
        );
      }
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "knowledge-resources",
      workspaceId,
    );
    await mkdir(uploadDir, { recursive: true });

    const safeDiskName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const diskPath = path.join(uploadDir, safeDiskName);

    await writeFile(diskPath, buffer);

    const fileUrl = `/uploads/knowledge-resources/${workspaceId}/${safeDiskName}`;
    const displayName = sanitizeDisplayName(file.name);
    const title = formData.get("title")?.toString().trim() || displayName;
    const category = formData.get("category")?.toString().trim() || "General";
    const author = formData.get("author")?.toString().trim() || "Unknown";
    const detectedType = detectTypeFromMime(file.type);

    const resource = await prisma.knowledgeResource.create({
      data: {
        title,
        slug: generateSlug(title),
        description: "",
        type: detectedType,
        category,
        author,
        url: "",
        source: "FILE_UPLOAD",
        fileName: displayName,
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

    return NextResponse.json(mapResource(resource), { status: 201 });
  } catch (error) {
    console.error("[POST /api/knowledge-resources/upload]", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
