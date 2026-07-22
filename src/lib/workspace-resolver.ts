import { prisma } from "./prisma";
import { cookies } from "next/headers";

/**
 * De workspace-ids waartoe een lid binnen één organisatie toegang heeft.
 *
 * Spiegelt exact de regels van `hasWorkspaceAccess`: owner/admin bypassen de
 * per-workspace-ACL, en voor member/viewer beslist `workspaceScoped`.
 * `null` = onbeperkt binnen deze organisatie, een array = precies deze
 * workspaces — en een LEGE array betekent dus géén enkele (niet "alle", zoals
 * vóór 2026-07-22).
 */
async function accessibleWorkspaceIds(
  userId: string,
  organizationId: string,
): Promise<string[] | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true, role: true, workspaceScoped: true },
  });
  if (!membership) return [];

  if (["owner", "admin"].includes(membership.role)) return null;
  // `workspaceScoped` is de bron-van-waarheid, niet "heeft dit lid rijen?".
  // Zonder die vlag betekende nul rijen ONBEPERKT, en dan promoveert het
  // verwijderen van de laatste toegekende workspace een gescopet lid stil
  // tot toegang-tot-alles.
  if (!membership.workspaceScoped) return null;

  const acl = await prisma.workspaceMemberAccess.findMany({
    where: { memberId: membership.id, workspace: { organizationId } },
    select: { workspaceId: true },
  });
  return acl.map((row) => row.workspaceId);
}

/**
 * Eerste workspace binnen een organisatie waar deze gebruiker écht bij mag.
 *
 * Waarom niet gewoon de oudste: dit pad voedt `resolveWorkspaceId`, en dat
 * wordt door ~398 API-routes vertrouwd zonder eigen ACL-check. Een
 * workspace-gescopet lid landde daardoor op de oudste workspace van de
 * organisatie — buiten zijn scope, met lees/schrijf-toegang (gevonden bij de
 * invite-flow-review 2026-07-22, toen gescopete leden voor het eerst konden
 * ontstaan).
 */
async function firstAccessibleWorkspace(
  organizationId: string,
  userId: string,
) {
  const allowed = await accessibleWorkspaceIds(userId, organizationId);
  if (allowed !== null && allowed.length === 0) return null;

  return prisma.workspace.findFirst({
    where: {
      organizationId,
      ...(allowed === null ? {} : { id: { in: allowed } }),
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get workspace by explicit cookie selection.
 * Used when an agency user has switched to a specific workspace.
 */
export async function getExplicitWorkspace(userId: string) {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("branddock-workspace-id")?.value;
  if (!workspaceId) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) return null;

  // Volledige ACL-check, niet alleen org-lidmaatschap: anders kon een
  // gescopet lid met een zelfgezette cookie elke workspace van zijn
  // organisatie openen. Bewust niet via `hasWorkspaceAccess` — die zou de
  // workspace hierboven nóg een keer ophalen, en dit is het heetste pad van
  // de app (elke request via `resolveWorkspaceId`).
  const allowed = await accessibleWorkspaceIds(userId, workspace.organizationId);
  if (allowed !== null && !allowed.includes(workspaceId)) return null;

  return workspace;
}

/**
 * Eerste workspace van een organisatie. Geef `userId` mee waar de gebruiker
 * bekend is — dan respecteert de keuze zijn workspace-ACL.
 */
export async function getWorkspaceForOrganization(
  organizationId: string,
  userId?: string,
) {
  if (userId) return firstAccessibleWorkspace(organizationId, userId);

  return prisma.workspace.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceForUser(userId: string) {
  // Alle organisaties van de gebruiker langs, en per organisatie de eerste
  // workspace waar hij daadwerkelijk bij mag. Nam eerder blind de eerste
  // workspace van de eerste organisatie.
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });

  for (const { organizationId } of memberships) {
    const workspace = await firstAccessibleWorkspace(organizationId, userId);
    if (workspace) return workspace;
  }

  return null;
}

/**
 * Effective access check for a (user, workspace) pair.
 *
 * Rules (mirrors `/api/workspace/switch`):
 *   1. User must be an OrganizationMember of the workspace's org.
 *   2. OWNER/ADMIN bypass per-workspace ACL.
 *   3. For member/viewer beslist `OrganizationMember.workspaceScoped`:
 *      `false` = onbeperkt binnen de organisatie, `true` = uitsluitend de
 *      workspaces met een expliciete `WorkspaceMemberAccess`-rij — en dat
 *      mogen er nul zijn (= geen toegang). Vóór 2026-07-22 werd "nul rijen"
 *      als onbeperkt gelezen; zie de veld-documentatie in schema.prisma.
 *
 * Use this for any direct-ID lookup that would otherwise trust
 * `resolveWorkspaceId()`'s cookie/session path — that path does not
 * re-check ACL, so a stale cookie or direct product-ID hit could
 * bypass revoked access without this guard (9.6 M9).
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) return false;

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: workspace.organizationId,
      },
    },
    select: { id: true, role: true, workspaceScoped: true },
  });
  if (!membership) return false;

  if (["owner", "admin"].includes(membership.role)) return true;
  if (!membership.workspaceScoped) return true;

  const row = await prisma.workspaceMemberAccess.findUnique({
    where: {
      memberId_workspaceId: {
        memberId: membership.id,
        workspaceId,
      },
    },
    select: { id: true },
  });
  return row !== null;
}
