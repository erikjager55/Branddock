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

/**
 * Compute weighted validation % from research method statuses.
 *
 * Currently deactivated — returns 0. INTERVIEWS, WORKSHOP, QUESTIONNAIRE
 * and USER_TESTING are temporarily disabled. Re-enable the body below
 * when those methods are reactivated.
 */
export function computeValidationPercentage(
  _methods: ReadonlyArray<{ method: string; status: string; progress?: number }>,
  _weights: Record<string, number> = RESEARCH_METHOD_WEIGHTS,
): number {
  // Deactivated: validation % is meaningless with only AI_EXPLORATION (15% weight).
  // Re-enable when INTERVIEWS/WORKSHOP/QUESTIONNAIRE return.
  return 0;

  // Original implementation (preserved for re-activation):
  // let total = 0;
  // for (const m of _methods) {
  //   const weight = _weights[m.method] ?? 0;
  //   if (m.status === "COMPLETED" || m.status === "VALIDATED") {
  //     total += weight * 100;
  //   } else if (m.status === "IN_PROGRESS") {
  //     total += weight * (m.progress ?? 0);
  //   }
  // }
  // return Math.round(total);
}

export function getCompletedMethodsCount(
  methods: ReadonlyArray<{ status: string }>
): number {
  return methods.filter(
    (m) => m.status === "COMPLETED" || m.status === "VALIDATED"
  ).length;
}
