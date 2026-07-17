import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { trySendTransactional } from "@/lib/email/transactional";
import { emailBaseUrl } from "@/lib/email/base-url";
import { resolveEmailLocale } from "@/lib/email/email-locale";
import { renderInviteEmail } from "@/lib/email/templates/invite";
import { enforceOrgPlanLimit } from "@/lib/stripe/enforcement";

// POST /api/organization/invite — create an invitation
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

    // M1: validate the invited role + only an owner may mint another owner —
    // an admin could otherwise escalate by inviting an `owner` (the role-change
    // route already forbids granting owner; the invite path did not).
    if (inviteRole === "owner") {
      if (membership.role !== "owner") {
        return NextResponse.json(
          { error: "Only an owner can invite another owner" },
          { status: 403 }
        );
      }
    } else if (!["admin", "member", "viewer"].includes(inviteRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: owner, admin, member, viewer" },
        { status: 400 }
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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    // Plan-limit check: PLAN_LIMITS[workspace.planTier].TEAM_MEMBERS across
    // the org's workspaces (+ the -1 developer-unlimited override) — not the
    // legacy Organization.maxSeats column.
    const limited = await enforceOrgPlanLimit(organizationId, "TEAM_MEMBERS");
    if (limited) return limited;

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: inviteRole,
        organizationId,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send the invite email. We intentionally don't fail the request if
    // mail fails — the invitation record exists and the link can be
    // retrieved by the inviter from the UI.
    // emailBaseUrl → de app-host (app.branddock.app), niet de marketing-apex.
    const acceptUrl = `${emailBaseUrl()}/invite/accept?token=${encodeURIComponent(invitation.token)}`;
    const inviterName = session.user.name || session.user.email || "A teammate";
    // E-mailtaal: voorkeur van de ontvanger als die al een account heeft,
    // anders die van de uitnodiger (zelfde team ≈ zelfde taal).
    const recipientUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    const locale = await resolveEmailLocale(recipientUser?.id ?? session.user.id);
    const { subject, html, text } = renderInviteEmail({
      recipientEmail: email,
      inviterName,
      organizationName: org?.name ?? "your team",
      role: inviteRole,
      acceptUrl,
      expiresAt: invitation.expiresAt,
      locale,
    });
    const sendResult = await trySendTransactional({
      to: email,
      subject,
      html,
      text,
      tags: { kind: "organization_invite", organization_id: organizationId },
    });

    return NextResponse.json(
      {
        ...invitation,
        emailSent: sendResult.ok,
        emailError: sendResult.ok ? undefined : sendResult.error,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/organization/invite]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
