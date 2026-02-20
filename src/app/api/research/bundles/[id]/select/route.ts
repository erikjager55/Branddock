import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// POST /api/research/bundles/[id]/select — create bundle purchase
// =============================================================
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const bundle = await prisma.researchBundle.findUnique({
      where: { id },
      select: { id: true, price: true },
    });

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const purchase = await prisma.bundlePurchase.create({
      data: {
        bundleId: bundle.id,
        pricePaid: bundle.price,
        status: "PENDING",
        workspaceId,
      },
    });

    return NextResponse.json({
      purchaseId: purchase.id,
      status: "pending",
    });
  } catch (error) {
    console.error("[POST /api/research/bundles/[id]/select]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
