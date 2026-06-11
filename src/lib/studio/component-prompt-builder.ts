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

// DeliverableComponent.componentType carries two vocabularies:
// - component-registry snake_case spec types ('body_text', 'headline', …)
//   written by the pipeline initialize route;
// - content-template kebab-case group names ('body', 'body-sections',
//   'introduction', …) written by the canvas orchestrator
//   (componentType: component.group).
// Budget matching must cover both, or long-form bodies (1000-4000+ words
// demanded by their prompts) get truncated mid-sentence and persisted silently.

/** Output budget for full bodies / long-form documents (≥ ~5000 words headroom). */
const LONG_FORM_BUDGET = 8192;
/** Output budget for section-level chunks of a larger piece. */
const SECTION_BUDGET = 4096;
/** Tight budget for short single-line fields (headline / cta / subject / meta). */
const DEFAULT_BUDGET = 2048;

/** Body-level component names from both vocabularies. */
const LONG_FORM_EXACT: ReadonlySet<string> = new Set([
  'body_text', // registry: blog/article/whitepaper/case-study/email body
  'body', // template group: generic body
  'body-sections', // template group: article/whitepaper main sections
  'content', // template group: generic page content
]);

/** Section-level component names: substantial but bounded chunks. */
const SECTION_EXACT: ReadonlySet<string> = new Set([
  'introduction',
  'conclusion',
  'outline',
  'talking_points',
  'video_script', // registry: one script section per component
  'show-notes',
]);

/**
 * Per-component-type output-token budget for studio component generation.
 *
 * Tiers: body-like components get long-form headroom, section-like components
 * a mid tier, and everything else (headline, cta, subject_line, hashtags,
 * meta_description, ad copy, …) stays on a tight default. The body substring
 * match deliberately covers compounds from both vocabularies ('body-script',
 * 'script-body', 'newsletter_body'); it does NOT match 'description' fields,
 * which previously over-allocated under broader substring matching.
 */
export function getMaxTokensForComponent(componentType: string): number {
  const normalized = componentType.toLowerCase();
  if (LONG_FORM_EXACT.has(normalized) || normalized.includes('body')) {
    return LONG_FORM_BUDGET;
  }
  if (SECTION_EXACT.has(normalized)) {
    return SECTION_BUDGET;
  }
  return DEFAULT_BUDGET;
}

// Re-export so route code can use the same buildContextBlock helper if needed
export { buildContextBlock };
