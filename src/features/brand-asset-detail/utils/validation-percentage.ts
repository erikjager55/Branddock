import type { ResearchMethodDetail } from "../types/brand-asset-detail.types";

const RESEARCH_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  WORKSHOP: 0.30,
  INTERVIEWS: 0.25,
  QUESTIONNAIRE: 0.30,
};

export function calculateValidationPercentage(
  methods: ResearchMethodDetail[]
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
  methods: ResearchMethodDetail[]
): number {
  return methods.filter(
    (m) => m.status === "COMPLETED" || m.status === "VALIDATED"
  ).length;
}
