// =============================================================
// Studio Prompt Template Registry
//
// Central registry of prompt templates for all 53 deliverable types.
// Each template defines a system prompt and a user prompt builder
// that combines context, settings, and user instructions.
//
// Templates are organized by category but registered by type ID.
//
// NOTE: Shared helpers and types live in ./helpers.ts to avoid
// circular dependencies (index imports templates, templates need helpers).
// =============================================================

import { LONG_FORM_TEMPLATES } from './long-form';
import { SOCIAL_MEDIA_TEMPLATES } from './social-media';
import { ADVERTISING_TEMPLATES } from './advertising';
import { EMAIL_TEMPLATES } from './email';
import { WEBSITE_TEMPLATES } from './website';
import { VIDEO_AUDIO_TEMPLATES } from './video-audio';
import { SALES_TEMPLATES } from './sales';
import { PR_HR_TEMPLATES } from './pr-hr';

// Re-export helpers and types so external consumers can still import from this barrel
export type { PromptTemplate, UserPromptParams } from './helpers';
export {
  extractTextSettings,
  buildContextBlock,
  buildBaseSystemPrompt,
  formatAdditionalSettings,
} from './helpers';

import type { PromptTemplate } from './helpers';
import { buildBaseSystemPrompt, extractTextSettings, buildContextBlock } from './helpers';

// ─── Template Registry ─────────────────────────────────────

const TEMPLATE_REGISTRY: Record<string, PromptTemplate> = {
  ...LONG_FORM_TEMPLATES,
  ...SOCIAL_MEDIA_TEMPLATES,
  ...ADVERTISING_TEMPLATES,
  ...EMAIL_TEMPLATES,
  ...WEBSITE_TEMPLATES,
  ...VIDEO_AUDIO_TEMPLATES,
  ...SALES_TEMPLATES,
  ...PR_HR_TEMPLATES,
};

/**
 * True wanneer een type een dedicated template heeft in het werkelijke
 * lookup-object (niet slechts in een van de collecties). Gebruikt door
 * smoke:prompt-contracts sectie (g) zodat CI het échte pad test — een
 * weggevallen spread-regel hierboven zou anders onopgemerkt blijven.
 */
export function hasDedicatedTemplate(deliverableTypeId: string): boolean {
  return deliverableTypeId in TEMPLATE_REGISTRY;
}

// Eén warn per type per proces — het fallback-pad zit op het hot path
// (2× per generatie via buildCanvasPrompt) en mag niet spammen.
const warnedFallbackTypes = new Set<string>();

/**
 * Get the prompt template for a deliverable type.
 * Falls back to a generic content template if no specific template exists.
 */
export function getPromptTemplate(deliverableTypeId: string): PromptTemplate {
  const template = TEMPLATE_REGISTRY[deliverableTypeId];
  if (template) return template;

  // CF-1 (content-flow-improvements-7a): een type zonder dedicated template
  // degradeerde eerder STIL naar de generieke prompt (merkbare kwaliteits-
  // drop). Alle 55 canonieke types hebben inmiddels een template; deze warn
  // + smoke:prompt-contracts sectie (g) bewaken dat dat zo blijft.
  // Lege id niet warnen: legacy deliverables zonder contentType nemen dit
  // pad bewust (`getPromptTemplate(stack.deliverableTypeId ?? '')`) — daar
  // is de generic fallback het ontworpen gedrag, geen ontbrekend template.
  if (deliverableTypeId && !warnedFallbackTypes.has(deliverableTypeId)) {
    warnedFallbackTypes.add(deliverableTypeId);
    console.warn(
      `[prompt-templates] no dedicated template for '${deliverableTypeId}' — falling back to the generic content template. Add an entry to the matching src/lib/studio/prompt-templates/<category>.ts file.`,
    );
  }

  // Fallback: generic content template
  return {
    systemPrompt: buildBaseSystemPrompt(
      `You are an expert content writer and brand strategist. Create high-quality, brand-aligned content based on the user's instructions and the provided brand context.`,
    ),
    buildUserPrompt: ({ userPrompt, context, settings }) => {
      const { tone, length } = extractTextSettings(settings);
      const contextBlock = buildContextBlock(context);

      return `${contextBlock}

## CONTENT INSTRUCTIONS
Tone: ${tone}
Length: ${length}

## USER PROMPT
${userPrompt}`;
    },
  };
}
