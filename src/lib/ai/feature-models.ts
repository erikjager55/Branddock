// =============================================================
// Per-Feature AI Model Configuration
//
// Central registry of all configurable AI features with their
// default provider/model and supported providers.
//
// NOTE: resolveFeatureModel() lives in feature-models.server.ts
// to keep this file free of Node.js / Prisma imports (safe for client bundles).
// =============================================================

import type { AIModelOption } from './exploration/config.types';

// ─── Available Models ────────────────────────────────────────

export const AVAILABLE_MODELS: AIModelOption[] = [
  // ── Anthropic ──
  { id: 'claude-opus-4-6', provider: 'anthropic', label: 'Claude Opus 4.6', description: 'Most capable — best for complex tasks' },
  { id: 'claude-opus-4-5-20251101', provider: 'anthropic', label: 'Claude Opus 4.5', description: 'Very capable — deep analysis' },
  { id: 'claude-sonnet-4-6', provider: 'anthropic', label: 'Claude Sonnet 4.6', description: 'Latest Sonnet — fast and smart' },
  { id: 'claude-sonnet-4-5-20250929', provider: 'anthropic', label: 'Claude Sonnet 4.5', description: 'Advanced reasoning, balanced speed' },
  { id: 'claude-sonnet-4-20250514', provider: 'anthropic', label: 'Claude Sonnet 4', description: 'Reliable quality and speed' },
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', label: 'Claude Haiku 4.5', description: 'Fastest — for simple tasks' },
  // ── OpenAI ──
  { id: 'gpt-5.4-pro', provider: 'openai', label: 'GPT-5.4 Pro', description: 'Most capable OpenAI model' },
  { id: 'gpt-5.4', provider: 'openai', label: 'GPT-5.4', description: 'Latest flagship model' },
  { id: 'gpt-5.4-mini', provider: 'openai', label: 'GPT-5.4 Mini', description: 'Fast and affordable' },
  { id: 'gpt-5.4-nano', provider: 'openai', label: 'GPT-5.4 Nano', description: 'Fastest, lowest cost' },
  { id: 'gpt-4.1', provider: 'openai', label: 'GPT-4.1', description: 'Solid all-rounder' },
  { id: 'gpt-4.1-mini', provider: 'openai', label: 'GPT-4.1 Mini', description: 'Fast, good quality' },
  { id: 'gpt-4.1-nano', provider: 'openai', label: 'GPT-4.1 Nano', description: 'Lightest OpenAI model' },
  { id: 'gpt-4o', provider: 'openai', label: 'GPT-4o', description: 'Previous gen flagship' },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini', description: 'Previous gen fast model' },
  { id: 'o4-mini', provider: 'openai', label: 'o4 Mini', description: 'Reasoning model — compact' },
  { id: 'o3', provider: 'openai', label: 'o3', description: 'Reasoning model — advanced' },
  { id: 'o3-mini', provider: 'openai', label: 'o3 Mini', description: 'Reasoning model — affordable' },
  // ── Google Gemini ──
  { id: 'gemini-3.1-pro-preview', provider: 'google', label: 'Gemini 3.1 Pro', description: 'Most capable, advanced reasoning' },
  { id: 'gemini-3-pro-preview', provider: 'google', label: 'Gemini 3 Pro', description: 'Strong reasoning' },
  { id: 'gemini-3-flash-preview', provider: 'google', label: 'Gemini 3 Flash', description: 'Fast with good quality' },
  { id: 'gemini-3.1-flash-lite-preview', provider: 'google', label: 'Gemini 3.1 Flash Lite', description: 'Ultra-fast, lowest cost' },
  { id: 'gemini-2.5-pro', provider: 'google', label: 'Gemini 2.5 Pro', description: 'Balanced performance' },
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', description: 'Fast and cost-efficient' },
  { id: 'gemini-2.5-flash-lite', provider: 'google', label: 'Gemini 2.5 Flash Lite', description: 'Lightest, cheapest option' },
];

// ─── Feature Definitions ─────────────────────────────────────

export type AiFeatureKey =
  | 'persona-chat'
  | 'campaign-strategy'
  | 'campaign-strategy-b'
  | 'campaign-strategy-c'
  | 'campaign-curator'
  | 'campaign-briefing-validation'
  | 'campaign-strategy-foundation'
  | 'campaign-creative-synthesis'
  | 'content-generate'
  | 'content-quality'
  | 'content-improve'
  | 'trend-synthesis'
  | 'product-analysis'
  | 'competitor-analysis'
  | 'workshop-report';

