import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

const linkPersonaSchema = z.object({
  personaId: z.string().min(1),
});

// POST /api/products/:id/link-persona
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = linkPersonaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { personaId } = parsed.data;

    // Verify product belongs to workspace
    const product = await prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Verify persona belongs to same workspace
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Check if already linked
    const existing = await prisma.productPersona.findUnique({
      where: { productId_personaId: { productId: id, personaId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Persona is already linked to this product" },
        { status: 409 },
      );
    }

    const link = await prisma.productPersona.create({
      data: { productId: id, personaId },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products/:id/link-persona]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
