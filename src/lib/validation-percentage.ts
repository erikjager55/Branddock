/**
 * Compute weighted validation % from research method statuses.
 *
 * Brand asset weights: AI_EXPLORATION 15%, WORKSHOP 30%, INTERVIEWS 25%, QUESTIONNAIRE 30%.
 * Persona weights: AI_EXPLORATION 15%, INTERVIEWS 30%, QUESTIONNAIRE 30%, USER_TESTING 25%.
 *
 * COMPLETED/VALIDATED methods contribute their full weight × 100.
 * IN_PROGRESS methods contribute weight × progress (0-100).
 */

import { RESEARCH_METHOD_WEIGHTS } from '@/lib/constants/canonical-brand-assets';

/** Persona-specific validation weights (USER_TESTING instead of WORKSHOP) */
export const PERSONA_VALIDATION_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  INTERVIEWS: 0.30,
  QUESTIONNAIRE: 0.30,
  USER_TESTING: 0.25,
};

export function computeValidationPercentage(
  methods: ReadonlyArray<{ method: string; status: string; progress?: number }>,
  weights: Record<string, number> = RESEARCH_METHOD_WEIGHTS,
): number {
  let total = 0;
  for (const m of methods) {
    const weight = weights[m.method] ?? 0;
    if (m.status === "COMPLETED" || m.status === "VALIDATED") {
      total += weight * 100;
    } else if (m.status === "IN_PROGRESS") {
      total += weight * (m.progress ?? 0);
    }
  }
  return Math.round(total);
}

export function getCompletedMethodsCount(
  methods: ReadonlyArray<{ status: string }>
): number {
  return methods.filter(
    (m) => m.status === "COMPLETED" || m.status === "VALIDATED"
  ).length;
}
