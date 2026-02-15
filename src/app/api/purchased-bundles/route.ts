import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PurchasedBundleWithMeta, PurchasedBundleListResponse } from "@/types/research-plan";

// =============================================================
// GET /api/purchased-bundles?workspaceId=xxx
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const dbBundles = await prisma.purchasedBundle.findMany({
      where: { workspaceId },
      orderBy: { purchasedAt: "desc" },
    });

    const bundles: PurchasedBundleWithMeta[] = dbBundles.map((b) => ({
      id: b.id,
      bundleId: b.bundleId,
      unlockedTools: (b.unlockedTools as string[]) ?? [],
      purchasedAt: b.purchasedAt.toISOString(),
    }));

    // Collect all unique unlocked tool IDs
    const toolsSet = new Set<string>();
    bundles.forEach((b) => b.unlockedTools.forEach((t) => toolsSet.add(t)));

    const response: PurchasedBundleListResponse = {
      bundles,
      unlockedTools: Array.from(toolsSet),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/purchased-bundles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/purchased-bundles  { bundleId, unlockedTools?, workspaceId }
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bundleId, unlockedTools, workspaceId } = body;

    if (!bundleId || !workspaceId) {
      return NextResponse.json({ error: "bundleId and workspaceId are required" }, { status: 400 });
    }

    // Upsert: als bundle al gekocht is, skip
    const existing = await prisma.purchasedBundle.findUnique({
      where: { workspaceId_bundleId: { workspaceId, bundleId } },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const bundle = await prisma.purchasedBundle.create({
      data: {
        bundleId,
        unlockedTools: unlockedTools ?? [],
        workspaceId,
      },
    });

    return NextResponse.json(bundle, { status: 201 });
  } catch (error) {
    console.error("[POST /api/purchased-bundles]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
