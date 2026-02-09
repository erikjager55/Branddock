import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { linkPersonaSchema } from "@/lib/validations/product";

export async function POST(
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
    const parsed = linkPersonaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { personaId } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify product exists and is not soft-deleted
    const product = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: { workspace: { include: { members: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const hasAccess =
      product.workspace.ownerId === user.id ||
      product.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify persona exists and belongs to the same workspace
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    if (persona.workspaceId !== product.workspaceId) {
      return NextResponse.json(
        { error: "Persona does not belong to the same workspace" },
        { status: 400 }
      );
    }

    // Check if link already exists
    const existingLink = await prisma.productPersona.findUnique({
      where: {
        productId_personaId: { productId, personaId },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Persona is already linked to this product" },
        { status: 409 }
      );
    }

    const productPersona = await prisma.productPersona.create({
      data: {
        productId,
        personaId,
      },
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
    });

    return NextResponse.json(productPersona, { status: 201 });
  } catch (error) {
    console.error("Error linking persona to product:", error);
    return NextResponse.json(
      { error: "Failed to link persona to product" },
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

    // Read personaId from query param or body
    let personaId = request.nextUrl.searchParams.get("personaId");

    if (!personaId) {
      try {
        const body = await request.json();
        personaId = body.personaId;
      } catch {
        // no body provided
      }
    }

    if (!personaId) {
      return NextResponse.json(
        { error: "personaId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify product exists and user has access
    const product = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: { workspace: { include: { members: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const hasAccess =
      product.workspace.ownerId === user.id ||
      product.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if the link exists
    const existingLink = await prisma.productPersona.findUnique({
      where: {
        productId_personaId: { productId, personaId },
      },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: "Persona is not linked to this product" },
        { status: 404 }
      );
    }

    await prisma.productPersona.delete({
      where: {
        productId_personaId: { productId, personaId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking persona from product:", error);
    return NextResponse.json(
      { error: "Failed to unlink persona from product" },
      { status: 500 }
    );
  }
}
