/**
 * Compute weighted validation % from research method statuses.
 *
 * Weights: AI_EXPLORATION 15%, WORKSHOP 30%, INTERVIEWS 25%, QUESTIONNAIRE 30%.
 * COMPLETED/VALIDATED methods contribute their full weight × 100.
 * IN_PROGRESS methods contribute weight × progress (0-100).
 */

const RESEARCH_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  WORKSHOP: 0.30,
  INTERVIEWS: 0.25,
  QUESTIONNAIRE: 0.30,
};

export function computeValidationPercentage(
  methods: ReadonlyArray<{ method: string; status: string; progress: number }>
): number {
  let total = 0;
  for (const m of methods) {
    const weight = RESEARCH_WEIGHTS[m.method] ?? 0;
    if (m.status === "COMPLETED" || m.status === "VALIDATED") {
      total += weight * 100;
    } else if (m.status === "IN_PROGRESS") {
      total += weight * m.progress;
    }
  }
  return Math.round(total * 100) / 100;
}

export function getCompletedMethodsCount(
  methods: ReadonlyArray<{ status: string }>
): number {
  return methods.filter(
    (m) => m.status === "COMPLETED" || m.status === "VALIDATED"
  ).length;
}
