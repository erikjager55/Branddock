import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

function mapResource(r: any) {
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
    createdAt: r.createdAt.toISOString(),
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
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const cuid = Math.random().toString(36).slice(2, 10);
    const fileUrl = `/uploads/knowledge-resources/${cuid}-${file.name}`;
    const detectedType = detectTypeFromMime(file.type);
    const title = formData.get("title")?.toString() || file.name;
    const category = formData.get("category")?.toString() || "General";
    const slug = generateSlug(title);

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

    return NextResponse.json(mapResource(resource), { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
