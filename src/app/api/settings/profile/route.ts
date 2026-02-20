import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/settings/profile — Return UserProfile for session user
// =============================================================
export async function GET() {
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

    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // If no profile exists, create one from User data
    if (!profile) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const nameParts = (user?.name ?? "").split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      profile = await prisma.userProfile.create({
        data: {
          userId,
          firstName,
          lastName,
          email: user?.email ?? "",
          emailVerified: user?.emailVerified ?? false,
          avatarUrl: user?.avatarUrl ?? null,
          workspaceId,
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[GET /api/settings/profile]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================
// PATCH /api/settings/profile — Update profile fields
// =============================================================
const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
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
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: parsed.data,
      create: {
        userId,
        email: parsed.data.email ?? session.user.email,
        ...parsed.data,
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
    console.error("[PATCH /api/settings/profile]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
