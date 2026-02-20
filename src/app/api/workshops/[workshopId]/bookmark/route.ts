import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ workshopId: string }> };

const bookmarkSchema = z.object({
  bookmarkStep: z.number().int().min(1).max(6).nullable(),
});

// =============================================================
// PATCH /api/workshops/[workshopId]/bookmark
// Bookmark position
// =============================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;
    const body = await request.json();
    const parsed = bookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.workshop.updateMany({
      where: { id: workshopId, workspaceId },
      data: { bookmarkStep: parsed.data.bookmarkStep },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    return NextResponse.json({ bookmarkStep: parsed.data.bookmarkStep });
  } catch (error) {
    console.error("[PATCH /api/workshops/:workshopId/bookmark]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
