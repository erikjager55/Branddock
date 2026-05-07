// =============================================================
// Component Prompt Builder
//
// Combineert deliverable-level prompt-template (uit prompt-templates/
// registry) met component-specifieke instructie. Output: { systemPrompt,
// userPrompt } gereed voor dispatchTextCompletion.
// =============================================================

import { getPromptTemplate, buildContextBlock } from './prompt-templates';
import type { GenerationContext } from './context-builder';
import type { TypeSettings } from '@/types/studio';

export interface ComponentPromptParams {
  componentType: string;
  deliverableContentType: string | null;
  deliverableTitle: string;
  generationContext: GenerationContext;
  cascadingContext: string;
  additionalInstructions: string;
  feedbackContext?: string;
  settings?: TypeSettings | null;
}

export interface BuiltComponentPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Build system + user prompt for a single component generation.
 * Uses deliverable-level template for system-prompt baseline (quality
 * guardrails + brand voice) and adds a focused component instruction.
 */
export function buildComponentPrompt(params: ComponentPromptParams): BuiltComponentPrompt {
  const {
    componentType,
    deliverableContentType,
    deliverableTitle,
    generationContext,
    cascadingContext,
    additionalInstructions,
    feedbackContext,
    settings,
  } = params;

  const template = getPromptTemplate(deliverableContentType ?? 'generic');

  const componentInstruction = buildComponentInstruction({
    componentType,
    deliverableContentType,
    deliverableTitle,
    cascadingContext,
    additionalInstructions: sanitizeUserInput(additionalInstructions, USER_INPUT_MAX_LENGTH),
    // feedbackContext is the compiled output of compileComponentFeedback, which
    // contains system-emitted markdown headers (## User Feedback, ## Persona
    // Reactions, etc.). Sanitizing here would strip those structural markers.
    // The raw user-supplied feedback is sanitized at the route boundary instead.
    feedbackContext,
  });

  const userPrompt = template.buildUserPrompt({
    userPrompt: componentInstruction,
    context: generationContext,
    settings: settings ?? null,
    deliverableTitle,
    contentType: deliverableContentType ?? 'generic',
  });

  return {
    systemPrompt: template.systemPrompt,
    userPrompt,
  };
}

interface ComponentInstructionParams {
  componentType: string;
  deliverableContentType: string | null;
  deliverableTitle: string;
  cascadingContext: string;
  additionalInstructions: string;
  feedbackContext?: string;
}

function buildComponentInstruction(p: ComponentInstructionParams): string {
  const typeLabel = humanizeComponentType(p.componentType);
  const deliverableLabel = p.deliverableContentType ?? 'content piece';

  const parts: string[] = [];
  parts.push(`Generate ONLY the **${typeLabel}** for this ${deliverableLabel} titled "${p.deliverableTitle}".`);
  parts.push(`Output should be the ${typeLabel} text directly — no preamble, no meta-commentary, no labels like "${typeLabel}:".`);

  if (p.cascadingContext.trim()) {
    parts.push(`\n${p.cascadingContext.trim()}`);
  }

  if (p.additionalInstructions.trim()) {
    parts.push(`\n## ADDITIONAL USER INSTRUCTIONS\n${p.additionalInstructions.trim()}`);
  }

  if (p.feedbackContext && p.feedbackContext.trim()) {
    parts.push(`\n## REVISION FEEDBACK\nUse this feedback to improve the previous version:\n\n${p.feedbackContext.trim()}`);
  }

  return parts.join('\n');
}

function humanizeComponentType(componentType: string): string {
  return componentType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const USER_INPUT_MAX_LENGTH = 2000;

/**
 * Strip prompt-injection vectors from user-supplied input:
 * - leading markdown headers (`#`, `##`, …) that could simulate system roles
 * - excessive length (cap)
 *
 * Use this on raw user-typed strings (additionalInstructions, feedback) at the
 * route boundary OR right before injection. Do NOT apply to system-compiled
 * context strings — those contain trusted markdown headers.
 */
export function sanitizeUserInput(input: string, maxLength: number = USER_INPUT_MAX_LENGTH): string {
  if (!input) return '';
  const stripped = input.replace(/^#+\s/gm, '').trim();
  return stripped.length > maxLength ? stripped.slice(0, maxLength) : stripped;
}

/**
 * Conservative per-component-type token cap. Body/long-form components need
 * more headroom; single-line types like headlines + meta-descriptions stay tight.
 *
 * Exact match (Set lookup) — substring matching previously over-allocated for
 * meta_description / ad description (~150 chars) which only need 2048 tokens.
 */
const LONG_FORM_TYPES: ReadonlySet<string> = new Set([
  'body_text',
  'article',
  'blog_body',
  'long_form',
  'newsletter_body',
  'whitepaper_body',
  'case_study_body',
  'press_release_body',
  'caption_long',
]);

export function getMaxTokensForComponent(componentType: string): number {
  return LONG_FORM_TYPES.has(componentType) ? 8192 : 2048;
}

// Re-export so route code can use the same buildContextBlock helper if needed
export { buildContextBlock };
