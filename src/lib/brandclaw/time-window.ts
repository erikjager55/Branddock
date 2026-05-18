// =============================================================
// Brandclaw — Time-window query primitives (ADR 2026-05-08).
//
// Gedeelde abstractie voor "rows since T" / "rows since version" /
// "rows tussen X en Y" queries. Alle DataSource accessors consumeren
// dezelfde TimeWindow-shape zodat tools consistent geparameteriseerd
// worden door de agent-loop (en niet ad-hoc Prisma where-clauses
// schrijven per source).
//
// Pure functies, geen Prisma-imports — TimeWindow.toWhere() returnt
// een plain object dat door de caller in Prisma.where wordt gespread.
// =============================================================

/**
 * Beschrijving van een time-window dat een DataSource-accessor naar
 * Prisma where-clause kan vertalen. Naam-veld is voor logging /
 * snapshot-payload zodat past observations zelf-documenterend zijn.
 */
export interface TimeWindow {
  /** Korte naam voor logging / snapshot-payload ("last-30-days", "since-version-abc"). */
  readonly label: string;
  /**
   * Vertaal naar Prisma where-fragment voor een datetime-veld.
   * Caller spread dit in de relevante `where` clause:
   *   `where: { workspaceId, ...window.toWhere('createdAt') }`
   */
  toWhere(fieldName: string): Record<string, { gte?: Date; lte?: Date }>;
  /** Numeric helpers voor monitoring. */
  fromDate(): Date | null;
  toDate(): Date | null;
}

/**
 * Default-window: rows sinds N dagen geleden tot nu. Meest-gebruikt voor
 * Strategy Analyst — "wat is er de afgelopen week gebeurd in alignment".
 *
 * @param n positieve integer days (n=0 → since start-of-today)
 */
export function sinceNDaysAgo(n: number): TimeWindow {
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`sinceNDaysAgo: n must be a non-negative finite number, got ${n}`);
  }
  const safeDays = Math.floor(n);
  const from = new Date();
  from.setDate(from.getDate() - safeDays);
  if (safeDays === 0) {
    from.setHours(0, 0, 0, 0);
  }
  return {
    label: `last-${safeDays}-days`,
    toWhere: (field) => ({ [field]: { gte: from } }),
    fromDate: () => from,
    toDate: () => null,
  };
}

/**
 * Rows tussen twee absolute timestamps. Voor reproducibility-queries
 * waarbij agent een eerdere run wil refereren ("toon me de alignment-
 * scans die Analyst-run X als input gebruikte").
 */
export function between(from: Date, to: Date): TimeWindow {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("between: invalid Date arguments");
  }
  if (from > to) {
    throw new Error(`between: from (${from.toISOString()}) is after to (${to.toISOString()})`);
  }
  return {
    label: `between-${from.toISOString()}-and-${to.toISOString()}`,
    toWhere: (field) => ({ [field]: { gte: from, lte: to } }),
    fromDate: () => from,
    toDate: () => to,
  };
}

/**
 * Rows sinds een specifieke version-cutoff (immutable resource-version).
 * Caller geeft de createdAt van de versie zodat we via tijdcutoff
 * werken (versie-IDs zijn niet sortable). Voor "wat is veranderd
 * sinds versie X werd vastgelegd" use-cases.
 */
export function sinceVersion(versionCreatedAt: Date): TimeWindow {
  if (Number.isNaN(versionCreatedAt.getTime())) {
    throw new Error("sinceVersion: invalid Date");
  }
  return {
    label: `since-version-${versionCreatedAt.toISOString()}`,
    toWhere: (field) => ({ [field]: { gte: versionCreatedAt } }),
    fromDate: () => versionCreatedAt,
    toDate: () => null,
  };
}

/**
 * "All rows ooit" — bypass time-window. Voor agent-prompts die
 * expliciet historische context willen. Default-cap op ~5 jaar terug
 * om infinite scans te voorkomen.
 */
export function allTime(): TimeWindow {
  const from = new Date();
  from.setFullYear(from.getFullYear() - 5);
  return {
    label: "all-time",
    toWhere: (field) => ({ [field]: { gte: from } }),
    fromDate: () => from,
    toDate: () => null,
  };
}
