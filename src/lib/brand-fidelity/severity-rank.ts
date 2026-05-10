// Shared `SEVERITY_RANK` voor het sorteren van BrandReviewFinding rijen
// op priority. Prisma's enum-orderBy is alfabetisch (HIGH < LOW < MEDIUM),
// niet priority-based, dus elke caller die "high-priority-eerst" wil moet
// na de fetch client-side sorteren via deze rank-map.
//
// Single source-of-truth voor alle drie Δ-1 surfaces (Tab 3 GET, Brand
// Assistant analyze-tool, PublishGate internal-findings GET) zodat een
// toekomstige severity-toevoeging (bijv. CRITICAL) één plek heeft om bij
// te werken — geen drift over surfaces.
export const SEVERITY_RANK: Record<string, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/**
 * Helper om een rank op te zoeken met een veilige fallback (99) voor
 * onbekende severity-waarden — voorkomt dat een nieuwe enum-value silent
 * naar 0 sortert in callers die `?? 99` vergeten.
 */
export function severityRank(severity: string): number {
  return SEVERITY_RANK[severity] ?? 99;
}
