// =============================================================
// Data Analyst — gedeelde helpers voor de curated query-tools.
//
// Contract voor élke query-tool (acceptatiecriteria agents-data-analyst):
//   1. Géén vrije filter-strings die naar SQL lekken — inputs zijn
//      geclampte getallen of tegen een vaste allowlist gevalideerde enums.
//   2. Harde workspace-scope op ctx.workspaceId in elke query.
//   3. Read-only — geen enkele Prisma-write.
//   4. Rij-cap ≤ MAX_TABLE_ROWS (200) per tool-call, in code afgedwongen.
// =============================================================

import type { ToolExecuteResult } from "@/lib/brandclaw/orchestrator/types";

/** Clamp een unvalidated numerieke input naar een integer binnen [min, max]. */
export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/** Valideer een string-input tegen een vaste allowlist — geen vrije strings richting queries. */
export function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T | null,
): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Window-start: N dagen terug vanaf nu. */
export function sinceDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Window-start: eerste dag van de maand, (months-1) maanden terug (UTC). */
export function monthWindowStart(months: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

/** ISO-datum (YYYY-MM-DD) voor date-kolommen; null-veilig. */
export function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Fail-soft error-result richting het model — nooit een loop-brekende throw. */
export function errorResult(err: unknown, code: string): ToolExecuteResult {
  return {
    content: { error: err instanceof Error ? err.message : String(err) },
    isError: true,
    errorCode: code,
  };
}
