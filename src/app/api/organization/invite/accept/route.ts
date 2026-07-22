import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { resolveInviteTargetName } from "@/lib/invitations/invite-target-name";
import { enforceOrgPlanLimit } from "@/lib/stripe/enforcement";
import { checkGenericRateLimit } from "@/lib/ai/rate-limiter";
import { authRateLimitMax } from "@/lib/auth/auth-rate-limiter";

// L8 Zod-sweep (audit 2026-06-26, batch 6): een niet-string `token` (getal/
// object) 500'de in prisma.findUnique; malformed JSON idem.
const acceptSchema = z.object({
  token: z.string().min(1).max(500),
});

// Dit endpoint is onauthenticated tot ná de token-lookup en ontgrendelt
// accountaanmaak op andermans adres; `src/proxy.ts` limiteert alleen
// `/api/auth/*`. Ruim genoeg voor een heel team achter één kantoor-NAT (de
// pagina doet ~2 calls per genodigde), streng genoeg tegen token-raden.
// Distributed zodra `UPSTASH_REDIS_REST_URL` is gezet; zonder Redis valt
// `checkGenericRateLimit` terug op een per-instance map.
const ACCEPT_WINDOW_MS = 15 * 60 * 1000;
const ACCEPT_MAX = authRateLimitMax(60);

