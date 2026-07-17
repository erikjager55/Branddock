// =============================================================
// Publieke Brand-API — merk-resolutie & toegangsmodel ("merken zijn taal",
// vervolg op ADR 2026-07-17-public-brand-api).
//
// Eén module beantwoordt drie vragen voor elke publieke MCP/REST-aanroep:
//  1. Wélk merk (workspace) is het default voor deze caller?
//     - API-key: de key-workspace (merk-vergrendeld by design).
//     - OAuth: consent-slot > actieve organisatie > oudste membership —
//       "de koppeling volgt je actieve organisatie in Branddock".
//  2. Mag de caller een expliciet `brand`-param (id of naam) gebruiken?
//     - OAuth: alleen merken waar de user actief lid van is (ACL-bewust).
//     - API-key: `brand` mag alléén het key-merk benoemen — afwijken is een
//       duidelijke error, geen stil negeren.
//  3. Mag de caller schrijven? OAuth-viewers zijn read-only (zelfde
//     rol-semantiek als de app: mutaties zijn member+); het key-pad is
//     machine-toegang en blijft ongewijzigd workspace-gescoped.
//
// ACL-semantiek gespiegeld aan src/lib/workspace-resolver.ts:
// owner/admin zien alle org-workspaces; member/viewer met lege
// WorkspaceMemberAccess = onbeperkt, niet-leeg = alleen expliciete rijen.
// =============================================================

import { prisma } from '@/lib/prisma';

/**
 * Minimale auth-context die de resolver nodig heeft — structureel gelijk aan
 * PublicMcpContext (mcp-server.ts importeert déze module, niet andersom).
 */
export interface BrandAccessContext {
  workspaceId: string;
  authVia: 'api_key' | 'oauth';
  /** OAuth-pad: de token-user (draagt membership- en rol-checks). */
  userId?: string;
  /** OAuth-pad: consent-vergrendeling op één merk (undefined = geen slot). */
  lockedWorkspaceId?: string;
}

/** Eén merk zoals list_brands het toont. */
export interface BrandListing {
  workspaceId: string;
  name: string;
  organizationName: string;
  /** OAuth-pad: rol van de user in de org van dit merk; key-pad: null (machine). */
  role: string | null;
  /** Het merk waar aanroepen zonder `brand`-param op landen. */
  isDefault: boolean;
}

export type BrandResolution =
  | { ok: true; workspaceId: string }
  | { ok: false; error: string };

export type WriteAccessCheck = { ok: true } | { ok: false; error: string };

interface MembershipInfo {
  memberId: string;
  role: string;
  organizationId: string;
}

const ADMIN_ROLES = ['owner', 'admin'];

/**
 * Actieve membership van een user in de org van een workspace, inclusief de
 * per-workspace-ACL-check (mirror van hasWorkspaceAccess in
 * workspace-resolver.ts — hier los geïmplementeerd omdat die module
 * `next/headers` importeert en deze module ook in scripts moet draaien).
 * Null = geen (effectieve) toegang tot dit merk.
 */
export async function getMembershipForWorkspace(
  userId: string,
  workspaceId: string,
): Promise<MembershipInfo | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) return null;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: workspace.organizationId } },
    select: { id: true, role: true, isActive: true },
  });
  if (!membership || !membership.isActive) return null;

  if (!ADMIN_ROLES.includes(membership.role)) {
    const aclCount = await prisma.workspaceMemberAccess.count({
      where: { memberId: membership.id },
    });
    if (aclCount > 0) {
      const row = await prisma.workspaceMemberAccess.findUnique({
        where: { memberId_workspaceId: { memberId: membership.id, workspaceId } },
        select: { id: true },
      });
      if (!row) return null;
    }
  }

  return { memberId: membership.id, role: membership.role, organizationId: workspace.organizationId };
}