export type AiProvider = 'anthropic' | 'openai' | 'google';

export interface AiFeatureDefinition {
  key: AiFeatureKey;
  label: string;
  description: string;
  category: 'chat-analysis' | 'campaign-content' | 'research-monitoring';
  defaultProvider: AiProvider;
  defaultModel: string;
  supportedProviders: AiProvider[];
}

export const AI_FEATURES: AiFeatureDefinition[] = [
  // Chat & Analysis
  {
    key: 'persona-chat',
    label: 'Persona Chat',
    description: 'Conversational AI when chatting with personas',
    category: 'chat-analysis',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'campaign-strategy',
    label: 'Strategy Variant A',
    description: 'Evidence-based strategy variant (deep thinking enabled)',
    category: 'chat-analysis',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-opus-4-6',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'campaign-strategy-b',
    label: 'Strategy Variant B',
    description: 'Creative provocateur strategy variant (deep thinking enabled)',
    category: 'chat-analysis',
    defaultProvider: 'openai',
    defaultModel: 'gpt-5.4',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'campaign-strategy-c',
    label: 'Strategy Variant C',
    description: 'Data-driven innovator strategy variant (deep thinking enabled)',
    category: 'chat-analysis',
    defaultProvider: 'google',
    defaultModel: 'gemini-3.1-pro-preview',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'campaign-curator',
    label: 'Creative Angle Curator',
    description: 'AI curator that selects 3 creative angles from the 20-angle library and assigns each to the best-suited LLM',
    category: 'chat-analysis',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'campaign-briefing-validation',
    label: 'Briefing Validation',
    description: 'AI validation of campaign briefing completeness',
    category: 'chat-analysis',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-haiku-4-5-20251001',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'campaign-strategy-foundation',
    label: 'Strategy Foundation',
    description: 'AI develops behavioral change strategy via chain-of-prompts: behavioral diagnosis → enrichment synthesis → strategic direction',
    category: 'chat-analysis',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'campaign-creative-synthesis',
    label: 'Creative Enrichment Synthesis',
    description: 'Pre-step for creative hooks: synthesizes enrichment data + MINDSPACE + ELM into a focused creative brief',
    category: 'chat-analysis',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  // Campaign & Content
  {
    key: 'content-generate',
    label: 'Content Generation',
    description: 'AI content generation in Content Studio',
    category: 'campaign-content',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'content-quality',
    label: 'Quality Scoring',
    description: 'Content quality analysis and scoring',
    category: 'campaign-content',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'content-improve',
    label: 'Improve Suggestions',
    description: 'AI-powered content improvement suggestions',
    category: 'campaign-content',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  // Research & Monitoring
  {
    key: 'trend-synthesis',
    label: 'Trend Analysis',
    description: 'Trend synthesis and analysis in Trend Radar',
    category: 'research-monitoring',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'product-analysis',
    label: 'Product Analysis',
    description: 'AI product extraction from URLs and PDFs',
    category: 'research-monitoring',
    defaultProvider: 'google',
    defaultModel: 'gemini-3.1-pro-preview',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'competitor-analysis',
    label: 'Competitor Analysis',
    description: 'AI competitor extraction from websites',
    category: 'research-monitoring',
    defaultProvider: 'google',
    defaultModel: 'gemini-3.1-pro-preview',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'workshop-report',
    label: 'Workshop Report',
    description: 'AI report generation for completed workshops',
    category: 'research-monitoring',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
];

// Lookup map for O(1) access
const FEATURE_MAP = new Map(AI_FEATURES.map((f) => [f.key, f]));

// ─── Category Labels ─────────────────────────────────────────

export const FEATURE_CATEGORIES: Record<AiFeatureDefinition['category'], string> = {
  'chat-analysis': 'Chat & Analysis',
  'campaign-content': 'Campaign & Content',
  'research-monitoring': 'Research & Monitoring',
};

// ─── Resolver types ──────────────────────────────────────────

export interface ResolvedModel {
  provider: AiProvider;
  model: string;
}

/**
 * Get the feature definition for a given key.
 */
export function getFeatureDefinition(key: AiFeatureKey): AiFeatureDefinition | undefined {
  return FEATURE_MAP.get(key);
}
