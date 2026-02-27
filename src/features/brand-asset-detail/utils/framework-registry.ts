import type { FrameworkType } from "../types/framework.types";

export interface FrameworkMeta {
  type: FrameworkType;
  label: string;
  description: string;
}

export const FRAMEWORK_REGISTRY: Record<FrameworkType, FrameworkMeta> = {
  ESG: {
    type: "ESG",
    label: "ESG Framework",
    description: "Environmental, Social & Governance pillars",
  },
  GOLDEN_CIRCLE: {
    type: "GOLDEN_CIRCLE",
    label: "Golden Circle",
    description: "Simon Sinek's Why → How → What framework",
  },
  SWOT: {
    type: "SWOT",
    label: "SWOT Analysis",
    description: "Strengths, Weaknesses, Opportunities & Threats",
  },
  PURPOSE_KOMPAS: {
    type: "PURPOSE_KOMPAS",
    label: "Maatschappelijke Relevantie",
    description: "Mens, Milieu & Maatschappij pijlers",
  },
};

export function getFrameworkMeta(type: FrameworkType): FrameworkMeta {
  return FRAMEWORK_REGISTRY[type];
}
