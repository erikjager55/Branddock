import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/research/bundles — list bundles split by category
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const recommended = searchParams.get("recommended");

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (recommended === "true") {
      where.isRecommended = true;
    }

    const bundles = await prisma.researchBundle.findMany({
      where,
      include: {
        assets: { select: { assetName: true, assetDescription: true, assetIcon: true } },
        methods: { select: { methodName: true, description: true } },
      },
      orderBy: { price: "asc" },
    });

    const mapBundle = (b: (typeof bundles)[number]) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      category: b.category,
      methodCount: b.methodCount,
      timeline: b.timeline,
      price: b.price,
      originalPrice: b.originalPrice,
      discount: b.discount,
      isRecommended: b.isRecommended,
      isPopular: b.isPopular,
      includedTags: b.includedTags,
      methods: b.methods.map((m) => ({ methodName: m.methodName })),
    });

    const foundation = bundles
      .filter((b) => b.category === "FOUNDATION")
      .map(mapBundle);

    const specialized = bundles
      .filter((b) => b.category === "SPECIALIZED")
      .map(mapBundle);

    return NextResponse.json({ foundation, specialized });
  } catch (error) {
    console.error("[GET /api/research/bundles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
