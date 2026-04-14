// =============================================================
// Brand Voice Directive
//
// Builds a compact (~300 token), high-priority voice instruction
// block that is injected BEFORE type-specific templates in every
// content generation, scoring, and suggestion prompt.
//
// This ensures brand personality, tone of voice, language, and
// channel-specific communication style take absolute priority
// over generic framework methodologies.
// =============================================================

import { getBrandContext } from '@/lib/ai/brand-context';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

// ─── Types ─────────────────────────────────────────────────

export interface BrandVoiceDirectiveOptions {
  /** Direct channelTones key: "socialMedia", "email", "website", etc. */
  channel?: string;
  /** Deliverable type ID — auto-mapped to channel via category */
  deliverableTypeId?: string;
}

// ─── Constants ────────────────────────────────────────────

/** Map deliverable category to channelTones key in BrandPersonalityData */
const CATEGORY_CHANNEL_MAP: Record<string, string> = {
  'Social Media': 'socialMedia',
  'Email & Automation': 'email',
  'Website & Landing Pages': 'website',
  'Sales Enablement': 'customerSupport',
  'Long-Form Content': 'website',
  'Advertising & Paid': 'socialMedia',
  'Video & Audio': 'socialMedia',
  'PR, HR & Communications': 'email',
};

/** Human-readable language names for the directive */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Dutch (Nederlands)',
  de: 'German (Deutsch)',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  pt: 'Portuguese (Português)',
  it: 'Italian (Italiano)',
};

// ─── Public API ────────────────────────────────────────────

/**
 * Build a compact brand voice directive for prompt injection.
 * Returns empty string when no personality data is available (backward compat).
 */
export async function buildBrandVoiceDirective(
  workspaceId: string,
  options?: BrandVoiceDirectiveOptions,
): Promise<string> {
  let ctx: BrandContextBlock;
  try {
    ctx = await getBrandContext(workspaceId);
  } catch {
    return '';
  }
  return buildBrandVoiceDirectiveFromContext(ctx, options);
}

/**
 * Build the directive synchronously from an already-fetched BrandContextBlock.
 * Useful when the caller already has the context (e.g., canvas orchestrator).
 */
export function buildBrandVoiceDirectiveFromContext(
  ctx: BrandContextBlock,
  options?: BrandVoiceDirectiveOptions,
): string {
  const hasPersonality = !!ctx.brandPersonality;
  const hasToneOfVoice = !!ctx.brandToneOfVoice;
  const hasLanguage = !!ctx.contentLanguage && ctx.contentLanguage !== 'en';

  if (!hasPersonality && !hasToneOfVoice && !hasLanguage) {
    return '';
  }

  const parts: string[] = [];
  parts.push('## BRAND VOICE DIRECTIVE — NON-NEGOTIABLE');
  parts.push('All content MUST conform to these rules. They override any conflicting generic advice.');
  parts.push('');

  // Only emit explicit language instruction for non-English workspaces
  const lang = ctx.contentLanguage ?? 'en';
  if (lang !== 'en') {
    const langName = LANGUAGE_NAMES[lang] ?? lang;
    parts.push(`**Language**: Write ALL content in ${langName}. No exceptions — every word, heading, hashtag, and CTA must be in ${langName}.`);
    parts.push('');
  }

  if (hasPersonality) {
    parts.push(`**Brand voice**: ${ctx.brandPersonality}`);
    parts.push('');
  }

  if (hasToneOfVoice && ctx.brandToneOfVoice !== ctx.brandPersonality) {
    parts.push(`**Tone of voice guidelines**: ${ctx.brandToneOfVoice}`);
    parts.push('');
  }

  const channelKey = resolveChannelKey(options);
  if (channelKey) {
    parts.push(`**Channel**: This content is for the "${channelKey}" channel. Adapt tone accordingly — match the channel-specific communication style defined in the brand personality above.`);
    parts.push('');
  }

  if (ctx.brandName) {
    parts.push(`**Brand name**: Use "${ctx.brandName}" (not "we" or "our company") when referring to the brand. Ensure the brand name appears naturally in the content.`);
    parts.push('');
  }

  parts.push('Apply this voice identity WITHIN the structural methodology specified below. The methodology provides structure; the voice directive provides personality.');

  return parts.join('\n');
}

// ─── Helpers ──────────────────────────────────────────────

function resolveChannelKey(options?: BrandVoiceDirectiveOptions): string | null {
  if (options?.channel) return options.channel;

  if (options?.deliverableTypeId) {
    const typeDef = getDeliverableTypeById(options.deliverableTypeId);
    if (typeDef?.category) {
      return CATEGORY_CHANNEL_MAP[typeDef.category] ?? null;
    }
  }

  return null;
}
