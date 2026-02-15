/**
 * Persona Adapter
 *
 * Maps API Persona (DB format) → mock Persona format
 * zodat bestaande UI componenten blijven werken.
 */

import type { Persona as ApiPersona } from "@/types/persona";

// Mock persona type (wat de UI verwacht)
export interface MockPersona {
  id: string;
  name: string;
  tagline: string;
  avatar: string | null;
  demographics: {
    age: string;
    location: string;
    occupation: string;
    education: string;
    income: string;
    familyStatus: string;
  };
  goals: string[];
  frustrations: string[];
  motivations: string[];
  behaviors: string[];
  personality: string;
  values: string[];
  interests: string[];
  researchMethods: {
    type: string;
    status: string;
    completedAt?: string;
    progress?: number;
    participantCount?: number;
    insights?: string[];
  }[];
  researchCoverage: number;
  validationScore: number;
  status: string;
  createdAt: string;
  lastUpdated: string;
  tags: string[];
}

const METHOD_TYPE_MAP: Record<string, string> = {
  AI_EXPLORATION: "ai-exploration",
  INTERVIEWS: "interviews",
  QUESTIONNAIRE: "surveys",
  USER_TESTING: "user-testing",
};

const METHOD_STATUS_MAP: Record<string, string> = {
  AVAILABLE: "not-started",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  VALIDATED: "completed",
};

function deriveStatus(validationPct: number): string {
  if (validationPct >= 80) return "validated";
  if (validationPct >= 30) return "in-research";
  return "draft";
}

export function apiPersonaToMockFormat(p: ApiPersona): MockPersona {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline ?? "",
    avatar: p.avatarUrl,
    demographics: {
      age: p.age ?? "",
      location: p.location ?? "",
      occupation: p.occupation ?? "",
      education: p.education ?? "",
      income: p.income ?? "",
      familyStatus: p.familyStatus ?? "",
    },
    goals: p.goals,
    frustrations: p.frustrations,
    motivations: p.motivations,
    behaviors: p.behaviors,
    personality: p.personalityType ?? "",
    values: p.coreValues,
    interests: p.interests,
    researchMethods: p.researchMethods.map((m) => ({
      type: METHOD_TYPE_MAP[m.method] ?? m.method.toLowerCase(),
      status: METHOD_STATUS_MAP[m.status] ?? "not-started",
      ...(m.completedAt ? { completedAt: m.completedAt } : {}),
      ...(m.progress > 0 ? { progress: m.progress } : {}),
    })),
    researchCoverage: p.validationPercentage,
    validationScore: p.validationPercentage,
    status: deriveStatus(p.validationPercentage),
    createdAt: p.createdAt,
    lastUpdated: p.updatedAt,
    tags: [],
  };
}

export function apiPersonasToMockFormat(personas: ApiPersona[]): MockPersona[] {
  return personas.map(apiPersonaToMockFormat);
}
