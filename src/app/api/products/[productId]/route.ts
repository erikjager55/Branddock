import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { updateProductSchema } from "@/lib/validations/product";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        personas: {
          include: {
            persona: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                occupation: true,
                age: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: { workspace: { include: { members: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const hasAccess =
      existing.workspace.ownerId === user.id ||
      existing.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.pricingModel !== undefined) updateData.pricingModel = data.pricingModel;
    if (data.pricingDetails !== undefined) updateData.pricingDetails = data.pricingDetails;
    if (data.features !== undefined)
      updateData.features = (data.features || []) as Prisma.InputJsonValue;
    if (data.benefits !== undefined)
      updateData.benefits = (data.benefits || []) as Prisma.InputJsonValue;
    if (data.useCases !== undefined)
      updateData.useCases = (data.useCases || []) as Prisma.InputJsonValue;
    if (data.targetAudience !== undefined)
      updateData.targetAudience = (data.targetAudience || []) as Prisma.InputJsonValue;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        personas: {
          include: {
            persona: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                occupation: true,
                age: true,
                location: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: { workspace: { include: { members: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const hasAccess =
      existing.workspace.ownerId === user.id ||
      existing.workspace.members.some(
        (m) =>
          m.userId === user.id &&
          (m.role === "OWNER" || m.role === "ADMIN")
      );

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