/** Oudste workspace van een org die deze membership mag zien (ACL-bewust). */
async function oldestAccessibleWorkspace(
  member: { id: string; role: string },
  organizationId: string,
): Promise<string | null> {
  let restrictedIds: string[] | null = null;
  if (!ADMIN_ROLES.includes(member.role)) {
    const acl = await prisma.workspaceMemberAccess.findMany({
      where: { memberId: member.id },
      select: { workspaceId: true },
    });
    if (acl.length > 0) restrictedIds = acl.map((row) => row.workspaceId);
  }
  const workspace = await prisma.workspace.findFirst({
    where: { organizationId, ...(restrictedIds ? { id: { in: restrictedIds } } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return workspace?.id ?? null;
}

export interface OAuthWorkspaceResolution {
  workspaceId: string;
  /** Gevuld wanneer de consent-koppeling op één merk vergrendeld is. */
  lockedWorkspaceId: string | null;
}

/**
 * Default-merk voor een OAuth-caller — "volgt je actieve organisatie in
 * Branddock". Volgorde:
 *  1. Consent-slot: recentste OauthConsent (user × client) met
 *     lockedWorkspaceId → dat merk, hard. Slot zonder (nog) geldige toegang
 *     → null (bewust géén stil ontgrendelen: caller krijgt 401).
 *  2. Actieve organisatie: recentste Session met een activeOrganizationId
 *     waarin de user nog actief lid is → oudste (ACL-toegankelijke) workspace
 *     van die org. NB de workspace-cookie (`branddock-workspace-id`) is hier
 *     niet server-opvraagbaar — org-granulariteit is de bewuste keuze.
 *  3. v1-fallback: oudste actieve membership → oudste workspace van die org.
 */
export async function resolveOAuthWorkspace(
  userId: string,
  clientId: string,
): Promise<OAuthWorkspaceResolution | null> {
  // 1. Consent-slot
  const lockedConsent = await prisma.oauthConsent.findFirst({
    where: { userId, clientId, consentGiven: true, lockedWorkspaceId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { lockedWorkspaceId: true },
  });
  if (lockedConsent?.lockedWorkspaceId) {
    const membership = await getMembershipForWorkspace(userId, lockedConsent.lockedWorkspaceId);
    if (!membership) return null;
    return {
      workspaceId: lockedConsent.lockedWorkspaceId,
      lockedWorkspaceId: lockedConsent.lockedWorkspaceId,
    };
  }

  // 2. Actieve organisatie uit de recentste sessie
  const session = await prisma.session.findFirst({
    where: { userId, activeOrganizationId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { activeOrganizationId: true },
  });
  if (session?.activeOrganizationId) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: session.activeOrganizationId, isActive: true },
      select: { id: true, role: true },
    });
    if (member) {
      const workspaceId = await oldestAccessibleWorkspace(member, session.activeOrganizationId);
      if (workspaceId) return { workspaceId, lockedWorkspaceId: null };
    }
  }

  // 3. v1-fallback: oudste actieve membership → oudste workspace
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { joinedAt: 'asc' },
    select: { id: true, role: true, organizationId: true },
  });
  if (!membership) return null;
  const workspaceId = await oldestAccessibleWorkspace(membership, membership.organizationId);
  return workspaceId ? { workspaceId, lockedWorkspaceId: null } : null;
}

/**
 * Alle merken die een user via zijn actieve memberships kan gebruiken
 * (ACL-bewust, oudste org eerst). Gedeeld door list_brands (OAuth-pad) en
 * het consent-scherm (/api/oauth/my-brands).
 */
