import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { hasWorkspaceAccess } from "@/lib/workspace-resolver";

/**
 * Resultaat van een resource-gebaseerde toegangscheck op een deliverable.
 * Bij `ok: true` is `workspaceId` de workspace VAN het deliverable — gebruik
 * die voor cache-invalidation en brand-context, niet de cookie-workspace.
 */
export type DeliverableAccess =
  | { ok: true; userId: string; workspaceId: string; campaignId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Autoriseert een request op de workspace van het deliverable zelf, in plaats
 * van op gelijkheid met de `branddock-workspace-id`-cookie.
 *
 * WAAROM: de workspace-cookie is browser-globaal. Een workspace-switch in een
 * ander tabblad maakt elke open tab een "zombie-tab" waarvan cookie-scoped
 * routes stil 404'en — inclusief de puckData-autosave (data-loss). Routes met
 * een expliciete deliverableId hebben de cookie niet nodig: het deliverable
 * bepaalt de workspace, en `hasWorkspaceAccess` (org-membership + per-member
 * ACL, 9.6 M9) bepaalt of de user daar mag komen.
 * Audit: docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md
 *
 * Gebruik in routes:
 * ```ts
 * const access = await requireDeliverableAccess(deliverableId);
 * if (!access.ok) {
 *   return NextResponse.json({ error: access.error }, { status: access.status });
 * }
 * const { workspaceId } = access; // workspace van het deliverable
 * ```
 */
/**
 * Drop-in vervanger voor `resolveWorkspaceId()` in routes mét een
 * deliverableId: geeft de workspace-id van het deliverable terug wanneer de
 * sessie-user daar toegang toe heeft, anders null. Bestaande
 * `if (!workspaceId)`-guards én scoped fetches
 * (`findFirst({ where: { id, campaign: { workspaceId } } })`) blijven per
 * constructie werken — alleen de cookie-afhankelijkheid (zombie-tab-bug,
 * audit 2026-06-10) verdwijnt. Gebruik `requireDeliverableAccess` voor
 * nieuwe routes die onderscheid willen tussen 401/403/404.
 */
export async function resolveDeliverableWorkspaceId(
  deliverableId: string,
): Promise<string | null> {
  const access = await requireDeliverableAccess(deliverableId);
  return access.ok ? access.workspaceId : null;
}

export async function requireDeliverableAccess(
  deliverableId: string,
): Promise<DeliverableAccess> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: {
      id: true,
      campaign: { select: { id: true, workspaceId: true } },
    },
  });
  if (!deliverable?.campaign) {
    return { ok: false, status: 404, error: "Deliverable not found" };
  }

  const workspaceId = deliverable.campaign.workspaceId;
  const allowed = await hasWorkspaceAccess(session.user.id, workspaceId);
  if (!allowed) {
    return { ok: false, status: 403, error: "No access to this workspace" };
  }

  return {
    ok: true,
    userId: session.user.id,
    workspaceId,
    campaignId: deliverable.campaign.id,
  };
}
