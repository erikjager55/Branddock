import { prisma } from '@/lib/prisma';

/**
 * De naam waarvoor iemand is uitgenodigd.
 *
 * Regel (Erik, 2026-07-22): bij precies één workspace toont de uitnodiging de
 * **workspace**-naam; bij nul (= toegang tot alles, en altijd zo voor
 * owner/admin) of meerdere workspaces de **organisatie**-naam.
 *
 * Waarom gedeeld: de naam wordt op drie plekken getoond (uitnodigingsmail,
 * accept-respons, resend-mail). Drie losse berekeningen van dezelfde waarheid
 * lopen gegarandeerd uit elkaar — zie de "twee plekken houden dezelfde
 * waarheid bij"-familie in gotchas.md.
 *
 * Fail-soft: een workspace die tussen uitnodigen en tonen verwijderd is valt
 * terug op de organisatienaam.
 */
export async function resolveInviteTargetName(params: {
  organizationId: string;
  organizationName: string;
  workspaceIds: string[];
}): Promise<string> {
  const { organizationId, organizationName, workspaceIds } = params;

  const workspaceId = workspaceIds.length === 1 ? workspaceIds[0] : undefined;
  if (!workspaceId) return organizationName;

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, organizationId },
    select: { name: true },
  });

  return workspace?.name ?? organizationName;
}
