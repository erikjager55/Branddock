import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// GET /api/products/:id/personas — gekoppelde personas
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    // Verify product belongs to workspace
    const product = await prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productPersonas = await prisma.productPersona.findMany({
      where: { productId: id },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            tagline: true,
            avatarUrl: true,
            occupation: true,
            location: true,
          },
        },
      },
    });

    const personas = productPersonas.map((pp) => ({
      id: pp.persona.id,
      name: pp.persona.name,
      tagline: pp.persona.tagline,
      avatarUrl: pp.persona.avatarUrl,
      occupation: pp.persona.occupation,
      location: pp.persona.location,
    }));

    return NextResponse.json({ personas });
  } catch (error) {
    console.error("[GET /api/products/:id/personas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/products/:id/personas — koppel persona
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
    const body = await request.json();
    const { personaId } = body;

    if (!personaId) {
      return NextResponse.json({ error: "personaId is required" }, { status: 400 });
    }

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
        { status: 409 }
      );
    }

    const link = await prisma.productPersona.create({
      data: { productId: id, personaId },
    });

    invalidateCache(cacheKeys.prefixes.products(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products/:id/personas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
