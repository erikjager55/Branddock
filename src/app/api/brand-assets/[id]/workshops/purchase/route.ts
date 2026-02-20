import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { WORKSHOP_BASE_PRICE, FACILITATOR_PRICE, ASSET_PRICE } from "@/features/workshop/constants/workshop-pricing";
import { WORKSHOP_STEPS_TEMPLATE } from "@/features/workshop/constants/workshop-steps";

const purchaseSchema = z.object({
  bundleId: z.string().optional(),
  selectedAssetIds: z.array(z.string()).optional(),
  workshopCount: z.number().int().min(1).default(1),
  hasFacilitator: z.boolean().default(false),
}).refine(
  (data) => data.bundleId || (data.selectedAssetIds && data.selectedAssetIds.length > 0),
  { message: "Either bundleId or selectedAssetIds is required" }
);

// =============================================================
// POST /api/brand-assets/[id]/workshops/purchase — workshop purchase
// =============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { bundleId, selectedAssetIds, workshopCount, hasFacilitator } = parsed.data;

    // Calculate total price
    let totalPrice: number;

    if (bundleId) {
      const bundle = await prisma.workshopBundle.findFirst({
        where: { id: bundleId, workspaceId },
      });
      if (!bundle) {
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
      }
      totalPrice = bundle.finalPrice * workshopCount;
    } else {
      const assetCount = selectedAssetIds?.length ?? 0;
      totalPrice = (WORKSHOP_BASE_PRICE + assetCount * ASSET_PRICE) * workshopCount;
    }

    if (hasFacilitator) {
      totalPrice += FACILITATOR_PRICE * workshopCount;
    }

    // Create workshop with steps
    const workshop = await prisma.workshop.create({
      data: {
        brandAssetId: id,
        status: "PURCHASED",
        bundleId: bundleId ?? null,
        selectedAssetIds: selectedAssetIds ?? [],
        workshopCount,
        hasFacilitator,
        totalPrice,
        purchasedAt: new Date(),
        workspaceId,
        steps: {
          create: WORKSHOP_STEPS_TEMPLATE.map((step) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            duration: step.duration,
            prompt: step.prompt,
          })),
        },
      },
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });

    return NextResponse.json({ workshop, totalPrice }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/workshops/purchase]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
