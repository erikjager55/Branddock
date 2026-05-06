// ============================================================
// BrandRule auto-sync — soft migration BrandPersonality → BrandVoiceguide
//
// Two source streams are supported during the 3-6 month migration window:
//
//  1. Legacy: BrandPersonality.frameworkData.wordsWeAvoid (source: 'auto:wordsWeAvoid')
//     - Written by brand-asset framework PATCH endpoint (existing call site)
//
//  2. New: BrandVoiceguide.wordsWeAvoid + antiPatterns
//     - Written by /api/brandvoiceguide PATCH endpoint (BV-1.4)
//     - source values: 'auto:voiceguide.wordsWeAvoid' / 'auto:voiceguide.antiPatterns'
//
// When BrandVoiceguide exists for a workspace, syncWorkspaceBrandRules() drops
// the legacy 'auto:wordsWeAvoid' rules to prevent duplicates. The voiceguide
// row becomes the single source of truth — same logic as in getBrandContext().
//
// User-created BrandRule records (source=manual) are never touched.
// ============================================================

import { prisma } from '@/lib/prisma';

const SOURCE_LEGACY = 'auto:wordsWeAvoid';
const SOURCE_VOICEGUIDE_WORDS = 'auto:voiceguide.wordsWeAvoid';
const SOURCE_VOICEGUIDE_ANTI = 'auto:voiceguide.antiPatterns';

/** Normalize input — strip empty strings, lowercase, dedupe. */
function normalize(words: string[] | undefined | null): string[] {
  return Array.from(
    new Set(
      (words ?? [])
        .map((w) => (typeof w === 'string' ? w.trim() : ''))
        .filter((w) => w.length > 0)
        .map((w) => w.toLowerCase()),
    ),
  );
}

/**
 * LEGACY entry point — sync wordsWeAvoid from BrandPersonality.frameworkData.
 * Kept for back-compat with brand-asset framework PATCH endpoint.
 *
 * Replaces all rules with source='auto:wordsWeAvoid' for this workspace.
 * Idempotent.
 */
export async function syncWordsAvoidToRules(
  workspaceId: string,
  wordsWeAvoid: string[] | undefined | null,
): Promise<{ deleted: number; created: number }> {
  const normalized = normalize(wordsWeAvoid);

  const deleteResult = await prisma.brandRule.deleteMany({
    where: { workspaceId, source: SOURCE_LEGACY },
  });

  if (normalized.length === 0) {
    return { deleted: deleteResult.count, created: 0 };
  }

  const created = await prisma.brandRule.createMany({
    data: normalized.map((word) => ({
      workspaceId,
      ruleType: 'FORBIDDEN_WORD' as const,
      pattern: word,
      patternIsRegex: false,
      message: `Avoid the word "${word}" — listed in BrandPersonality.wordsWeAvoid.`,
      severity: 'warning',
      contentTypeFilter: [],
      isActive: true,
      source: SOURCE_LEGACY,
    })),
  });

  return { deleted: deleteResult.count, created: created.count };
}

/**
 * Sync BrandVoiceguide.wordsWeAvoid + antiPatterns into BrandRule records.
 * Two separate source streams so each list can be replaced independently.
 *
 * Replaces rules with source='auto:voiceguide.wordsWeAvoid' or
 * source='auto:voiceguide.antiPatterns' for this workspace.
 *
 * Anti-patterns get severity='error' (stronger signal than wordsWeAvoid)
 * since they explicitly enumerate phrasings the brand should never use.
 */
export async function syncVoiceguideToRules(
  workspaceId: string,
  payload: {
    wordsWeAvoid?: string[] | null;
    antiPatterns?: string[] | null;
  },
): Promise<{ wordsDeleted: number; wordsCreated: number; antiDeleted: number; antiCreated: number }> {
  const wordsNormalized = normalize(payload.wordsWeAvoid);
  const antiNormalized = normalize(payload.antiPatterns);

  // Delete both auto-source streams in parallel
  const [wordsDelete, antiDelete] = await Promise.all([
    prisma.brandRule.deleteMany({
      where: { workspaceId, source: SOURCE_VOICEGUIDE_WORDS },
    }),
    prisma.brandRule.deleteMany({
      where: { workspaceId, source: SOURCE_VOICEGUIDE_ANTI },
    }),
  ]);

  // Recreate rules
  const [wordsCreate, antiCreate] = await Promise.all([
    wordsNormalized.length > 0
      ? prisma.brandRule.createMany({
          data: wordsNormalized.map((word) => ({
            workspaceId,
            ruleType: 'FORBIDDEN_WORD' as const,
            pattern: word,
            patternIsRegex: false,
            message: `Avoid "${word}" — listed in Brand Voiceguide.wordsWeAvoid.`,
            severity: 'warning',
            contentTypeFilter: [],
            isActive: true,
            source: SOURCE_VOICEGUIDE_WORDS,
          })),
        })
      : Promise.resolve({ count: 0 }),
    antiNormalized.length > 0
      ? prisma.brandRule.createMany({
          data: antiNormalized.map((phrase) => ({
            workspaceId,
            ruleType: 'FORBIDDEN_WORD' as const,
            pattern: phrase,
            patternIsRegex: false,
            message: `Anti-pattern — never use "${phrase}" (Brand Voiceguide).`,
            severity: 'error',
            contentTypeFilter: [],
            isActive: true,
            source: SOURCE_VOICEGUIDE_ANTI,
          })),
        })
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    wordsDeleted: wordsDelete.count,
    wordsCreated: wordsCreate.count,
    antiDeleted: antiDelete.count,
    antiCreated: antiCreate.count,
  };
}

/**
 * Unified entry point that resolves the correct source for a workspace.
 *
 * - If BrandVoiceguide exists: sync from voiceguide and clear legacy rules.
 *   Voiceguide is single source of truth (matches getBrandContext() priority).
 * - Otherwise: leave legacy rules in place (set by personality framework PATCH).
 *
 * Use this when you want to refresh rules without knowing which source is active —
 * e.g. from a workspace-level admin action or after the migration script runs.
 */
export async function syncWorkspaceBrandRules(workspaceId: string): Promise<{
  source: 'voiceguide' | 'legacy' | 'none';
  changes: Record<string, number>;
}> {
  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId },
    select: { wordsWeAvoid: true, antiPatterns: true },
  });

  if (voiceguide) {
    // Drop legacy rules — voiceguide is the source of truth now
    const legacyDelete = await prisma.brandRule.deleteMany({
      where: { workspaceId, source: SOURCE_LEGACY },
    });

    const result = await syncVoiceguideToRules(workspaceId, {
      wordsWeAvoid: voiceguide.wordsWeAvoid,
      antiPatterns: voiceguide.antiPatterns,
    });

    return {
      source: 'voiceguide',
      changes: { legacyDeleted: legacyDelete.count, ...result },
    };
  }

  return { source: 'none', changes: {} };
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
