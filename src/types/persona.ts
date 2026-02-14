// === Core Types ===
export type PersonaAvatarSource = "NONE" | "AI_GENERATED" | "MANUAL_URL";
export type PersonaResearchMethodType = "AI_EXPLORATION" | "INTERVIEWS" | "QUESTIONNAIRE" | "USER_TESTING";
export type AIPersonaAnalysisStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ERROR";
export type PersonaChatMode = "FREE_CHAT" | "GUIDED";
export type ChatRole = "USER" | "ASSISTANT";

export interface Persona {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  avatarSource: PersonaAvatarSource;
  // Demographics
  age: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  education: string | null;
  income: string | null;
  familyStatus: string | null;
  // Psychographics
  personalityType: string | null;
  coreValues: string[];
  interests: string[];
  goals: string[];
  motivations: string[];
  frustrations: string[];
  behaviors: string[];
  // Strategic
  strategicImplications: string | null;
  isLocked: boolean;
  lockedBy: { name: string } | null;
  lockedAt: string | null;
  // Computed
  validationPercentage: number;
  researchMethods: PersonaResearchMethodItem[];
  createdBy: { name: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface PersonaListItem {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  age: string | null;
  location: string | null;
  occupation: string | null;
  income: string | null;
  familyStatus: string | null;
  education: string | null;
  validationPercentage: number;
  researchMethodsCompleted: number;
  researchMethodsTotal: number;
}

export interface PersonaResearchMethodItem {
  id: string;
  method: PersonaResearchMethodType;
  status: string; // ResearchMethodStatus from Fase 1C
  progress: number;
  completedAt: string | null;
  artifactsCount: number;
}

export interface PersonaStats {
  ready: number;      // validation >= 80%
  needsWork: number;  // validation < 80%
  total: number;
}

// === Chat Types ===
export interface PersonaChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface PersonaChatInsight {
  id: string;
  title: string;
  description: string;
  category: string | null;
}

// === AI Analysis Types ===
export interface AIPersonaAnalysisSession {
  id: string;
  status: AIPersonaAnalysisStatus;
  progress: number;
  totalDimensions: number;
  answeredDimensions: number;
  insightsData: PersonaInsightsData | null;
  completedAt: string | null;
  messages: AIPersonaAnalysisMessage[];
}

export interface AIPersonaAnalysisMessage {
  id: string;
  type: string; // AIMessageType
  content: string;
  orderIndex: number;
  metadata: Record<string, unknown> | null;
}

export interface PersonaInsightsData {
  dimensions: PersonaDimension[];
  researchBoostPercentage: number;
  completedAt: string;
}

export interface PersonaDimension {
  key: "demographics" | "goals_motivations" | "challenges_frustrations" | "value_proposition";
  title: string;
  icon: string;
  summary: string;
}

// === API Bodies ===
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
}

export interface SendChatMessageBody {
  content: string;
  context?: string;
}

export interface AnalysisAnswerBody {
  content: string;
}

export interface GenerateImageBody {
  demographics: { age?: string; gender?: string; occupation?: string };
}

// === Configs ===
export const DEMOGRAPHIC_FIELDS = [
  { key: "age", icon: "Calendar", label: "AGE" },
  { key: "location", icon: "MapPin", label: "LOCATION" },
  { key: "occupation", icon: "Building2", label: "OCCUPATION" },
  { key: "income", icon: "DollarSign", label: "INCOME" },
  { key: "familyStatus", icon: "Users", label: "FAMILY STATUS" },
  { key: "education", icon: "GraduationCap", label: "EDUCATION" },
] as const;

export const IMPACT_BADGE_CONFIG = {
  high:   { label: "high impact",   bg: "bg-emerald-50", color: "text-emerald-700" },
  medium: { label: "medium impact", bg: "bg-amber-50",   color: "text-amber-700" },
  low:    { label: "low impact",    bg: "bg-gray-100",   color: "text-gray-600" },
} as const;

export const RESEARCH_CONFIDENCE_COLORS = {
  critical: { range: [0, 0],    color: "text-red-500",    label: "At risk" },
  low:      { range: [1, 49],   color: "text-amber-500",  label: "Low" },
  medium:   { range: [50, 79],  color: "text-yellow-500", label: "Medium" },
  ready:    { range: [80, 100], color: "text-emerald-500", label: "Ready" },
} as const;

export const PERSONA_RESEARCH_METHODS = [
  { method: "AI_EXPLORATION" as const, icon: "Bot", type: "AI", time: "Instant", isFree: true },
  { method: "INTERVIEWS" as const, icon: "MessageCircle", type: "1-on-1", time: "Variable", isFree: false },
  { method: "QUESTIONNAIRE" as const, icon: "ClipboardList", type: "Quantitative", time: "1-2 weeks", isFree: false },
  { method: "USER_TESTING" as const, icon: "Smartphone", type: "Observational", time: "Variable", isFree: false },
] as const;

export const PERSONA_VALIDATION_WEIGHTS: Record<PersonaResearchMethodType, number> = {
  AI_EXPLORATION: 0.15,
  INTERVIEWS:     0.30,
  QUESTIONNAIRE:  0.30,
  USER_TESTING:   0.25,
};

export const ANALYSIS_DIMENSIONS = [
  { key: "demographics", title: "Demografische Kenmerken", icon: "Users", color: "text-emerald-500" },
  { key: "goals_motivations", title: "Doelen & Motivaties", icon: "TrendingUp", color: "text-blue-500" },
  { key: "challenges_frustrations", title: "Uitdagingen & Frustraties", icon: "Heart", color: "text-pink-500" },
  { key: "value_proposition", title: "Waarde Propositie", icon: "Zap", color: "text-amber-500" },
] as const;
