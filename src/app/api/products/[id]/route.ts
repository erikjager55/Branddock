import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// ─── Zod Schema for PATCH ───────────────────────────────────

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  pricingModel: z.string().max(100).optional(),
  pricingDetails: z.string().max(5000).optional(),
  features: z.array(z.string().max(500)).max(20).optional(),
  benefits: z.array(z.string().max(500)).max(10).optional(),
  useCases: z.array(z.string().max(500)).max(10).optional(),
  categoryIcon: z.string().max(50).optional(),
  status: z.enum(["DRAFT", "ANALYZED", "ARCHIVED"]).optional(),
});

// GET /api/products/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, workspaceId },
      include: {
        linkedPersonas: {
          include: {
            persona: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const detail = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      pricingModel: product.pricingModel,
      pricingDetails: product.pricingDetails,
      source: product.source,
      sourceUrl: product.sourceUrl,
      status: product.status,
      features: product.features,
      benefits: product.benefits,
      useCases: product.useCases,
      categoryIcon: product.categoryIcon,
      analysisData: product.analysisData,
      linkedPersonaCount: product.linkedPersonas.length,
      linkedPersonas: product.linkedPersonas.map((lp) => ({
        id: lp.persona.id,
        name: lp.persona.name,
        avatarUrl: lp.persona.avatarUrl,
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("[GET /api/products/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/products/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    // Verify product belongs to workspace
    const existing = await prisma.product.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/products/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/products/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    // ProductPersona records cascade-delete via onDelete: Cascade
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/products/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
