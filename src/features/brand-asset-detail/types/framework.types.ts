export interface ESGPillar {
  impact: "high" | "medium" | "low";
  description: string;
  projectCount?: number;
  programCount?: number;
  policyCount?: number;
}

export interface ESGFrameworkData {
  pillars: {
    environmental: ESGPillar;
    social: ESGPillar;
    governance: ESGPillar;
  };
}

export interface GoldenCircleSection {
  statement: string;
  details: string;
}

export interface GoldenCircleFrameworkData {
  why: GoldenCircleSection;
  how: GoldenCircleSection;
  what: GoldenCircleSection;
}

export interface SWOTFrameworkData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export type FrameworkType = "ESG" | "GOLDEN_CIRCLE" | "SWOT";

export type FrameworkData = ESGFrameworkData | GoldenCircleFrameworkData | SWOTFrameworkData;
