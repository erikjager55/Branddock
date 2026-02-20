import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/settings/billing/payment-methods
// Returns all payment methods for the workspace
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const methods = await prisma.paymentMethod.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    const paymentMethods = methods.map((m) => ({
      id: m.id,
      type: m.type,
      last4: m.last4,
      expiryMonth: m.expiryMonth,
      expiryYear: m.expiryYear,
      isDefault: m.isDefault,
    }));

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error("[GET /api/settings/billing/payment-methods]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const createPaymentMethodSchema = z.object({
  type: z.string().min(1, "type is required"),
  last4: z.string().min(4).max(4),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2024),
  isDefault: z.boolean().optional(),
});

// =============================================================
// POST /api/settings/billing/payment-methods
// Create a new payment method. If isDefault=true, unset other defaults first.
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPaymentMethodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { type, last4, expiryMonth, expiryYear, isDefault } = parsed.data;

    // If isDefault, unset all other defaults for this workspace
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        workspaceId,
        type,
        last4,
        expiryMonth,
        expiryYear,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json(
      {
        id: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.last4,
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear,
        isDefault: paymentMethod.isDefault,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/settings/billing/payment-methods]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
