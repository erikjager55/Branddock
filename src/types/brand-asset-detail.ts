export type AssetDetailStatus = "EMPTY" | "DRAFT" | "IN_DEVELOPMENT" | "APPROVED";

export type ResearchMethodType = "AI_EXPLORATION" | "WORKSHOP" | "INTERVIEWS" | "QUESTIONNAIRE";
export type ResearchMethodStatus = "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "VALIDATED";

export type FrameworkType = "ESG" | "GOLDEN_CIRCLE" | "SWOT";

export interface BrandAssetResearchMethod {
  id: string;
  method: ResearchMethodType;
  status: ResearchMethodStatus;
  progress: number;
  completedAt: string | null;
  artifactsCount: number;
}

export interface BrandAssetVersion {
  id: string;
  version: number;
  content: string | null;
  frameworkData: Record<string, unknown> | null;
  changeNote: string | null;
  changedBy: { id: string; name: string };
  createdAt: string;
}

export interface BrandAssetDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  status: string;
  content: string | null;
  coveragePercentage: number;
  frameworkType: FrameworkType | null;
  frameworkData: Record<string, unknown> | null;
  isLocked: boolean;
  lockedBy: { id: string; name: string } | null;
  lockedAt: string | null;
  aiValidated: boolean;
  workshopValidated: boolean;
  interviewValidated: boolean;
  questionnaireValidated: boolean;
  researchMethods: BrandAssetResearchMethod[];
  createdAt: string;
  updatedAt: string;
  _computed: {
    validationPercentage: number;
    completedMethodsCount: number;
    totalMethodsCount: 4;
    lastUpdated: string;
    artifactsGenerated: number;
  };
}

// === Framework Data Types ===
export interface ESGFrameworkData {
  pillars: {
    environmental: { impact: "high" | "medium" | "low"; description: string; projectCount: number };
    social: { impact: "high" | "medium" | "low"; description: string; programCount: number };
    governance: { impact: "high" | "medium" | "low"; description: string; policyCount: number };
  };
}

export interface GoldenCircleFrameworkData {
  why: { statement: string; details: string };
  how: { statement: string; details: string };
  what: { statement: string; details: string };
}

export interface SWOTFrameworkData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// === API Bodies ===
export interface UpdateContentBody {
  content: string;
  changeNote?: string;
}

export interface UpdateStatusBody {
  status: AssetDetailStatus;
}

export interface RegenerateBody {
  scope: "full" | "section";
  sectionKey?: string;
}
