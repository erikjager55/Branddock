import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { sendEmail, invitationEmail } from "@/lib/email";

// POST /api/organization/invite — create an invitation and send email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, organizationId } = body;

    if (!email || !organizationId) {
      return NextResponse.json(
        { error: "email and organizationId are required" },
        { status: 400 }
      );
    }

    const inviteRole = role ?? "member";

    // Validate: only owner/admin may invite
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId,
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

    // Check for existing pending invite
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId,
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
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId },
    });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (org && memberCount >= org.maxSeats) {
      return NextResponse.json(
        { error: `Seat limit reached (${org.maxSeats})` },
        { status: 403 }
      );
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: inviteRole,
        organizationId,
        invitedById: session.user.id,
        expiresAt,
      },
    });

    // Send invitation email
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
    const acceptUrl = `${baseUrl}/api/organization/invite/accept?token=${invitation.id}`;

    const inviterName = session.user.name || session.user.email || 'A team member';
    const organizationName = org?.name || 'your organization';

    const { html, text } = invitationEmail({
      inviterName,
      organizationName,
      role: inviteRole,
      acceptUrl,
      expiresInDays: 7,
    });

    const emailResult = await sendEmail({
      to: email,
      subject: `You've been invited to ${organizationName} on Branddock`,
      html,
      text,
    });

    return NextResponse.json(
      {
        ...invitation,
        emailSent: emailResult.success,
        emailError: emailResult.error ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/organization/invite]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
