import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// PATCH /api/brandstyle/colors/[colorId] — update tags (Fase E)
//
// Fase E van LP-fidelity verbeterplan: laat user de auto-detected
// usage-tags overrulen wanneer scraper het verkeerd had. Bv. user weet
// dat #B59032 hun hero-bg is ondanks dat scraper het als alleen accent
// detecteerde — toggle 'usage:hero-bg' tag aan en de LP-renderer pakt
// het direct over.
// =============================================================

const patchColorSchema = z.object({
  tags: z.array(z.string().max(80)).max(50).optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ colorId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const { colorId } = await params;
    const color = await prisma.styleguideColor.findFirst({
      where: { id: colorId, styleguide: { workspaceId } },
    });
    if (!color) {
      return NextResponse.json({ error: "Color not found" }, { status: 404 });
    }
    const raw = await request.json();
    const parsed = patchColorSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const updated = await prisma.styleguideColor.update({
      where: { id: colorId },
      data: {
        ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
      },
    });
    return NextResponse.json({ color: updated });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/colors/:colorId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/brandstyle/colors/[colorId] — delete color
// =============================================================
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ colorId: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { colorId } = await params;

    // Verify color belongs to this workspace's styleguide
    const color = await prisma.styleguideColor.findFirst({
      where: {
        id: colorId,
        styleguide: { workspaceId },
      },
    });

    if (!color) {
      return NextResponse.json({ error: "Color not found" }, { status: 404 });
    }

    await prisma.styleguideColor.delete({ where: { id: colorId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/brandstyle/colors/:colorId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