export async function listBrandsForUser(
  userId: string,
): Promise<Array<Omit<BrandListing, 'isDefault'>>> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, isActive: true },
    orderBy: { joinedAt: 'asc' },
    select: {
      id: true,
      role: true,
      organization: {
        select: {
          name: true,
          workspaces: {
            select: { id: true, name: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  const restrictedMemberIds = memberships
    .filter((m) => !ADMIN_ROLES.includes(m.role))
    .map((m) => m.id);
  const aclRows = restrictedMemberIds.length
    ? await prisma.workspaceMemberAccess.findMany({
        where: { memberId: { in: restrictedMemberIds } },
        select: { memberId: true, workspaceId: true },
      })
    : [];
  const aclByMember = new Map<string, Set<string>>();
  for (const row of aclRows) {
    const set = aclByMember.get(row.memberId) ?? new Set<string>();
    set.add(row.workspaceId);
    aclByMember.set(row.memberId, set);
  }

  const brands: Array<Omit<BrandListing, 'isDefault'>> = [];
  for (const membership of memberships) {
    const acl = aclByMember.get(membership.id);
    for (const workspace of membership.organization.workspaces) {
      // Lege ACL = onbeperkt binnen de org; niet-lege = alleen expliciete rijen.
      if (acl && !acl.has(workspace.id)) continue;
      brands.push({
        workspaceId: workspace.id,
        name: workspace.name,
        organizationName: membership.organization.name,
        role: membership.role,
      });
    }
  }
  return brands;
}

/**
 * De merken die déze caller via list_brands hoort te zien:
 * key-pad = alleen het key-merk; OAuth met consent-slot = alleen het slot;
 * OAuth zonder slot = alle actieve memberships. isDefault markeert waar
 * aanroepen zonder `brand`-param landen.
 */
export async function listBrandsForContext(ctx: BrandAccessContext): Promise<BrandListing[]> {
  if (ctx.authVia === 'api_key' || !ctx.userId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: ctx.workspaceId },
      select: { name: true, organization: { select: { name: true } } },
    });
    if (!workspace) return [];
    return [
      {
        workspaceId: ctx.workspaceId,
        name: workspace.name,
        organizationName: workspace.organization.name,
        role: null,
        isDefault: true,
      },
    ];
  }

  const brands = await listBrandsForUser(ctx.userId);
  const visible = ctx.lockedWorkspaceId
    ? brands.filter((b) => b.workspaceId === ctx.lockedWorkspaceId)
    : brands;
  return visible.map((brand) => ({ ...brand, isDefault: brand.workspaceId === ctx.workspaceId }));
}

/** Matcht een `brand`-param (id of naam, case-insensitive) tegen één merk-rij. */
function matchesBrand(needle: string, brand: { workspaceId: string; name: string }): boolean {
  return brand.workspaceId === needle || brand.name.toLowerCase() === needle.toLowerCase();
}

/**
 * Resolvet het effectieve merk voor een tool-aanroep. Zonder `brand`-param:
 * het context-default. Mét: workspace-id of exacte merknaam
 * (case-insensitive), gevalideerd tegen membership (OAuth) dan wel
 * key-binding (API-key). Fouten zijn bewust generiek ("no access") zodat
 * merk-namen/-ids van derden niet te enumereren zijn.
 */
export async function resolveBrandParam(
  ctx: BrandAccessContext,
  brand: string | undefined,
): Promise<BrandResolution> {
  const needle = brand?.trim();
  if (!needle) return { ok: true, workspaceId: ctx.workspaceId };

  if (ctx.authVia === 'api_key' || !ctx.userId) {
    // Keys zijn merk-vergrendeld — `brand` mag alleen het key-merk zelf benoemen.
    const workspace = await prisma.workspace.findUnique({
      where: { id: ctx.workspaceId },
      select: { id: true, name: true },
    });
    if (workspace && matchesBrand(needle, { workspaceId: workspace.id, name: workspace.name })) {
      return { ok: true, workspaceId: workspace.id };
    }
    return {
      ok: false,
      error:
        `This API key is locked to the brand "${workspace?.name ?? ctx.workspaceId}". ` +
        'API keys are workspace-scoped by design — omit the brand parameter, or create a key in the other workspace.',
    };
  }

  if (ctx.lockedWorkspaceId) {
    const locked = await prisma.workspace.findUnique({
      where: { id: ctx.lockedWorkspaceId },
      select: { id: true, name: true },
    });
    if (locked && matchesBrand(needle, { workspaceId: locked.id, name: locked.name })) {
      return { ok: true, workspaceId: locked.id };
    }
    return {
      ok: false,
      error:
        `This connection is locked to the brand "${locked?.name ?? ctx.lockedWorkspaceId}" ` +
        '(chosen on the consent screen). Reconnect without the brand lock to switch brands.',
    };
  }

  const brands = await listBrandsForUser(ctx.userId);
  const byId = brands.find((b) => b.workspaceId === needle);
  if (byId) return { ok: true, workspaceId: byId.workspaceId };

  const byName = brands.filter((b) => b.name.toLowerCase() === needle.toLowerCase());
  if (byName.length === 1) return { ok: true, workspaceId: byName[0].workspaceId };
  if (byName.length > 1) {
    return {
      ok: false,
      error:
        `Brand name "${needle}" is ambiguous across your organizations — ` +
        'use the workspace id from list_brands instead.',
    };
  }

  return {
    ok: false,
    error: `No access to a brand "${needle}" — call list_brands to see the brands you can use.`,
  };
}

/**
 * Schrijf-gate: OAuth-viewers zijn read-only (mutaties zijn member+, zelfde
 * semantiek als de app-UI); het key-pad is machine-toegang en mag altijd
 * schrijven binnen zijn eigen workspace.
 */
export async function requireWriteAccess(
  ctx: BrandAccessContext,
  workspaceId: string,
): Promise<WriteAccessCheck> {
  if (ctx.authVia === 'api_key' || !ctx.userId) return { ok: true };

  const membership = await getMembershipForWorkspace(ctx.userId, workspaceId);
  if (!membership) {
    return {
      ok: false,
      error: 'No access to this brand — call list_brands to see the brands you can use.',
    };
  }
  if (membership.role === 'viewer') {
    return {
      ok: false,
      error:
        'This tool requires the member role — your role in this brand is viewer (read-only). ' +
        'Read and score tools remain available.',
    };
  }
  return { ok: true };
}
