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
  { id: 'claude-sonnet-4-5-20250929', provider: 'anthropic', label: 'Claude Sonnet 4.5', description: 'Latest Sonnet — advanced reasoning' },
  { id: 'claude-sonnet-4-20250514', provider: 'anthropic', label: 'Claude Sonnet 4', description: 'Balance of quality and speed' },
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', label: 'Claude Haiku 4.5', description: 'Fastest — for simple tasks' },
  { id: 'gpt-4o', provider: 'openai', label: 'GPT-4o', description: 'OpenAI flagship model' },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini', description: 'Faster and more affordable' },
  { id: 'gemini-3.1-pro-preview', provider: 'google', label: 'Gemini 3.1 Pro', description: 'Google — Advanced reasoning' },
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', description: 'Google — Fast and cost-efficient' },
];

// ─── Feature Definitions ─────────────────────────────────────

export type AiFeatureKey =
  | 'persona-chat'
  | 'campaign-strategy'
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
    supportedProviders: ['anthropic', 'openai'],
  },
  {
    key: 'campaign-strategy',
    label: 'Campaign Strategy',
    description: 'Strategy generation for campaigns (primary model)',
    category: 'chat-analysis',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic'],
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
    supportedProviders: ['anthropic', 'openai'],
  },
  {
    key: 'content-improve',
    label: 'Improve Suggestions',
    description: 'AI-powered content improvement suggestions',
    category: 'campaign-content',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic', 'openai'],
  },
  // Research & Monitoring
  {
    key: 'trend-synthesis',
    label: 'Trend Analysis',
    description: 'Trend synthesis and analysis in Trend Radar',
    category: 'research-monitoring',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-5-20250929',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'product-analysis',
    label: 'Product Analysis',
    description: 'AI product extraction from URLs and PDFs',
    category: 'research-monitoring',
    defaultProvider: 'google',
    defaultModel: 'gemini-3.1-pro-preview',
    supportedProviders: ['google'],
  },
  {
    key: 'competitor-analysis',
    label: 'Competitor Analysis',
    description: 'AI competitor extraction from websites',
    category: 'research-monitoring',
    defaultProvider: 'google',
    defaultModel: 'gemini-3.1-pro-preview',
    supportedProviders: ['google'],
  },
  {
    key: 'workshop-report',
    label: 'Workshop Report',
    description: 'AI report generation for completed workshops',
    category: 'research-monitoring',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    supportedProviders: ['openai'],
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
