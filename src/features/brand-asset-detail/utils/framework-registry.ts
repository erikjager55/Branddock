import type { FrameworkType } from "../types/framework.types";

export interface FrameworkMeta {
  type: FrameworkType;
  label: string;
  description: string;
}

export const FRAMEWORK_REGISTRY: Record<FrameworkType, FrameworkMeta> = {
  // 11 core brand asset frameworks
  PURPOSE_WHEEL: {
    type: "PURPOSE_WHEEL",
    label: "Purpose Statement",
    description: "IDEO Purpose Wheel — statement, impact type & mechanism",
  },
  GOLDEN_CIRCLE: {
    type: "GOLDEN_CIRCLE",
    label: "Golden Circle",
    description: "Simon Sinek's Why → How → What framework",
  },
  BRAND_ESSENCE: {
    type: "BRAND_ESSENCE",
    label: "Brand Essence",
    description: "Aaker model — essence, benefits, personality & proof points",
  },
  BRAND_PROMISE: {
    type: "BRAND_PROMISE",
    label: "Brand Promise",
    description: "BrandHouse© — promise, values, audience & differentiator",
  },
  MISSION_STATEMENT: {
    type: "MISSION_STATEMENT",
    label: "Mission Statement",
    description: "What we do, for whom, how & impact goal",
  },
  VISION_STATEMENT: {
    type: "VISION_STATEMENT",
    label: "Vision Statement",
    description: "Collins & Porras — future state, aspiration & indicators",
  },
  BRAND_ARCHETYPE: {
    type: "BRAND_ARCHETYPE",
    label: "Brand Archetype",
    description: "Jung / Mark & Pearson — archetype, desire & voice",
  },
  TRANSFORMATIVE_GOALS: {
    type: "TRANSFORMATIVE_GOALS",
    label: "Transformative Goals",
    description: "MTP / Exponential Orgs — purpose & 3 moonshot goals",
  },
  BRAND_PERSONALITY: {
    type: "BRAND_PERSONALITY",
    label: "Brand Personality",
    description: "Aaker 5 Dimensions — traits, tone & practice",
  },
  BRAND_STORY: {
    type: "BRAND_STORY",
    label: "Brand Story",
    description: "StoryBrand — elevator pitch, challenge, solution & outcome",
  },
  BRANDHOUSE_VALUES: {
    type: "BRANDHOUSE_VALUES",
    label: "Core Values",
    description: "BrandHouse© — anchor values, aspiration values & tension",
  },
  // Legacy types (kept for backward compat)
  ESG: {
    type: "ESG",
    label: "ESG Framework",
    description: "Environmental, Social & Governance pillars",
  },
  SWOT: {
    type: "SWOT",
    label: "SWOT Analysis",
    description: "Strengths, Weaknesses, Opportunities & Threats",
  },
  PURPOSE_KOMPAS: {
    type: "PURPOSE_KOMPAS",
    label: "Social Relevancy",
    description: "People, Environment & Society pillars",
  },
};

export function getFrameworkMeta(type: FrameworkType): FrameworkMeta {
  return FRAMEWORK_REGISTRY[type];
}
