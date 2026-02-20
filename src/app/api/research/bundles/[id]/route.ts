import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/research/bundles/[id] — bundle detail
// =============================================================
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const bundle = await prisma.researchBundle.findUnique({
      where: { id },
      include: {
        assets: { select: { assetName: true, assetDescription: true, assetIcon: true } },
        methods: { select: { methodName: true, description: true } },
      },
    });

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const savings = (bundle.originalPrice ?? bundle.price) - bundle.price;

    return NextResponse.json({
      bundle: {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        description: bundle.description,
        category: bundle.category,
        methodCount: bundle.methodCount,
        timeline: bundle.timeline,
        price: bundle.price,
        originalPrice: bundle.originalPrice,
        discount: bundle.discount,
        isRecommended: bundle.isRecommended,
        isPopular: bundle.isPopular,
        includedTags: bundle.includedTags,
        methods: bundle.methods.map((m) => ({
          methodName: m.methodName,
          description: m.description,
        })),
        assets: bundle.assets.map((a) => ({
          assetName: a.assetName,
          assetDescription: a.assetDescription,
          assetIcon: a.assetIcon,
        })),
        trustSignals: bundle.trustSignals,
      },
      savings,
    });
  } catch (error) {
    console.error("[GET /api/research/bundles/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
