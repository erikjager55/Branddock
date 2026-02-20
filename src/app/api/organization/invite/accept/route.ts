import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

// POST /api/organization/invite/accept — accept an invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}` },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if user is logged in
    const session = await getServerSession();

    if (!session) {
      // User not logged in — return info for the client to redirect to register
      return NextResponse.json(
        {
          requiresAuth: true,
          email: invitation.email,
          organizationName: invitation.organization.name,
        },
        { status: 401 }
      );
    }

    // Verify email matches (or allow any logged-in user for now)
    if (session.user.email !== invitation.email) {
      return NextResponse.json(
        {
          error: "This invitation was sent to a different email address",
        },
        { status: 403 }
      );
    }

    // Check not already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (existingMember) {
      // Already a member — mark invite as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });
      return NextResponse.json({ alreadyMember: true });
    }

    // Create OrganizationMember and mark invitation as accepted (transaction)
    const [member] = await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      }),
    ]);

    return NextResponse.json({
      member,
      organizationName: invitation.organization.name,
    });
  } catch (error) {
    console.error("[POST /api/organization/invite/accept]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
