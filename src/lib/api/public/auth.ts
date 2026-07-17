// =============================================================
// Publieke Brand-API — API-key-auth (ADR 2026-07-17-public-brand-api).
//
// Keys zijn workspace-gescoped, worden als sha256-hash opgeslagen en zijn
// alleen bij aanmaak eenmalig zichtbaar. De hele publieke API zit achter
// PUBLIC_API_ENABLED (default uit) — routes geven 404 zolang de flag dicht
// is, zodat het oppervlak vóór de security-gate onvindbaar blijft.
// =============================================================

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveOAuthWorkspace } from '@/lib/api/public/brand-resolver';

const KEY_PATTERN = /^Bearer\s+(bd_live_[a-f0-9]{48})$/i;

/** Feature-flag: publieke API/MCP aan? Deployment-gate, zie ADR. */
export function isPublicApiEnabled(): boolean {
  return process.env.PUBLIC_API_ENABLED === 'true';
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Genereert een nieuwe key. De volledige `key` alleen eenmalig tonen — nooit persisteren. */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const key = `bd_live_${randomBytes(24).toString('hex')}`;
  return { key, keyHash: hashApiKey(key), keyPrefix: key.slice(0, 16) };
}

export interface ApiKeyContext {
  workspaceId: string;
  apiKeyId: string;
}

/**
 * Resolvet `Authorization: Bearer bd_live_…` naar een workspace-context.
 * Null bij ontbrekende/ongeldige/ingetrokken key — caller antwoordt 401.
 */
export async function requireApiKey(request: Request): Promise<ApiKeyContext | null> {
  const match = KEY_PATTERN.exec(request.headers.get('authorization') ?? '');
  if (!match) return null;
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(match[1]) },
    select: { id: true, workspaceId: true, revokedAt: true },
  });
  if (!record || record.revokedAt) return null;
  // lastUsedAt is telemetrie — fire-and-forget, mag de request nooit vertragen/falen.
  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return { workspaceId: record.workspaceId, apiKeyId: record.id };
}

export interface OAuthMcpContext {
  workspaceId: string;
  userId: string;
  /** Gevuld wanneer de consent-koppeling op één merk vergrendeld is. */
  lockedWorkspaceId?: string;
}

/**
 * Resolvet een OAuth-Bearer-token (uitgegeven via de Better Auth mcp-plugin,
 * connector-flow claude.ai/ChatGPT) naar een workspace-context.
 *
 * Het token is user-gebonden (niet workspace-gebonden zoals een bd_live-key);
 * het default-merk "volgt je actieve organisatie in Branddock": consent-slot >
 * recentste sessie-org > oudste membership — zie resolveOAuthWorkspace in
 * brand-resolver.ts. Null bij ontbrekend/verlopen token, gebruiker zonder
 * workspace, of een consent-slot waar de user geen toegang meer toe heeft —
 * caller antwoordt 401.
 */
export async function requireOAuthToken(request: Request): Promise<OAuthMcpContext | null> {
  // getMcpSession valideert het Bearer-token tegen OauthAccessToken (incl.
  // expiry) en gooit niet — null betekent: geen geldig OAuth-token.
  const token = await auth.api.getMcpSession({ headers: request.headers });
  if (!token?.userId) return null;

  const resolved = await resolveOAuthWorkspace(token.userId, token.clientId);
  if (!resolved) return null;

  return {
    workspaceId: resolved.workspaceId,
    userId: token.userId,
    ...(resolved.lockedWorkspaceId ? { lockedWorkspaceId: resolved.lockedWorkspaceId } : {}),
  };
}
