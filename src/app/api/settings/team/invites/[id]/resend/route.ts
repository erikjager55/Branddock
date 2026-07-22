import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { trySendTransactional } from "@/lib/email/transactional";
import { emailBaseUrl } from "@/lib/email/base-url";
import { resolveEmailLocale } from "@/lib/email/email-locale";
import { renderInviteEmail } from "@/lib/email/templates/invite";
import { resolveInviteTargetName } from "@/lib/invitations/invite-target-name";

type RouteParams = { params: Promise<{ id: string }> };

// Cooldown per uitnodiging. Deze route verstuurt sinds 2026-07-22 écht mail
// (daarvóór verzette hij alleen de vervaldatum), dus zonder rem kan een
// owner/admin de inbox van een genodigde vollopen — en dat gaat over ons
// gedeelde verzenddomein, dus het raakt de deliverability van álle mail.
// In-memory volstaat: per-instance is de rem streng genoeg en er is geen
// schema-wijziging voor nodig.
const RESEND_COOLDOWN_MS = 60_000;
const lastResendAt = new Map<string, number>();

// POST /api/settings/team/invites/[id]/resend — extend expiry by 7 days AND
// send the invitation email again
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    // Only owner/admin can resend invites
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
        { error: "Only owners and admins can resend invitations" },
        { status: 403 }
      );
    }

    // Find the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id,
        organizationId: activeOrgId,
        status: "pending",
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found or not pending" },
        { status: 404 }
      );
    }

    const previous = lastResendAt.get(id);
    if (previous && Date.now() - previous < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - previous)) / 1000
      );
      return NextResponse.json(
        {
          error: "Please wait before resending this invitation again",
          code: "RESEND_COOLDOWN",
          retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Niet opnieuw mailen wat toch niet geaccepteerd kán worden: het
    // accept-pad weigert een gescopete uitnodiging waarvan de workspace
    // verdwenen is (WORKSPACE_GONE). Zonder deze check stuurt resend een
    // link die aan de andere kant hard faalt, met bovendien de organisatie-
    // naam in het onderwerp doordat de naam-helper fail-soft terugvalt.
    const isScoped =
      invitation.workspaceIds.length > 0 &&
      ["member", "viewer"].includes(invitation.role);
    if (isScoped) {
      const stillThere = await prisma.workspace.count({
        where: {
          id: { in: invitation.workspaceIds },
          organizationId: activeOrgId,
        },
      });
      if (stillThere === 0) {
        return NextResponse.json(
          {
            error: "The workspace for this invitation no longer exists",
            code: "WORKSPACE_GONE",
          },
          { status: 400 }
        );
      }
    }

    // Update expiry to 7 days from now
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.invitation.update({
      where: { id },
      data: { expiresAt: newExpiresAt },
    });

    // Tot 2026-07-22 verzette deze route alléén de vervaldatum: de knop heet
    // "opnieuw versturen" maar er ging nooit een tweede mail uit. Dezelfde
    // opbouw als POST /api/organization/invite — inclusief de gedeelde
    // naamregel, zodat de herhaalmail exact hetzelfde noemt als de eerste.
    const org = await prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { name: true },
    });
    const recipientUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    const locale = await resolveEmailLocale(recipientUser?.id ?? session.user.id);
    const acceptUrl =
      `${emailBaseUrl()}/invite/accept` +
      `?token=${encodeURIComponent(invitation.token)}&lang=${locale}`;
    const targetName = await resolveInviteTargetName({
      organizationId: activeOrgId,
      organizationName: org?.name ?? "your team",
      workspaceIds: invitation.workspaceIds,
    });
    const { subject, html, text } = renderInviteEmail({
      recipientEmail: invitation.email,
      inviterName: session.user.name || session.user.email || "A teammate",
      targetName,
      role: invitation.role,
      acceptUrl,
      expiresAt: newExpiresAt,
      locale,
    });
    // Mail-falen mag de verlenging niet terugdraaien — de uitnodiging is al
    // 7 dagen langer geldig en de link blijft werken.
    const sendResult = await trySendTransactional({
      to: invitation.email,
      subject,
      html,
      text,
      tags: { kind: "organization_invite_resend", organization_id: activeOrgId },
    });

    if (sendResult.ok) {
      // Cooldown pas ná een geslaagde verzending: anders sluit een mislukte
      // poging de admin 60s buiten voor iets dat niet is gebeurd. En meteen
      // verlopen entries opruimen — de Map groeide anders onbegrensd.
      const cutoff = Date.now() - RESEND_COOLDOWN_MS;
      for (const [key, at] of lastResendAt) {
        if (at < cutoff) lastResendAt.delete(key);
      }
      lastResendAt.set(id, Date.now());
    } else {
      // Provider-details horen in de serverlog, niet in de browser.
      console.error(
        "[POST /api/settings/team/invites/[id]/resend] mail mislukt:",
        sendResult.error
      );
    }

    return NextResponse.json({
      success: true,
      newExpiresAt: newExpiresAt.toISOString(),
      emailSent: sendResult.ok,
    });
  } catch (error) {
    console.error("[POST /api/settings/team/invites/[id]/resend]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
