// ─── AI Exploration Module — Universal Types ───────────────
// Generic types for the AI Exploration validation method.
// Each item-type (persona, brand_asset, product, etc.) provides
// its own config via ExplorationConfig.

import type { LucideIcon } from 'lucide-react';

// ─── Status ────────────────────────────────────────────────

export type ExplorationStatus = 'idle' | 'in_progress' | 'completing' | 'completed';

// ─── Message Types ─────────────────────────────────────────

export type ExplorationMessageType = 'SYSTEM_INTRO' | 'AI_QUESTION' | 'USER_ANSWER' | 'AI_FEEDBACK';

export interface ExplorationMessage {
  id: string;
  type: ExplorationMessageType;
  content: string;
  orderIndex: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Session ───────────────────────────────────────────────

export interface ExplorationSession {
  id: string;
  status: string;
  progress: number;
  totalDimensions: number;
  answeredDimensions: number;
  insightsData: ExplorationInsightsData | null;
  messages: ExplorationMessage[];
  createdAt: string;
}

// ─── Dimensions ────────────────────────────────────────────

export interface DimensionConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;        // Tailwind color prefix: 'blue' | 'pink' | 'amber' | 'purple' | 'emerald' | ...
  bgClass: string;      // e.g. 'bg-blue-100'
  textClass: string;    // e.g. 'text-blue-600'
  defaultQuestions: string[];
}

export interface DimensionInsight {
  key: string;
  title: string;
  icon: string;         // Icon name (for serialization)
  summary: string;
}

// ─── Field Suggestions ─────────────────────────────────────

export type FieldSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'edited';

export interface FieldSuggestion {
  id: string;
  field: string;
  label: string;
  currentValue: string | string[] | null;
  suggestedValue: string | string[];
  reason: string;
  status: FieldSuggestionStatus;
}

// ─── Field Mapping ─────────────────────────────────────────

export interface FieldMapping {
  field: string;        // Database field name
  label: string;        // UI display label
  type: 'string' | 'string[]' | 'text';
}

// ─── Report / Insights Data ────────────────────────────────

export interface ReportFinding {
  title: string;
  description: string;
}

export interface ExplorationInsightsData {
  dimensions: DimensionInsight[];
  findings: ReportFinding[];
  recommendations: string[];
  executiveSummary: string;
  fieldSuggestions: FieldSuggestion[];
  researchBoostPercentage?: number;
  completedAt?: string;
}

// ─── Config (provided by each item-type) ───────────────────

export interface ExplorationConfig {
  // Identification
  itemType: string;           // 'persona' | 'brand_asset' | 'product' | ...
  itemSubType?: string;       // 'golden_circle' | 'brand_promise' | ...
  itemId: string;
  itemName: string;

  // UI customization
  pageTitle?: string;         // "AI Persona Analysis" / "Explore Golden Circle"
  pageDescription?: string;   // Subtitle text
  backLabel?: string;         // "Back to Persona" / "Back to Brand Asset"
  onBack: () => void;

  // Dimensions for the exploration
  dimensions: DimensionConfig[];

  // Field suggestions mapping
  fieldMapping: FieldMapping[];
  onApplyChanges: (updates: Record<string, unknown>) => Promise<unknown>;

  // Feature flags
  enableReport?: boolean;     // Default: true
}

// ─── API Response Types ────────────────────────────────────

export interface StartExplorationResponse {
  sessionId: string;
  status: string;
  progress: number;
  totalDimensions: number;
  answeredDimensions: number;
  messages: ExplorationMessage[];
}

export interface SendAnswerResponse {
  feedback: string;
  nextQuestion: {
    content: string;
    dimensionKey: string;
    dimensionTitle: string;
  } | null;
  progress: number;
  answeredDimensions: number;
  isComplete: boolean;
}

export interface CompleteExplorationResponse {
  status: string;
  insightsData: ExplorationInsightsData;
  researchBoost: number;
  validationPercentage: number;
}
