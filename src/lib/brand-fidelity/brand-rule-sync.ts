// ============================================================
// BrandRule auto-sync from BrandPersonality
//
// Synchronizes BrandPersonalityFrameworkData.wordsWeAvoid into
// BrandRule records (FORBIDDEN_WORD type, source=auto:wordsWeAvoid).
//
// Idempotent: deletes existing auto-sync rules and recreates them.
// User-created BrandRule records (source=manual) are never touched.
//
// Aangeroepen vanuit brand-asset framework PATCH endpoint wanneer
// BrandPersonality.wordsWeAvoid wijzigt.
// ============================================================

import { prisma } from '@/lib/prisma';

const AUTO_SOURCE = 'auto:wordsWeAvoid';

/**
 * Replace all auto-synced FORBIDDEN_WORD rules for this workspace
 * with the current wordsWeAvoid list.
 *
 * Manual rules (source !== 'auto:wordsWeAvoid') are preserved.
 * Idempotent: safe to call repeatedly with same input.
 *
 * @returns counts of rules deleted and created
 */
export async function syncWordsAvoidToRules(
  workspaceId: string,
  wordsWeAvoid: string[] | undefined | null,
): Promise<{ deleted: number; created: number }> {
  // Normalize input — strip empty strings, dedupe (case-insensitive)
  const normalized = Array.from(
    new Set(
      (wordsWeAvoid ?? [])
        .map((w) => (typeof w === 'string' ? w.trim() : ''))
        .filter((w) => w.length > 0)
        .map((w) => w.toLowerCase()),
    ),
  );

  // Delete existing auto-synced rules — replace-strategy keeps it simple
  const deleteResult = await prisma.brandRule.deleteMany({
    where: { workspaceId, source: AUTO_SOURCE },
  });

  if (normalized.length === 0) {
    return { deleted: deleteResult.count, created: 0 };
  }

  // Create fresh records for each word
  const created = await prisma.brandRule.createMany({
    data: normalized.map((word) => ({
      workspaceId,
      ruleType: 'FORBIDDEN_WORD' as const,
      pattern: word,
      patternIsRegex: false,
      message: `Vermijd het woord "${word}" — staat in BrandPersonality.wordsWeAvoid lijst.`,
      severity: 'warning',
      contentTypeFilter: [],
      isActive: true,
      source: AUTO_SOURCE,
    })),
  });

  return { deleted: deleteResult.count, created: created.count };
}

/**
 * Get-all rules for a workspace (active only, sorted by createdAt desc).
 * Convenience wrapper for API endpoints.
 */
export async function listBrandRules(workspaceId: string, opts?: { activeOnly?: boolean }) {
  return prisma.brandRule.findMany({
    where: {
      workspaceId,
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}
