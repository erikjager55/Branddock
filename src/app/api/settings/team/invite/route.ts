import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

const inviteSchema = z.object({
  email: z.string().email(),
  // M1: enum rejects junk roles at parse-time; the owner-guard below ensures
  // only an owner may actually mint another owner.
  role: z.enum(["owner", "admin", "member", "viewer"]).optional().default("member"),
});

// POST /api/settings/team/invite — invite a new member
export async function POST(request: NextRequest) {
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

    // Only owner/admin can invite
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
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // M1: only an owner may invite another owner — an admin could otherwise
    // escalate by inviting an `owner` (mirrors members/[id]/role + the
    // /api/organization/invite guard). This is the UI-wired invite path.
    if (role === "owner" && myMembership.role !== "owner") {
      return NextResponse.json(
        { error: "Only an owner can invite another owner" },
        { status: 403 }
      );
    }

    // Check existing member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: activeOrgId,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 409 }
        );
      }
    }

    // Check existing pending invite
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId: activeOrgId,
        status: "pending",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 }
      );
    }

    // Check seat limit
    const org = await prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { maxSeats: true },
    });

    if (org) {
      const memberCount = await prisma.organizationMember.count({
        where: { organizationId: activeOrgId },
      });

      if (memberCount >= org.maxSeats) {
        return NextResponse.json(
          { error: `Seat limit reached (${org.maxSeats})` },
          { status: 403 }
        );
      }
    }

    // Create invitation with 7-day expiry
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        organizationId: activeOrgId,
        invitedById: session.user.id,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/settings/team/invite]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
