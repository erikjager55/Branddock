import type { FrameworkType } from "./framework.types";

export interface ResearchMethodDetail {
  id: string;
  method: "AI_EXPLORATION" | "WORKSHOP" | "INTERVIEWS" | "QUESTIONNAIRE";
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "VALIDATED" | "NOT_STARTED";
  progress: number;
  completedAt: string | null;
  artifactsCount: number;
  weight: number;
  brandAssetId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VersionDetail {
  id: string;
  version: number;
  content: string | null;
  frameworkData: unknown;
  changeNote: string | null;
  changedBy: { id: string; name: string | null; email: string };
  brandAssetId: string;
  createdAt: string;
}

export interface LockedByUser {
  id: string;
  name: string | null;
  email: string;
}

export interface AISessionSummary {
  id: string;
  status: string;
  progress: number;
  completedAt: string | null;
}

export interface BrandAssetDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  coveragePercentage: number;
  validatedCount: number;
  artifactCount: number;
  content: unknown;
  frameworkType: FrameworkType | null;
  frameworkData: unknown;
  isLocked: boolean;
  lockedById: string | null;
  lockedBy: LockedByUser | null;
  lockedAt: string | null;
  aiValidated: boolean;
  workshopValidated: boolean;
  interviewValidated: boolean;
  questionnaireValidated: boolean;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  researchMethods: ResearchMethodDetail[];
  versions: VersionDetail[];
  aiAnalysisSessions: AISessionSummary[];
  validationPercentage: number;
  completedMethods: number;
  totalMethods: number;
}

export interface VersionsResponse {
  versions: VersionDetail[];
  total: number;
  limit: number;
  offset: number;
}

export interface ContentUpdatePayload {
  content: string;
  changeNote?: string;
}

export interface StatusUpdatePayload {
  status: "DRAFT" | "IN_PROGRESS" | "NEEDS_ATTENTION" | "READY";
}

export interface FrameworkUpdatePayload {
  frameworkType?: FrameworkType;
  frameworkData: Record<string, unknown>;
}
