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
  { id: 'claude-opus-4-7', provider: 'anthropic', label: 'Claude Opus 4.7', description: 'Newest flagship — vision + design, released Apr 17, 2026' },
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
  | 'canvas-text-generate'
  | 'canvas-seo-research'
  | 'canvas-image-generate'
  | 'canvas-video-generate'
  | 'canvas-audio-generate'
  | 'canvas-quality-check'
  | 'content-generate'
  | 'content-quality'
  | 'content-improve'
  | 'trend-synthesis'
  | 'deep-research-clarify'
  | 'deep-research-synthesis'
  | 'product-analysis'
  | 'competitor-analysis'
  | 'workshop-report'
  | 'agent-research-analyst'
  | 'agent-brand-guardian'
  | 'agent-strategist'
  | 'agent-content-creator'
  | 'agent-market-analyst'
  | 'agent-data-analyst'
  | 'agent-reporter'
  | 'agent-seo-watchdog'
  | 'agent-ads-watchdog';

export type AiProvider = 'anthropic' | 'openai' | 'google';

export interface AiFeatureDefinition {
  key: AiFeatureKey;
  label: string;
  description: string;
  category: 'chat-analysis' | 'campaign-content' | 'research-monitoring' | 'agents';
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
  // Campaign & Content — Canvas
  {
    key: 'canvas-text-generate',
    label: 'Canvas Text Generation',
    description: 'Text generation for canvas content items (copy, headlines, CTAs)',
    category: 'campaign-content',
    // F27/F28 (audit 2026-05-13): default Opus 4.7 + thinking (correcte
    // adaptive API sinds F27). Eigen experiment 2026-05-13 v2: Opus 4.7
    // thinking = composite 90 op blog-post, Sonnet 4.6 thinking = 85.
    // Opus is premium-default voor pre-launch kwaliteit. Per-workspace
    // override naar Sonnet 4.6 mogelijk via WorkspaceAiConfig voor
    // cost-gevoelige tier.
    defaultProvider: 'anthropic',
    defaultModel: 'claude-opus-4-7',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'canvas-seo-research',
    label: 'Canvas SEO Research',
    description:
      'Snelle research/planning-stappen van de SEO-pipeline (briefing, keyword, competitor, SERP-gaps, outline). De prose-stappen (draft/editorial/prep) blijven op canvas-text-generate.',
    category: 'campaign-content',
    // Speed-tier: Sonnet 4.6 i.p.v. Opus 4.7 — structured JSON/planning is
    // nauwelijks kwaliteitsgevoelig maar veel sneller. Per-workspace override
    // mogelijk via WorkspaceAiConfig.
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'canvas-image-generate',
    label: 'Canvas Image Generation',
    description: 'Image generation for canvas visuals (placeholder for nanobanana)',
    category: 'campaign-content',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    supportedProviders: ['openai'],
  },
  {
    key: 'canvas-video-generate',
    label: 'Video Generation',
    description: 'AI video generation via Runway ML (gen4.5)',
    category: 'campaign-content',
    defaultProvider: 'google',
    defaultModel: 'gen4.5',
    supportedProviders: ['google'],
  },
  {
    key: 'canvas-audio-generate',
    label: 'Canvas Audio Generation',
    description: 'Audio generation for canvas content (placeholder for ElevenLabs)',
    category: 'campaign-content',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    supportedProviders: ['openai'],
  },
  {
    key: 'canvas-quality-check',
    label: 'Canvas Quality Check',
    description: 'Quality validation for canvas content items',
    category: 'campaign-content',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-haiku-4-5-20251001',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  // Campaign & Content — Studio
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
    key: 'deep-research-clarify',
    label: 'Deep Research Clarify',
    description: 'Generates 2-3 clarifying questions before a Knowledge Library deep-research run',
    category: 'research-monitoring',
    // Gemini Flash: snel + goedkoop voor de korte verfijnings-step vóór de run.
    defaultProvider: 'google',
    defaultModel: 'gemini-2.5-flash',
    supportedProviders: ['anthropic', 'openai', 'google'],
  },
  {
    key: 'deep-research-synthesis',
    label: 'Deep Research Synthesis',
    description: 'Synthesizes scraped + verified sources into a cited markdown report for the Knowledge Library',
    category: 'research-monitoring',
    // Sonnet 4.6: lange, geciteerde long-form synthese met sterke instructie-fit.
    // Anthropic-only: de synthese/verify-fasen lopen via de Anthropic-wrapper en
    // borgen dit met assertProvider — bied geen niet-werkende providers aan in de UI.
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
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

  // Agents — persona-agents on the shared agent-loop (ADR 2026-07-05).
  // Anthropic-only: the loop is built on the Anthropic tool-use API;
  // assertProvider('anthropic') guards this at run time.
  {
    key: 'agent-research-analyst',
    label: 'Agent — Research Analyst',
    description: 'Deep research agent producing cited reports',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-brand-guardian',
    label: 'Agent — Brand Guardian',
    description: 'Brand fidelity review agent (F-VAL scoring + findings)',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-strategist',
    label: 'Agent — Strategist',
    description: 'Campaign strategy agent building blueprints',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-content-creator',
    label: 'Agent — Content Creator',
    description: 'Content creation agent driving the canvas pipeline',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-market-analyst',
    label: 'Agent — Market Analyst',
    description: 'Competitor and trend analysis agent',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-data-analyst',
    label: 'Agent — Data Analyst',
    description: 'Workspace data analysis agent producing tables',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-reporter',
    label: 'Agent — Reporter',
    description: 'Weekly client-ready brand report agent',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-seo-watchdog',
    label: 'Agent — SEO/GEO Watchdog',
    description: 'Published GEO content decay-scan and maintenance report agent',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
  {
    key: 'agent-ads-watchdog',
    label: 'Agent — Ads Watchdog',
    description: 'Creative-fatigue scan and refresh-proposal agent for connected ad accounts',
    category: 'agents',
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    supportedProviders: ['anthropic'],
  },
];

// Lookup map for O(1) access
const FEATURE_MAP = new Map(AI_FEATURES.map((f) => [f.key, f]));

// ─── Category Labels ─────────────────────────────────────────

export const FEATURE_CATEGORIES: Record<AiFeatureDefinition['category'], string> = {
  'chat-analysis': 'Chat & Analysis',
  'campaign-content': 'Campaign & Content',
  'research-monitoring': 'Research & Monitoring',
  agents: 'Agents',
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
