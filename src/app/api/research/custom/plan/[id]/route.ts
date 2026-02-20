import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { METHOD_PRICING } from "@/features/research/constants/research-constants";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/research/custom/plan/[id] — plan detail
// =============================================================
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const plan = await prisma.validationPlan.findFirst({
      where: { id, workspaceId },
      include: {
        selectedAssets: true,
        selectedMethods: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const hasPaidMethods = plan.selectedMethods.some((m) => m.unitPrice > 0 && m.quantity > 0);

    return NextResponse.json({
      plan: {
        id: plan.id,
        status: plan.status,
        assets: plan.selectedAssets.map((a) => ({
          name: a.assetName,
          icon: null,
        })),
        methods: plan.selectedMethods.map((m) => ({
          type: m.methodType,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          subtotal: m.subtotal,
        })),
        totalPrice: plan.totalPrice,
        hasPaidMethods,
      },
    });
  } catch (error) {
    console.error("[GET /api/research/custom/plan/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updatePlanSchema = z.object({
  assetIds: z.array(z.string()).min(1).max(20).optional(),
  methods: z
    .array(
      z.object({
        type: z.string(),
        quantity: z.number().int().min(0),
      })
    )
    .optional(),
});

// =============================================================
// PATCH /api/research/custom/plan/[id] — update plan
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.issues }, { status: 400 });
    }

    const existing = await prisma.validationPlan.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const { assetIds, methods } = parsed.data;

    // Update assets if provided
    if (assetIds) {
      await prisma.validationPlanAsset.deleteMany({ where: { planId: id } });

      const brandAssets = await prisma.brandAsset.findMany({
        where: { id: { in: assetIds }, workspaceId },
        select: { id: true, name: true, category: true },
      });

      await prisma.validationPlanAsset.createMany({
        data: brandAssets.map((a) => ({
          planId: id,
          brandAssetId: a.id,
          assetName: a.name,
          assetCategory: a.category,
          estimatedDuration: "2-3 weeks",
        })),
      });
    }

    // Update methods if provided
    if (methods) {
      await prisma.validationPlanMethod.deleteMany({ where: { planId: id } });

      const methodsWithPricing = methods
        .filter((m) => m.quantity > 0)
        .map((m) => {
          const pricing = METHOD_PRICING[m.type];
          const unitPrice = pricing ? pricing.price : 0;
          return {
            planId: id,
            methodType: m.type as "AI_EXPLORATION" | "QUESTIONNAIRE" | "INTERVIEWS" | "WORKSHOP",
            quantity: m.quantity,
            unitPrice,
            subtotal: unitPrice * m.quantity,
          };
        });

      await prisma.validationPlanMethod.createMany({
        data: methodsWithPricing,
      });

      // Recalculate total
      const totalPrice = methodsWithPricing.reduce((sum, m) => sum + m.subtotal, 0);
      await prisma.validationPlan.update({
        where: { id },
        data: { totalPrice },
      });
    }

    // Fetch updated plan
    const plan = await prisma.validationPlan.findUnique({
      where: { id },
      include: {
        selectedAssets: true,
        selectedMethods: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found after update" }, { status: 404 });
    }

    const hasPaidMethods = plan.selectedMethods.some((m) => m.unitPrice > 0 && m.quantity > 0);

    return NextResponse.json({
      plan: {
        id: plan.id,
        status: plan.status,
        assets: plan.selectedAssets.map((a) => ({
          name: a.assetName,
          icon: null,
        })),
        methods: plan.selectedMethods.map((m) => ({
          type: m.methodType,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          subtotal: m.subtotal,
        })),
        totalPrice: plan.totalPrice,
        hasPaidMethods,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/research/custom/plan/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
