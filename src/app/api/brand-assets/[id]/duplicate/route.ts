import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import type { Prisma } from "@prisma/client";

// =============================================================
// POST /api/brand-assets/[id]/duplicate — deep copy asset
// =============================================================
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const source = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      include: { researchMethods: true },
    });

    if (!source) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Generate unique slug
    let copySlug = `${source.slug}-copy`;
    let counter = 1;
    while (await prisma.brandAsset.findUnique({ where: { slug: copySlug } })) {
      counter++;
      copySlug = `${source.slug}-copy-${counter}`;
    }

    const duplicate = await prisma.brandAsset.create({
      data: {
        name: `${source.name} (Copy)`,
        slug: copySlug,
        description: source.description,
        category: source.category,
        status: "DRAFT",
        content: source.content ?? undefined,
        frameworkType: source.frameworkType,
        frameworkData: (source.frameworkData as Prisma.InputJsonValue) ?? undefined,
        workspaceId,
        researchMethods: {
          create: source.researchMethods.map((m) => ({
            method: m.method,
            status: "AVAILABLE",
            progress: 0,
          })),
        },
      },
      include: { researchMethods: true },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/duplicate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
