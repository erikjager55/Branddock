import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// GET /api/competitors/[id]/products — List linked products
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

    const competitor = await prisma.competitor.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    const links = await prisma.competitorProduct.findMany({
      where: { competitorId: id },
      include: {
        product: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    return NextResponse.json({
      products: links.map((l) => ({
        id: l.product.id,
        name: l.product.name,
        category: l.product.category,
      })),
    });
  } catch (error) {
    console.error("[GET /api/competitors/:id/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const linkProductSchema = z.object({
  productId: z.string().min(1),
});

// POST /api/competitors/[id]/products — Link a product
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

    const competitor = await prisma.competitor.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = linkProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { productId } = parsed.data;

    // Verify product belongs to same workspace
    const product = await prisma.product.findFirst({
      where: { id: productId, workspaceId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const link = await prisma.competitorProduct.create({
      data: { competitorId: id, productId },
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (already linked)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Product already linked" }, { status: 409 });
    }
    console.error("[POST /api/competitors/:id/products]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
