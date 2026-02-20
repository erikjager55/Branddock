import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

const roleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

// PATCH /api/settings/team/members/[id]/role — change a member's role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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

    // Only owner/admin can change roles
    const myMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: activeOrgId,
        },
      },
    });

    if (!myMembership || !["owner", "admin"].includes(myMembership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can change roles" },
        { status: 403 }
      );
    }

    // Find the target member
    const targetMember = await prisma.organizationMember.findFirst({
      where: { id, organizationId: activeOrgId },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot change own role
    if (targetMember.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Cannot change owner's role
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    const updated = await prisma.organizationMember.update({
      where: { id },
      data: { role },
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
    });

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: updated.userId,
        name: updated.user.name ?? updated.user.email.split("@")[0],
        email: updated.user.email,
        role: updated.role,
        avatar: updated.user.avatarUrl ?? updated.user.image ?? null,
        isActive: updated.isActive,
        joinedAt: updated.joinedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[PATCH /api/settings/team/members/[id]/role]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
