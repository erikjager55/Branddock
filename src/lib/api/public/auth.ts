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
