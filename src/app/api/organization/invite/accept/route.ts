import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";

// L8 Zod-sweep (audit 2026-06-26, batch 6): een niet-string `token` (getal/
// object) 500'de in prisma.findUnique; malformed JSON idem.
const acceptSchema = z.object({
  token: z.string().min(1).max(500),
});

// POST /api/organization/invite/accept — accept an invitation
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, acceptSchema);
    if (!parsed.ok) return parsed.response;
    const { token } = parsed.data;

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

    // Create OrganizationMember (+ eventuele workspace-scoping) and mark
    // invitation as accepted (transaction). Lege workspaceIds = alle
    // workspaces (geen ACL-rijen); scoping geldt alleen voor member/viewer.
    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.organizationMember.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      if (
        invitation.workspaceIds.length > 0 &&
        ["member", "viewer"].includes(invitation.role)
      ) {
        // Alleen workspaces die (nog) bij deze organisatie horen — een
        // workspace kan tussen uitnodigen en accepteren verwijderd zijn.
        const validWorkspaces = await tx.workspace.findMany({
          where: {
            id: { in: invitation.workspaceIds },
            organizationId: invitation.organizationId,
          },
          select: { id: true },
        });
        if (validWorkspaces.length > 0) {
          await tx.workspaceMemberAccess.createMany({
            data: validWorkspaces.map((w) => ({
              memberId: created.id,
              workspaceId: w.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      return created;
    });

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
