import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// POST /api/settings/profile/avatar — Update avatar URL
// =============================================================
const avatarSchema = z.object({
  avatarUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const parsed = avatarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: { avatarUrl: parsed.data.avatarUrl },
      create: {
        userId,
        email: session.user.email,
        avatarUrl: parsed.data.avatarUrl,
        workspaceId,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/settings/profile/avatar]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================
// DELETE /api/settings/profile/avatar — Remove avatar
// =============================================================
export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const userId = session.user.id;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: { avatarUrl: null },
      create: {
        userId,
        email: session.user.email,
        avatarUrl: null,
        workspaceId,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[DELETE /api/settings/profile/avatar]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
