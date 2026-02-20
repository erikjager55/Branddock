import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// DELETE /api/brandstyle/colors/[colorId] — verwijder kleur
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
