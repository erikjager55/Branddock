import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// DELETE /api/settings/billing/payment-methods/[id]
// Remove a payment method. Cannot delete the default (last remaining) payment method.
// =============================================================
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    // Find the payment method and verify it belongs to the workspace
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, workspaceId },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // Count total payment methods for this workspace
    const totalMethods = await prisma.paymentMethod.count({
      where: { workspaceId },
    });

    // Cannot delete the default (last remaining) payment method
    if (paymentMethod.isDefault && totalMethods <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last remaining default payment method" },
        { status: 400 }
      );
    }

    await prisma.paymentMethod.delete({ where: { id } });

    // If the deleted method was the default and there are others, promote the most recent one
    if (paymentMethod.isDefault && totalMethods > 1) {
      const nextDefault = await prisma.paymentMethod.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
      });
      if (nextDefault) {
        await prisma.paymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/settings/billing/payment-methods/:id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
