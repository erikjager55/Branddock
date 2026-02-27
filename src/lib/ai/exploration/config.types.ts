// ─── ExplorationConfig JSON field types ─────────────────────

export interface StoredDimension {
  key: string;
  title: string;
  icon: string;              // Lucide icon naam: "Heart", "Leaf", "Globe", etc.
  question: string;          // De hoofdvraag
  followUpHint?: string;     // Optionele hint voor AI om door te vragen
}

export interface StoredFieldSuggestionConfig {
  field: string;             // "content.why" | "frameworkData.pillars.mens.description"
  label: string;             // UI label
  type: 'text' | 'select';  // Input type
  options?: string[];        // Voor select: ["high", "medium", "low"]
  extractionHint: string;    // Instructie voor AI: "Extract the user's stated purpose..."
}

export interface ExplorationConfigData {
  id: string;
  itemType: string;
  itemSubType: string | null;
  label: string | null;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  dimensions: StoredDimension[];
  feedbackPrompt: string;
  reportPrompt: string;
  fieldSuggestionsConfig: StoredFieldSuggestionConfig[] | null;
  contextSources: string[];
  isActive: boolean;
}

// ─── Available AI Models ────────────────────────────────────

export interface AIModelOption {
  id: string;
  provider: string;
  label: string;
  description: string;
}

export const EXPLORATION_AI_MODELS: AIModelOption[] = [
  { id: 'claude-sonnet-4-20250514', provider: 'anthropic', label: 'Claude Sonnet 4', description: 'Beste balans kwaliteit/snelheid' },
  { id: 'claude-sonnet-4-5-20250929', provider: 'anthropic', label: 'Claude Sonnet 4.5', description: 'Nieuwste Sonnet — geavanceerder' },
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', label: 'Claude Haiku 4.5', description: 'Snelste — voor eenvoudige taken' },
  { id: 'gpt-4o', provider: 'openai', label: 'GPT-4o', description: 'OpenAI flagship model' },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini', description: 'Sneller en goedkoper' },
];
