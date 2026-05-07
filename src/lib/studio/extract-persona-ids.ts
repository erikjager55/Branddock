// =============================================================
// Extract persona IDs from a Deliverable's settings JSON.
//
// Settings is a free-form Json field; defensive parse for the canonical
// `targetPersonas: string[]` key (also used by tone-check/route.ts).
// Returns empty array on missing/malformed input — generation still
// works, brand context just won't include persona-specific framing.
// =============================================================

/**
 * Extract target persona IDs from a Deliverable's settings JSON field.
 * Reads the `targetPersonas` key (canonical, used elsewhere in studio).
 * Returns [] for missing or malformed input.
 */
export function extractPersonaIdsFromSettings(settings: unknown): string[] {
  if (!settings || typeof settings !== 'object') return [];
  const record = settings as Record<string, unknown>;
  const raw = record.targetPersonas;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}
