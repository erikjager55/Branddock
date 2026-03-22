// =============================================================
// Shared helpers and types for prompt templates.
//
// Extracted from index.ts to break circular dependencies:
// index.ts imports template files, which need these helpers.
// =============================================================

import type { GenerationContext } from '../context-builder';
import type { TypeSettings, TextSettings } from '@/types/studio';

// ─── Types ─────────────────────────────────────────────────

export interface PromptTemplate {
  /** System prompt defining the AI's role and output format */
  systemPrompt: string;
  /** Build the user prompt from context, settings, and user input */
  buildUserPrompt: (params: UserPromptParams) => string;
}

export interface UserPromptParams {
  userPrompt: string;
  context: GenerationContext;
  settings: TypeSettings | null;
  deliverableTitle: string;
  contentType: string;
}

// ─── Shared Helpers ────────────────────────────────────────

/** Extract tone and length from settings (TextSettings) */
export function extractTextSettings(settings: TypeSettings | null): {
  tone: string;
  length: string;
  targetAudience: string;
} {
  const ts = settings as TextSettings | null;
  return {
    tone: ts?.tone || 'professional',
    length: ts?.length || 'medium',
    targetAudience: ts?.targetAudience || '',
  };
}

/** Build a context block string from all available context sources */
export function buildContextBlock(context: GenerationContext): string {
  const parts: string[] = [];

  if (context.brandContext) {
    parts.push('=== BRAND CONTEXT ===');
    parts.push(context.brandContext);
    parts.push('=== END BRAND CONTEXT ===');
    parts.push('');
  }

  if (context.personaContext) {
    parts.push(context.personaContext);
    parts.push('');
  }

  if (context.campaignContext) {
    parts.push('=== CAMPAIGN CONTEXT ===');
    parts.push(context.campaignContext);
    parts.push('=== END CAMPAIGN CONTEXT ===');
    parts.push('');
  }

  if (context.deliverableBrief) {
    parts.push('=== DELIVERABLE BRIEF ===');
    parts.push(context.deliverableBrief);
    parts.push('=== END DELIVERABLE BRIEF ===');
    parts.push('');
  }

  return parts.join('\n');
}

// ─── Base System Prompt ────────────────────────────────────

const OUTPUT_FORMAT_INSTRUCTIONS = `

## OUTPUT FORMAT
- Output your content in **markdown** format.
- Use proper markdown headings (# for H1, ## for H2, ### for H3).
- Use **bold** and *italic* for emphasis.
- Use bullet lists (- item) and numbered lists (1. item) where appropriate.
- Use > for blockquotes.
- Use --- for section dividers where appropriate.
- Use [link text](url) for hyperlinks.
- Do NOT wrap your output in code fences or JSON.
- Do NOT include meta-commentary like "Here is your content:" — just output the content directly.`;

export function buildBaseSystemPrompt(typeInstructions: string): string {
  return `${typeInstructions}${OUTPUT_FORMAT_INSTRUCTIONS}

## BRAND ALIGNMENT
- Use the brand context to align your writing with the brand's voice, personality, and values.
- If a brand personality or tone of voice is provided, match it precisely.
- Incorporate brand messaging hierarchy where relevant.
- Ensure the content reinforces the brand's positioning and promise.

## PERSONA TARGETING
- If persona context is provided, tailor the content specifically for that audience.
- Address their goals, frustrations, and motivations.
- Use language and references they would resonate with.
- Optimize for their preferred channels and communication style.`;
}

/**
 * Format additional settings (beyond tone/length/targetAudience) into a
 * readable specification block for the AI prompt.
 * Filters out the base settings that are already handled by category builders.
 */
export function formatAdditionalSettings(settings: TypeSettings | null): string {
  if (!settings) return '';
  const record = settings as unknown as Record<string, unknown>;
  const BASE_KEYS = new Set(['tone', 'length', 'targetAudience']);
  const entries = Object.entries(record).filter(
    ([key, value]) => !BASE_KEYS.has(key) && value !== '' && value !== undefined && value !== null,
  );
  if (entries.length === 0) return '';

  const lines = entries.map(([key, value]) => {
    // Convert camelCase key to readable label
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
    if (typeof value === 'boolean') return `${label}: ${value ? 'Yes' : 'No'}`;
    return `${label}: ${value}`;
  });

  return `\n## ADDITIONAL SPECIFICATIONS\n${lines.join('\n')}`;
}
