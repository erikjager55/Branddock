import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch all related assets (both directions)
    const asset = await prisma.brandAsset.findUnique({
      where: { id },
      include: {
        relatedFrom: {
          include: {
            toAsset: {
              include: {
                creator: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        relatedTo: {
          include: {
            fromAsset: {
              include: {
                creator: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Combine related assets from both directions
    const relatedAssets = [
      ...asset.relatedFrom.map((rel) => ({
        asset: rel.toAsset,
        relationType: rel.relationType,
        relationId: rel.id,
      })),
      ...asset.relatedTo.map((rel) => ({
        asset: rel.fromAsset,
        relationType: rel.relationType,
        relationId: rel.id,
      })),
    ];

    return NextResponse.json(relatedAssets);
  } catch (error) {
    console.error("Error fetching related brand assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch related brand assets" },
      { status: 500 }
    );
  }
}
