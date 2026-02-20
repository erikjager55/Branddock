import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

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

function mapResourceDetail(r: any) {
  return {
    ...mapResource(r),
    url: r.url,
    source: r.source,
    difficultyLevel: r.difficultyLevel,
    tags: (r.tags as string[]) || [],
    publicationDate: r.publicationDate
      ? r.publicationDate.toISOString()
      : null,
    isbn: r.isbn,
    pageCount: r.pageCount,
    fileName: r.fileName,
    fileSize: r.fileSize,
    fileType: r.fileType,
    fileUrl: r.fileUrl,
    importedMetadata: r.importedMetadata,
    isArchived: r.isArchived,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const resource = await prisma.knowledgeResource.findFirst({
      where: { id, workspaceId },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapResourceDetail(resource));
  } catch (error) {
    console.error("Error fetching knowledge resource:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge resource" },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  author: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  type: z.string().optional(),
  url: z.string().max(500).optional(),
  description: z.string().max(3000).optional(),
  difficultyLevel: z.string().optional(),
  estimatedDuration: z.string().max(50).optional(),
  tags: z.array(z.string()).max(20).optional(),
  rating: z.number().min(0).max(5).optional(),
  publicationDate: z.string().optional(),
  isbn: z.string().max(20).optional(),
  pageCount: z.number().int().positive().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.knowledgeResource.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const updateData: any = { ...data };

    if (data.publicationDate) {
      updateData.publicationDate = new Date(data.publicationDate);
    }

    if (data.difficultyLevel) {
      updateData.difficultyLevel = data.difficultyLevel as any;
    }

    const resource = await prisma.knowledgeResource.update({
      where: { id },
      data: updateData,
    });

    invalidateCache(cacheKeys.prefixes.knowledgeResources(workspaceId));

    return NextResponse.json(mapResourceDetail(resource));
  } catch (error) {
    console.error("Error updating knowledge resource:", error);
    return NextResponse.json(
      { error: "Failed to update knowledge resource" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.knowledgeResource.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    await prisma.knowledgeResource.delete({
      where: { id },
    });

    invalidateCache(cacheKeys.prefixes.knowledgeResources(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge resource:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge resource" },
      { status: 500 }
    );
  }
}
