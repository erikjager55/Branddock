import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { trySendTransactional } from "@/lib/email/transactional";
import { emailBaseUrl } from "@/lib/email/base-url";
import { resolveEmailLocale } from "@/lib/email/email-locale";
import { renderInviteEmail } from "@/lib/email/templates/invite";
import { resolveInviteTargetName } from "@/lib/invitations/invite-target-name";
import { enforceOrgPlanLimit } from "@/lib/stripe/enforcement";

// L8 Zod-sweep (audit 2026-06-26, batch 6): `email` was elke willekeurige
// string (ging de Invitation-rij + het invite-mailtje in). `role` blijft hier
// bewust een capped string: de M1-logica hieronder onderscheidt 403
// (admin-invites-owner) van 400 (onbekende rol) — een enum-schema zou die
// semantiek platslaan naar 400.
const inviteSchema = z.object({
  // Lowercase + trim: Better Auth normaliseert e-mailadressen bij sign-up
  // (`normalizedEmail = email.toLowerCase()`) en bij lookup. Sloegen wij het
  // adres verbatim op, dan maakte een uitnodiging aan `Naam@Domein.nl` een
  // account op `naam@domein.nl` dat vervolgens permanent op EMAIL_MISMATCH
  // stuk liep — met de "uitloggen en opnieuw"-knop als eindeloze lus.
  email: z
    .string()
    .max(320)
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Invalid email address",
    }),
  organizationId: z.string().min(1).max(100),
  role: z.string().max(50).optional(),
  // Leeg/afwezig = toegang tot alle workspaces (huidig gedrag).
  workspaceIds: z.array(z.string().min(1).max(100)).max(100).optional(),
});

// POST /api/organization/invite — create an invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, inviteSchema);
    if (!parsed.ok) return parsed.response;
    const { email, role, organizationId } = parsed.data;
    const workspaceIds = [...new Set(parsed.data.workspaceIds ?? [])];

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
        { error: "Only owners and admins can invite members", code: "NOT_OWNER_OR_ADMIN" },
        { status: 403 }
      );
    }

    // M1: validate the invited role + only an owner may mint another owner —
    // an admin could otherwise escalate by inviting an `owner` (the role-change
    // route already forbids granting owner; the invite path did not).
    if (inviteRole === "owner") {
      if (membership.role !== "owner") {
        return NextResponse.json(
          { error: "Only an owner can invite another owner", code: "ONLY_OWNER_CAN_INVITE_OWNER" },
          { status: 403 }
        );
      }
    } else if (!["admin", "member", "viewer"].includes(inviteRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: owner, admin, member, viewer" },
        { status: 400 }
      );
    }

    // Workspace-scoping geldt alleen voor member/viewer — owner/admin bypassen
    // de per-workspace ACL (zie hasWorkspaceAccess), dus een beperking zou
    // stilletjes niets doen. Liever expliciet weigeren dan schijnveiligheid.
    if (workspaceIds.length > 0) {
      if (!["member", "viewer"].includes(inviteRole)) {
        return NextResponse.json(
          {
            error: "Workspace restriction only applies to member/viewer roles — owners and admins always see all workspaces",
            code: "WORKSPACE_SCOPE_ROLE_MISMATCH",
          },
          { status: 400 }
        );
      }
      const validCount = await prisma.workspace.count({
        where: { id: { in: workspaceIds }, organizationId },
      });
      if (validCount !== workspaceIds.length) {
        return NextResponse.json(
          { error: "One or more workspaces do not belong to this organization" },
          { status: 400 }
        );
      }
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
          { error: "User is already a member of this organization", code: "ALREADY_MEMBER" },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        // Insensitive: legacy-rijen van vóór de normalisatie kunnen
        // hoofdletters bevatten en zouden anders een tweede pending
        // uitnodiging voor hetzelfde adres toelaten.
        email: { equals: email, mode: "insensitive" },
        organizationId,
        status: "pending",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email", code: "INVITE_ALREADY_PENDING" },
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
        workspaceIds,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send the invite email. We intentionally don't fail the request if
    // mail fails — the invitation record exists and the link can be
    // retrieved by the inviter from the UI.
    const inviterName = session.user.name || session.user.email || "A teammate";
    // E-mailtaal: heeft de ontvanger nog geen account, dan volgen we de
    // uitnodiger (zelfde team ≈ zelfde taal). Heeft hij er wél een, dan zijn
    // eigen voorkeur — en zonder voorkeur-rij valt `resolveEmailLocale`
    // terug op 'en', niet op de uitnodiger.
    const locale = await resolveEmailLocale(existingUser?.id ?? session.user.id);
    // emailBaseUrl → de app-host (app.branddock.app), niet de marketing-apex.
    // `lang` reist mee omdat de ontvanger nog geen UI-taalvoorkeur heeft: de
    // accept-pagina leest bewust deze parameter i.p.v. i18next/de cookie,
    // anders opent een NL-mail een EN-landing.
    const acceptUrl =
      `${emailBaseUrl()}/invite/accept` +
      `?token=${encodeURIComponent(invitation.token)}&lang=${locale}`;
    const targetName = await resolveInviteTargetName({
      organizationId,
      organizationName: org?.name ?? "your team",
      workspaceIds,
    });
    const { subject, html, text } = renderInviteEmail({
      recipientEmail: email,
      inviterName,
      targetName,
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
        invitation,
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
