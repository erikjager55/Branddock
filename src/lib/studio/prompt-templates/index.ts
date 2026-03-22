// =============================================================
// Studio Prompt Template Registry
//
// Central registry of prompt templates for all 47 deliverable types.
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
 * Get the prompt template for a deliverable type.
 * Falls back to a generic content template if no specific template exists.
 */
export function getPromptTemplate(deliverableTypeId: string): PromptTemplate {
  const template = TEMPLATE_REGISTRY[deliverableTypeId];
  if (template) return template;

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
