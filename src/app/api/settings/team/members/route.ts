import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

// GET /api/settings/team/members — list all members with user data
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;

    if (!activeOrgId) {
      const firstMembership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        select: { organizationId: true },
      });
      activeOrgId = firstMembership?.organizationId ?? undefined;
    }

    if (!activeOrgId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Check user is member
    const myMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
    });

    if (!myMembership) {
      return NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 }
      );
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: activeOrgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            image: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name ?? m.user.email.split("@")[0],
        email: m.user.email,
        role: m.role,
        avatar: m.user.avatarUrl ?? m.user.image ?? null,
        isActive: m.isActive,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/settings/team/members]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
