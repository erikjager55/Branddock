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
    url: r.url || null,
    estimatedDuration: r.estimatedDuration,
    rating: r.rating,
    isFavorite: r.isFavorite,
    isFeatured: r.isFeatured,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const resources = await prisma.knowledgeResource.findMany({
      where: {
        workspaceId,
        isFeatured: true,
        isArchived: false,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      resources: resources.map(mapResource),
    });
  } catch (error) {
    console.error("Error fetching featured resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured resources" },
      { status: 500 }
    );
  }
}