// POST /api/organization/invite/accept — accept an invitation
export async function POST(request: NextRequest) {
  // Buiten de try, zodat de race-afhandeling in de catch dezelfde velden kan
  // teruggeven als het normale pad (anders toont de verliezende tab een lege
  // naam en slaat hij setActive over).
  const raceContext: {
    targetName?: string;
    organizationId?: string;
    workspaceId?: string;
  } = {};
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const limit = await checkGenericRateLimit(
      `invite-accept:${ip}`,
      ACCEPT_MAX,
      ACCEPT_WINDOW_MS,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)),
            ),
          },
        },
      );
    }

    const parsed = await parseJsonBody(request, acceptSchema);
    if (!parsed.ok) return parsed.response;
    const { token } = parsed.data;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    // `code` is het contract met de accept-pagina. Die matchte eerder op de
    // Engelse fouttekst (regex op "expired"), wat stil breekt zodra iemand de
    // copy herformuleert én elke onbekende 400 als "al gebruikt" toonde.
    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      // Twee onderscheiden die anders allebei als "al gebruikt" landden:
      // (1) een verlopen uitnodiging is hieronder al op `expired` gezet door
      //     een eerdere aanroep, en moet "verlopen" blijven melden;
      // (2) ingetrokken uitnodigingen bestaan in twee spellingen in dezelfde
      //     tabel — onze cancel-route schrijft "cancelled", de Better-Auth-
      //     organization-plugin "canceled" (plus "rejected").
      const withdrawn = ["cancelled", "canceled", "rejected"];
      const statusCode =
        invitation.status === "expired"
          ? "EXPIRED"
          : withdrawn.includes(invitation.status)
            ? "CANCELLED"
            : "NOT_PENDING";
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}`, code: statusCode },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      return NextResponse.json(
        { error: "Invitation has expired", code: "EXPIRED" },
        { status: 400 }
      );
    }

    // Waar de uitnodiging voor geldt — één workspace toont de workspace-naam,
    // anders de organisatie. Gedeeld met de uitnodigingsmail zodat de landing
    // exact hetzelfde noemt als het mailtje waar de gebruiker vandaan komt.
    const targetName = await resolveInviteTargetName({
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
      workspaceIds: invitation.workspaceIds,
    });
    raceContext.targetName = targetName;
    raceContext.organizationId = invitation.organizationId;

    const isScoped =
      invitation.workspaceIds.length > 0 &&
      ["member", "viewer"].includes(invitation.role);

    // Alleen workspaces die (nog) bij deze organisatie horen — een workspace
    // kan tussen uitnodigen en accepteren verwijderd zijn.
    const validWorkspaces = isScoped
      ? await prisma.workspace.findMany({
          where: {
            id: { in: invitation.workspaceIds },
            organizationId: invitation.organizationId,
          },
          select: { id: true },
          // Deterministisch: zonder orderBy verschilt de landings-workspace
          // per request bij een invite voor meerdere workspaces.
          orderBy: { createdAt: "asc" },
        })
      : [];
    raceContext.workspaceId = validWorkspaces[0]?.id;

    // Fail-CLOSED, en bewust vóór de sessiecheck: eerder werd bij een lege
    // `validWorkspaces` gewoon doorgelopen zonder ACL-rijen aan te maken — en
    // `hasWorkspaceAccess` leest "nul ACL-rijen" als ONBEPERKT
    // (workspace-resolver.ts:103), dus een uitnodiging voor één inmiddels
    // verwijderde workspace gaf toegang tot álle workspaces van de
    // organisatie. Deze check staat vóór de login-tak zodat een genodigde
    // niet eerst een account aanmaakt voor een uitnodiging die tóch niet kan
    // slagen (gevonden in de smoke).
    if (isScoped && validWorkspaces.length === 0) {
      return NextResponse.json(
        {
          error: "The workspace for this invitation no longer exists",
          code: "WORKSPACE_GONE",
        },
        { status: 400 }
      );
    }

    // Check if user is logged in
    const session = await getServerSession();

    if (!session) {
      // User not logged in — the accept page renders its own sign-up/sign-in
      // with this email locked, then retries this endpoint.
      return NextResponse.json(
        {
          requiresAuth: true,
          email: invitation.email,
          targetName,
          role: invitation.role,
        },
        { status: 401 }
      );
    }

    // Hoofdletter-ongevoelig vergelijken: nieuwe uitnodigingen worden
    // genormaliseerd opgeslagen, maar bestaande rijen (van vóór 2026-07-22)
    // kunnen hoofdletters bevatten terwijl Better Auth de gebruiker
    // gegarandeerd lowercase heeft aangemaakt.
    if (
      session.user.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error: "This invitation was sent to a different email address",
          code: "EMAIL_MISMATCH",
        },
        { status: 403 }
      );
    }

    /**
     * Bij een uitnodiging voor precies één workspace ook de workspace-cookie
     * zetten. `resolveWorkspaceId()` valt anders terug op de OUDSTE workspace
     * van de organisatie (workspace-resolver.ts:35-40), en dat pad raadpleegt
     * de ACL niet — een gescopete genodigde zou dus op een workspace landen
     * waar hij geen toegang toe heeft. Geldt voor béide succespaden (nieuw
     * lid én bestaand lid). Zelfde cookie-opties als /api/workspace/switch.
     */
    const withWorkspaceCookie = (response: NextResponse) => {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
      };
      // Élke workspace uit `validWorkspaces` is per definitie ACL-toegekend,
      // dus ook bij een uitnodiging voor méér dan één workspace is de eerste
      // een veilige landing. Alleen de cookie wissen (het `else`-pad) zou de
      // gebruiker juist uitleveren aan de ACL-blinde fallback.
      if (validWorkspaces.length >= 1) {
        response.cookies.set("branddock-workspace-id", validWorkspaces[0].id, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 365,
        });
      } else {
        // Geen enkele workspace-scoping: een bestaand lid heeft mogelijk nog
        // een cookie van zijn vórige workspace, en die WINT van de zojuist
        // actief gezette organisatie (resolveWorkspaceId stap 1). Zonder dit
        // landt hij na accepteren alsnog in zijn oude workspace — precies wat
        // `setActive` moest voorkomen.
        response.cookies.set("branddock-workspace-id", "", {
          ...cookieOptions,
          maxAge: 0,
        });
      }
      return response;
    };

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
      await prisma.$transaction(async (tx) => {
        // Scoping alleen VERBREDEN, nooit inperken: een bestaand lid met een
        // lege ACL heeft onbeperkte toegang; daar een rij aan toevoegen zou
        // hem juist opsluiten in één workspace. Heeft hij al een beperkte
        // ACL, dan voegt deze uitnodiging de nieuwe workspaces toe.
        //
        // Uitzondering: gaat de rol omláág van owner/admin naar member/viewer,
        // dan had dit lid geen ACL-rijen omdát zijn rol de ACL oversloeg. Zonder
        // die rijen zou hij ná de degradatie alsnog onbeperkt zijn (nul rijen =
        // onbeperkt) en de scoping uit de uitnodiging stil verdampen.
        const losesRoleBypass =
          ["owner", "admin"].includes(existingMember.role) &&
          ["member", "viewer"].includes(invitation.role);
        if (isScoped) {
          const aclCount = await tx.workspaceMemberAccess.count({
            where: { memberId: existingMember.id },
          });
          // `workspaceScoped` telt óók mee: een lid dat gescopet is maar
          // door een workspace-verwijdering nul rijen overhield, moet met
          // deze uitnodiging juist wél weer rijen krijgen.
          if (existingMember.workspaceScoped || aclCount > 0 || losesRoleBypass) {
            await tx.workspaceMemberAccess.createMany({
              data: validWorkspaces.map((w) => ({
                memberId: existingMember.id,
                workspaceId: w.id,
              })),
              skipDuplicates: true,
            });
            await tx.organizationMember.update({
              where: { id: existingMember.id },
              data: { workspaceScoped: true },
            });
          }
        }
        // Rol verzoenen: de uitnodiging belooft een rol ("je doet mee als
        // beheerder") en die belofte werd niet nagekomen voor wie al lid was.
        // Owner-toekenning is bij het uitnodigen al beperkt tot owners (M1),
        // dus overnemen is hier veilig — met één uitzondering: de laatste
        // owner mag niet gedegradeerd worden, anders blijft de organisatie
        // stuurloos achter.
        // Alleen een uitnodiging die NIEUWER is dan de laatste rolwijziging mag
        // de rol overschrijven. Uitnodigingen leven 7 dagen; zonder deze check
        // zet een oude mail een sindsdien bewust aangepaste rol stil terug.
        const invitationIsFresh =
          invitation.createdAt >= existingMember.updatedAt;

        if (existingMember.role !== invitation.role && invitationIsFresh) {
          const wouldDropLastOwner =
            existingMember.role === "owner" && invitation.role !== "owner";
          const otherOwners = wouldDropLastOwner
            ? await tx.organizationMember.count({
                where: {
                  organizationId: invitation.organizationId,
                  role: "owner",
                  // Een gedeactiveerd lid telt niet als achtervang — elders in
                  // de codebase filtert élke seat-/ledentelling op isActive.
                  isActive: true,
                  id: { not: existingMember.id },
                },
              })
            : 1;
          if (!wouldDropLastOwner || otherOwners > 0) {
            await tx.organizationMember.update({
              where: { id: existingMember.id },
              data: { role: invitation.role },
            });
          } else {
            console.warn(
              "[invite/accept] rol-degradatie geweigerd — laatste owner",
              { organizationId: invitation.organizationId },
            );
          }
        }
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        });
      });
      return withWorkspaceCookie(
        NextResponse.json({
          alreadyMember: true,
          targetName,
          organizationId: invitation.organizationId,
        })
      );
    }

    // Seat-limiet óók bij accepteren: bij het versturen telt
    // `enforceOrgPlanLimit` alleen bestaande leden, dus N openstaande
    // uitnodigingen konden samen over de planlimiet heen accepteren.
    const seatLimited = await enforceOrgPlanLimit(
      invitation.organizationId,
      "TEAM_MEMBERS",
    );
    if (seatLimited) return seatLimited;

    // Create OrganizationMember (+ eventuele workspace-scoping) and mark
    // invitation as accepted (transaction). Lege workspaceIds = alle
    // workspaces (geen ACL-rijen); scoping geldt alleen voor member/viewer.
    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.organizationMember.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
          // Expliciet beperkt: zonder deze vlag zou het wegvallen van de
          // laatste toegekende workspace dit lid onbeperkt maken.
          workspaceScoped: isScoped,
        },
      });

      if (isScoped) {
        await tx.workspaceMemberAccess.createMany({
          data: validWorkspaces.map((w) => ({
            memberId: created.id,
            workspaceId: w.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      return created;
    });

    return withWorkspaceCookie(
      NextResponse.json({
        member,
        targetName,
        // De pagina zet hiermee de uitgenodigde organisatie actief; zonder dat
        // landt een net aangemelde genodigde in zijn eigen auto-org (leeg) en
        // lijkt de uitnodiging mislukt.
        organizationId: invitation.organizationId,
      })
    );
  } catch (error) {
    // Twee tabbladen die tegelijk accepteren passeren allebei de
    // existingMember-check en racen op de unique (userId, organizationId).
    // De verliezer is feitelijk gewoon lid — geen 500 tonen. Alleen déze
    // constraint afvangen: een andere P2002 is een echte fout en mag niet als
    // succes worden gerapporteerd.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      String(error.meta?.target ?? "").includes("organizationId")
    ) {
      const raceResponse = NextResponse.json({
        alreadyMember: true,
        targetName: raceContext.targetName,
        organizationId: raceContext.organizationId,
      });
      // Zelfde landing als het normale pad; anders valt juist de verliezende
      // tab terug op de ACL-blinde workspace-resolutie.
      raceResponse.cookies.set(
        "branddock-workspace-id",
        raceContext.workspaceId ?? "",
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: raceContext.workspaceId ? 60 * 60 * 24 * 365 : 0,
        }
      );
      return raceResponse;
    }
    console.error("[POST /api/organization/invite/accept]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
