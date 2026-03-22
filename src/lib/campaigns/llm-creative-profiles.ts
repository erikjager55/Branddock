/**
 * LLM Creative Profiles — Model Strengths for Creative Hook Generation
 *
 * Each LLM has a creative profile used by the AI curator to match
 * creative angles to the model best suited for that angle's requirements.
 *
 * @see Plan: "Campaign Strategy Pipeline Restructure — 9-Phase Architecture"
 */

import type { AiProvider } from '@/lib/ai/feature-models';
import type { CreativeAngleId } from './creative-angles';

// ─── Types ────────────────────────────────────────────────

export interface LlmCreativeProfile {
  providerId: AiProvider;
  moniker: string;
  defaultModel: string;
  creativeScore: number;
  strengthDimensions: Record<CreativeDimension, number>;
  weaknesses: string[];
  bestAngleIds: CreativeAngleId[];
  worstAngleIds: CreativeAngleId[];
  promptStyleNotes: string;
}

// ─── Strength Dimensions ──────────────────────────────────

export const CREATIVE_DIMENSIONS = [
  'prose_quality',
  'emotional_intelligence',
  'metaphor_depth',
  'cultural_awareness',
  'humor_range',
  'visual_imagination',
  'voice_consistency',
  'structural_creativity',
  'cross_domain_connections',
  'data_integration',
  'format_adaptation',
  'brand_voice_preservation',
  'risk_taking',
  'nuance_subtlety',
  'operational_excellence',
] as const;

export type CreativeDimension = (typeof CREATIVE_DIMENSIONS)[number];

// ─── LLM Profiles ─────────────────────────────────────────

export const LLM_CREATIVE_PROFILES: Record<AiProvider, LlmCreativeProfile> = {
  anthropic: {
    providerId: 'anthropic',
    moniker: 'Strategic Poet',
    defaultModel: 'claude-opus-4-6',
    creativeScore: 8.6,
    strengthDimensions: {
      prose_quality: 9,
      emotional_intelligence: 9,
      metaphor_depth: 9,
      cultural_awareness: 8,
      humor_range: 7,
      visual_imagination: 8,
      voice_consistency: 9,
      structural_creativity: 7,
      cross_domain_connections: 8,
      data_integration: 7,
      format_adaptation: 7,
      brand_voice_preservation: 9,
      risk_taking: 6,
      nuance_subtlety: 9,
      operational_excellence: 8,
    },
    weaknesses: [
      'Risk aversion — tends to hedge and over-qualify bold claims',
      'Formal register — can sound academic rather than punchy',
      'Over-nuanced — sometimes adds complexity where simplicity is needed',
    ],
    bestAngleIds: [
      'emotional_truth',
      'cultural_tension',
      'metaphor_transfer',
      'personification',
      'purpose_activism',
      'unexpected_juxtaposition',
    ],
    worstAngleIds: [
      'absurdist_humor',
      'exaggeration',
    ],
    promptStyleNotes: 'Give Claude emotional depth and literary nuance. Encourage subtext and layered meaning. Push past the first "safe" idea — ask for the version that makes the creative director nervous. Explicitly request bold, concise language rather than hedged qualifications.',
  },
  openai: {
    providerId: 'openai',
    moniker: 'Prolific Executioner',
    defaultModel: 'gpt-5.4',
    creativeScore: 7.8,
    strengthDimensions: {
      prose_quality: 7,
      emotional_intelligence: 7,
      metaphor_depth: 7,
      cultural_awareness: 7,
      humor_range: 8,
      visual_imagination: 7,
      voice_consistency: 7,
      structural_creativity: 8,
      cross_domain_connections: 7,
      data_integration: 7,
      format_adaptation: 9,
      brand_voice_preservation: 8,
      risk_taking: 8,
      nuance_subtlety: 6,
      operational_excellence: 9,
    },
    weaknesses: [
      'Formulaic patterns — can fall into predictable creative structures',
      'Surface-level insight — sometimes lacks interpretive depth',
      'Over-eager helpfulness — may prioritize "useful" over "surprising"',
    ],
    bestAngleIds: [
      'reversal',
      'exaggeration',
      'absurdist_humor',
      'challenger',
      'co_creation',
    ],
    worstAngleIds: [
      'emotional_truth',
      'cultural_tension',
    ],
    promptStyleNotes: 'Give GPT clear structural constraints and format requirements. Works best with specific creative briefs and explicit "surprise me" instructions. Request multiple options and iterate. Push for specificity over generality. Include "Do NOT be safe or generic" as an explicit instruction.',
  },
  google: {
    providerId: 'google',
    moniker: 'Data-Grounded Synthesizer',
    defaultModel: 'gemini-3.1-pro-preview',
    // Note: Gemini 3 Pro is deprecated as of March 9, 2026 — use 3.1 Pro
    creativeScore: 7.3,
    strengthDimensions: {
      prose_quality: 6,
      emotional_intelligence: 6,
      metaphor_depth: 6,
      cultural_awareness: 7,
      humor_range: 5,
      visual_imagination: 7,
      voice_consistency: 6,
      structural_creativity: 7,
      cross_domain_connections: 8,
      data_integration: 9,
      format_adaptation: 7,
      brand_voice_preservation: 6,
      risk_taking: 5,
      nuance_subtlety: 6,
      operational_excellence: 8,
    },
    weaknesses: [
      'Mechanical prose — lacks the warmth and flow of natural writing',
      'Lacks interpretive depth — reports rather than interprets',
      'Verbose output — tends to over-explain rather than imply',
      'Weaker emotional register — better at analysis than feeling',
    ],
    bestAngleIds: [
      'behavioral_insight',
      'cep_multiplication',
      'social_proof',
      'simplification',
      'product_as_hero',
    ],
    worstAngleIds: [
      'emotional_truth',
      'personification',
      'nostalgia_reframe',
    ],
    promptStyleNotes: 'Give Gemini data-rich context and ask for evidence-based creative concepts. Works best when the creative insight is grounded in behavioral data, market patterns, or consumer research. Request structured output with clear sections. Ask for "unexpected connections between data points" rather than "emotional storytelling."',
  },
} as const satisfies Record<AiProvider, Omit<LlmCreativeProfile, 'strengthDimensions'> & { strengthDimensions: Record<string, number> }>;

// ─── Helpers ──────────────────────────────────────────────

export function getLlmProfile(providerId: AiProvider): LlmCreativeProfile | undefined {
  return LLM_CREATIVE_PROFILES[providerId];
}

/**
 * Format all LLM profiles as a markdown prompt section for the curator.
 */
export function formatLlmProfilesForPrompt(): string {
  const lines = ['## LLM Creative Profiles', ''];
  for (const profile of Object.values(LLM_CREATIVE_PROFILES)) {
    lines.push(`### ${profile.moniker} (${profile.providerId}, default: ${profile.defaultModel})`);
    lines.push(`Creative score: ${profile.creativeScore}/10`);
    lines.push(`Best angles: ${profile.bestAngleIds.join(', ')}`);
    lines.push(`Weaknesses: ${profile.weaknesses.join('; ')}`);
    lines.push(`Prompt style: ${profile.promptStyleNotes}`);
    lines.push('');
  }
  return lines.join('\n');
}
