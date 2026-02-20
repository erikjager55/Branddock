import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { METHOD_PRICING } from "@/features/research/constants/research-constants";

const createPlanSchema = z.object({
  assetIds: z.array(z.string()).min(1).max(20),
  methods: z.array(
    z.object({
      type: z.string(),
      quantity: z.number().int().min(0),
    })
  ),
});

// =============================================================
// POST /api/research/custom/plan — create validation plan
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.issues }, { status: 400 });
    }

    const { assetIds, methods } = parsed.data;

    // Look up asset names
    const brandAssets = await prisma.brandAsset.findMany({
      where: { id: { in: assetIds }, workspaceId },
      select: { id: true, name: true, category: true },
    });

    // Calculate total price from methods
    const methodsWithPricing = methods
      .filter((m) => m.quantity > 0)
      .map((m) => {
        const pricing = METHOD_PRICING[m.type];
        const unitPrice = pricing ? pricing.price : 0;
        return {
          methodType: m.type as "AI_EXPLORATION" | "QUESTIONNAIRE" | "INTERVIEWS" | "WORKSHOP",
          quantity: m.quantity,
          unitPrice,
          subtotal: unitPrice * m.quantity,
        };
      });

    const totalPrice = methodsWithPricing.reduce((sum, m) => sum + m.subtotal, 0);

    const plan = await prisma.validationPlan.create({
      data: {
        status: "DRAFT",
        totalPrice,
        workspaceId,
        selectedAssets: {
          create: brandAssets.map((a) => ({
            brandAssetId: a.id,
            assetName: a.name,
            assetCategory: a.category,
            estimatedDuration: "2-3 weeks",
          })),
        },
        selectedMethods: {
          create: methodsWithPricing,
        },
      },
      include: {
        selectedAssets: true,
        selectedMethods: true,
      },
    });

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
    console.error("[POST /api/research/custom/plan]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
