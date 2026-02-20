// ─── Config ────────────────────────────────────────────────
export { aiConfig, type AiUseCase } from './config';

// ─── OpenAI Client ─────────────────────────────────────────
export { openaiClient } from './openai-client';
export type { CompletionOptions, StreamingOptions, ChatCompletionMessageParam } from './openai-client';

// ─── Streaming ─────────────────────────────────────────────
export { createStreamingResponse, parseSSEStream, streamToString } from './streaming';

// ─── Rate Limiter ──────────────────────────────────────────
export { checkRateLimit, getRateLimitStatus, resetRateLimit } from './rate-limiter';
export type { RateLimitTier, RateLimitConfig, RateLimitResult } from './rate-limiter';

// ─── Brand Context ─────────────────────────────────────────
export { getBrandContext, invalidateBrandContext } from './brand-context';

// ─── Prompt Templates ──────────────────────────────────────
export {
  SYSTEM_BASE,
  ANALYSIS_INSTRUCTIONS,
  STRUCTURED_INSTRUCTIONS,
  formatBrandContext,
  buildSystemMessage,
  buildAnalysisMessages,
  buildStructuredMessages,
  buildChatMessages,
} from './prompt-templates';
export type { BrandContextBlock } from './prompt-templates';

// ─── Middleware ─────────────────────────────────────────────
export { withAi, withAiRateLimit, withBrandContext } from './middleware';
export type { AiRequestContext } from './middleware';

// ─── Persona Chat ─────────────────────────────────────────
export { streamPersonaChat } from './persona-chat';
export type { PersonaChatParams, StreamDonePayload } from './persona-chat';
// Legacy exports (kept for backward compat, prefer context/ modules)
export { buildPersonaSystemPrompt, DEFAULT_PERSONA_CHAT_PROMPT } from './persona-prompt-builder';
export type { PersonaPromptData, KnowledgeContextItem } from './persona-prompt-builder';
export { generateInsightFromMessage } from './persona-insight-generator';
export type { InsightExtractionParams, ExtractedInsight, InsightType, InsightSeverity } from './persona-insight-generator';

// ─── Dynamic Context System ──────────────────────────────
export { CONTEXT_REGISTRY } from './context/registry';
export type { ContextSourceConfig } from './context/registry';
export { serializeToText, formatFieldLabel, extractSummary } from './context/serializer';
export { serializePersona } from './context/persona-serializer';
export { getAvailableContextItems, serializeContextForPrompt } from './context/fetcher';
export type { ContextGroup, ContextGroupItem } from './context/fetcher';
export { buildSystemPrompt, DEFAULT_SYSTEM_PROMPT_TEMPLATE } from './context/prompt-builder';

// ─── Error Handler ────────────────────────────────────────
export { parseAIError, getReadableErrorMessage, shouldAutoRetry, withAIRetry, getAIErrorStatus } from './error-handler';
export type { AIError, AIErrorType } from './error-handler';

// ─── Client Hooks ──────────────────────────────────────────
export { useAiStream } from './hooks/useAiStream';
export type { UseAiStreamReturn } from './hooks/useAiStream';
export { useAiMutation } from './hooks/useAiMutation';
export type { UseAiMutationReturn } from './hooks/useAiMutation';
