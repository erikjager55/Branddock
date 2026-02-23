// ─── Enums ─────────────────────────────────────────────────

export type PersonaAvatarSource = 'NONE' | 'AI_GENERATED' | 'MANUAL_URL';
export type ResearchMethodStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED';
export type PersonaResearchMethodType = 'AI_EXPLORATION' | 'INTERVIEWS' | 'QUESTIONNAIRE' | 'USER_TESTING';

// ─── Research Summary ─────────────────────────────────────

export interface ResearchMethodSummary {
  method: PersonaResearchMethodType;
  status: ResearchMethodStatus;
  progress: number;
  completedAt: string | null;
  artifactsCount: number;
}

// ─── List Types ───────────────────────────────────────────

export interface PersonaWithMeta {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  avatarSource: PersonaAvatarSource;
  age: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  education: string | null;
  income: string | null;
  familyStatus: string | null;
  personalityType: string | null;
  coreValues: string[];
  interests: string[];
  goals: string[];
  motivations: string[];
  frustrations: string[];
  behaviors: string[];
  strategicImplications: string | null;
  preferredChannels: string[];
  techStack: string[];
  quote: string | null;
  bio: string | null;
  buyingTriggers: string[];
  decisionCriteria: string[];
  isLocked: boolean;
  lockedById: string | null;
  lockedAt: string | null;
  lockedBy: { id: string; name: string } | null;
  validationPercentage: number;
  researchMethods: ResearchMethodSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonaStats {
  ready: number;
  needsWork: number;
  total: number;
}

// ─── Body Types ───────────────────────────────────────────

export interface CreatePersonaBody {
  name: string;
  tagline?: string;
  age?: string;
  gender?: string;
  location?: string;
  occupation?: string;
  education?: string;
  income?: string;
  familyStatus?: string;
  personalityType?: string;
  coreValues?: string[];
  interests?: string[];
  goals?: string[];
  motivations?: string[];
  frustrations?: string[];
  behaviors?: string[];
  preferredChannels?: string[];
  techStack?: string[];
  quote?: string | null;
  bio?: string | null;
  buyingTriggers?: string[];
  decisionCriteria?: string[];
}

export interface UpdatePersonaBody {
  name?: string;
  tagline?: string;
  age?: string;
  gender?: string;
  location?: string;
  occupation?: string;
  education?: string;
  income?: string;
  familyStatus?: string;
  personalityType?: string;
  coreValues?: string[];
  interests?: string[];
  goals?: string[];
  motivations?: string[];
  frustrations?: string[];
  behaviors?: string[];
  strategicImplications?: string;
  preferredChannels?: string[];
  techStack?: string[];
  quote?: string | null;
  bio?: string | null;
  buyingTriggers?: string[];
  decisionCriteria?: string[];
}
