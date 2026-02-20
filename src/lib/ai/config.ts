// =============================================================
// AI Configuration (R0.8)
//
// Centralized config: API keys, model selection, per-use-case
// temperature/maxTokens/timeout defaults.
// All server-side only (no NEXT_PUBLIC_ prefix).
// =============================================================

// ─── Use cases ─────────────────────────────────────────────

export type AiUseCase = 'ANALYSIS' | 'CREATIVE' | 'CHAT' | 'STRUCTURED';

// ─── Per-use-case defaults ─────────────────────────────────

const TEMPERATURE: Record<AiUseCase, number> = {
  ANALYSIS: 0.3,   // factual, consistent
  CREATIVE: 0.8,   // content generation
  CHAT: 0.6,       // conversation
  STRUCTURED: 0.1, // JSON output
};

const MAX_TOKENS: Record<AiUseCase, number> = {
  ANALYSIS: 4096,
  CREATIVE: 2048,
  CHAT: 1024,
  STRUCTURED: 2048,
};

const TIMEOUT_MS: Record<AiUseCase, number> = {
  ANALYSIS: 120_000,
  CREATIVE: 60_000,
  CHAT: 30_000,
  STRUCTURED: 30_000,
};

// ─── Config object ─────────────────────────────────────────

export const aiConfig = {
  /** Primary model — configurable via BRANDDOCK_AI_MODEL env var */
  get model(): string {
    return process.env.BRANDDOCK_AI_MODEL || 'gpt-4o';
  },

  /** Fallback model for cheaper/faster calls */
  fallbackModel: 'gpt-4o-mini' as const,

  /** OpenAI API key — required for AI features */
  get openaiApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  },

  /** Anthropic API key — optional, for future provider switch */
  get anthropicApiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  },

  /** Whether OpenAI is configured and ready */
  get isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  },

  /** Get temperature for a use case */
  temperature(useCase: AiUseCase): number {
    return TEMPERATURE[useCase];
  },

  /** Get max tokens for a use case */
  maxTokens(useCase: AiUseCase): number {
    return MAX_TOKENS[useCase];
  },

  /** Get timeout (ms) for a use case */
  timeout(useCase: AiUseCase): number {
    return TIMEOUT_MS[useCase];
  },

  /** Retry configuration */
  retry: {
    maxRetries: 3,
    initialDelayMs: 1_000,
    maxDelayMs: 10_000,
  },
} as const;
