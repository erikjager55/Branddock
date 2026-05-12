// =============================================================
// Per-type fidelity thresholds (content-test #6.B).
// Workspaces kunnen per content-type een eigen drempel zetten via
// WorkspaceContentTypeThreshold. Geen record → fallback op
// DEFAULT_FIDELITY_THRESHOLD (65, conservatief per beslissing 2026-05-12).
//
// Two-tier cache:
//   - In-process Map cache met TTL (60s) zodat hot-path generation niet
//     bij elke variant een DB-lookup doet.
//   - Workspace-scoped invalidation hook bij Settings → Validation save.
// =============================================================

import { prisma } from '@/lib/prisma';

export const DEFAULT_FIDELITY_THRESHOLD = 65;
const CACHE_TTL_MS = 60_000;

interface WorkspaceCache {
  thresholds: Record<string, number>;
  expiresAt: number;
}

const cache = new Map<string, WorkspaceCache>();

/**
 * Lookup threshold voor één type. Hot-path optimised via workspace-cache.
 * Geen record → DEFAULT_FIDELITY_THRESHOLD.
 */
export async function getThresholdForType(
  workspaceId: string,
  contentTypeId: string,
): Promise<number> {
  const map = await getWorkspaceThresholdMap(workspaceId);
  return map[contentTypeId] ?? DEFAULT_FIDELITY_THRESHOLD;
}

/**
 * Load alle thresholds voor een workspace. Cache-hit binnen TTL,
 * anders DB-query + cache-update.
 */
export async function getWorkspaceThresholdMap(
  workspaceId: string,
): Promise<Record<string, number>> {
  const cached = cache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached.thresholds;

  const rows = await prisma.workspaceContentTypeThreshold.findMany({
    where: { workspaceId },
    select: { contentTypeId: true, threshold: true },
  });
  const thresholds: Record<string, number> = {};
  for (const row of rows) thresholds[row.contentTypeId] = row.threshold;

  cache.set(workspaceId, { thresholds, expiresAt: Date.now() + CACHE_TTL_MS });
  return thresholds;
}

/**
 * Upsert single threshold + invalidate cache.
 * Wordt aangeroepen door Settings → Validation API.
 */
export async function setThresholdForType(
  workspaceId: string,
  contentTypeId: string,
  threshold: number,
): Promise<void> {
  if (threshold < 0 || threshold > 100) {
    throw new Error(`Threshold moet 0-100 zijn, kreeg ${threshold}`);
  }
  await prisma.workspaceContentTypeThreshold.upsert({
    where: { workspaceId_contentTypeId: { workspaceId, contentTypeId } },
    create: { workspaceId, contentTypeId, threshold },
    update: { threshold },
  });
  invalidateWorkspaceCache(workspaceId);
}

/**
 * Reset to default (delete row).
 */
export async function resetThresholdForType(
  workspaceId: string,
  contentTypeId: string,
): Promise<void> {
  await prisma.workspaceContentTypeThreshold.deleteMany({
    where: { workspaceId, contentTypeId },
  });
  invalidateWorkspaceCache(workspaceId);
}

export function invalidateWorkspaceCache(workspaceId: string): void {
  cache.delete(workspaceId);
}
