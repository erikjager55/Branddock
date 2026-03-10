// ─── ExplorationConfig JSON field types ─────────────────────

export interface StoredDimension {
  key: string;
  title: string;
  icon: string;              // Lucide icon name: "Heart", "Leaf", "Globe", etc.
  question: string;          // The main question
  followUpHint?: string;     // Optional hint for AI to ask follow-up questions
}

export interface StoredFieldSuggestionConfig {
  field: string;             // "content.why" | "frameworkData.pillars.mens.description"
  label: string;             // UI label
  type: 'text' | 'select' | 'array';  // Input type ('array' = string[])
  options?: string[];        // For select: ["high", "medium", "low"]
  extractionHint: string;    // Instruction for AI: "Extract the user's stated purpose..."
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
  customKnowledge: string;
  assetKnowledge: string;
}

// ─── Available AI Models ────────────────────────────────────

export interface AIModelOption {
  id: string;
  provider: string;
  label: string;
  description: string;
}

export const EXPLORATION_AI_MODELS: AIModelOption[] = [
  { id: 'claude-sonnet-4-20250514', provider: 'anthropic', label: 'Claude Sonnet 4', description: 'Best balance of quality and speed' },
  { id: 'claude-sonnet-4-5-20250929', provider: 'anthropic', label: 'Claude Sonnet 4.5', description: 'Latest Sonnet — more advanced' },
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', label: 'Claude Haiku 4.5', description: 'Fastest — for simple tasks' },
  { id: 'gpt-4o', provider: 'openai', label: 'GPT-4o', description: 'OpenAI flagship model' },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini', description: 'Faster and more affordable' },
  { id: 'gemini-3.1-pro-preview', provider: 'google', label: 'Gemini 3.1 Pro', description: 'Google — Advanced reasoning' },
  { id: 'gemini-3.1-flash', provider: 'google', label: 'Gemini 3.1 Flash', description: 'Google — Fast and cost-efficient' },
];
