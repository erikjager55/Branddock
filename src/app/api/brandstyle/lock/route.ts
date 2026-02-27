import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// PATCH /api/brandstyle/lock
export async function PATCH(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Styleguide not found" }, { status: 404 });
    }

    const body = await request.json();
    const { locked } = body;

    if (typeof locked !== "boolean") {
      return NextResponse.json(
        { error: "locked must be a boolean" },
        { status: 400 }
      );
    }

    // Check ownership when unlocking — only the locker can unlock
    if (!locked && existing.isLocked && existing.lockedById && existing.lockedById !== session.user.id) {
      return NextResponse.json(
        { error: "Only the user who locked this item can unlock it" },
        { status: 423 }
      );
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: {
        isLocked: locked,
        lockedById: locked ? session.user.id : null,
        lockedAt: locked ? new Date() : null,
      },
    });

    return NextResponse.json({
      isLocked: styleguide.isLocked,
      lockedById: styleguide.lockedById,
      lockedAt: styleguide.lockedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/lock]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
