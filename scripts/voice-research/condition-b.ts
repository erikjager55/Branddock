/**
 * WS2 Condition B Prompt Builder — research tooling for voice fingerprinting drift study.
 *
 * Implements four propagation-fixes (A.1-A.4) on top of the existing Brand Voice Directive
 * WITHOUT modifying any production file. Production BVD utility (src/lib/studio/brand-voice-directive.ts)
 * is left unchanged — that's condition A's baseline. This file is the condition B builder.
 *
 *   A.1 Channel-tone extraction    — extract single channelTone for active deliverable,
 *                                     instruct model to ignore other channel tones in the blob
 *   A.2 Voice-source deduplication — Brand Personality (canonical) > Brandstyle Analyzer tone
 *   A.3 Mid-prompt voice anchor     — per-section voice reinforcement before STRUCTURE SKELETON
 *   A.4 End-of-prompt voice check  — final voice-check block closest to output tokens
 *
 * See:
 *   - docs/voice-fingerprinting-ws1-audit.md (audit + intervention rationale)
 *   - docs/voice-fingerprinting-ws2-protocol.md §4.2 (condition B definition)
 *
 * Pre-registered v0.2 — pre-commit 446f92b. Modifying this file's behavior requires
 * a protocol version bump per docs/voice-fingerprinting-ws2-protocol.md §7.2.
 */

import type { BrandContextBlock } from '@/lib/ai/prompt-templates';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

// Mirror of CATEGORY_CHANNEL_MAP in brand-voice-directive.ts — duplicated to keep this
// file self-contained as research-tooling. If production map changes, update here too.
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

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Dutch (Nederlands)',
  de: 'German (Deutsch)',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  pt: 'Portuguese (Português)',
  it: 'Italian (Italiano)',
};

/**
 * Top generic LLM-tells from §1.3 of the protocol (NL+EN, condensed for prompt-injection).
 * Pre-registered v0.2 — modifications require protocol version bump.
 */
const TOP_LLM_TELLS_TO_AVOID = [
  '"In een wereld die steeds sneller verandert", "In het huidige digitale landschap"',
  '"Het is niet alleen X, maar ook Y" valse-contrast constructions',
  '"Of je nu X bent of Y" inclusieve openers (vermijd doelgroep-keuze)',
  'Marketing-jargon: "innovatieve oplossingen", "ontzorgen", "meedenken", "het verschil maken"',
  'Hedge-zinnen: "Het is belangrijk om op te merken dat", "Wat we niet uit het oog moeten verliezen"',
  'Sectie-conclusie-openers: "Concluderend", "Tot slot", "Samenvattend kunnen we stellen dat"',
  'Forced triple-lists where the reality is two or four',
  '"Stel je voor" hypothetical-reader openers',
  '"Bij [brand] geloven we" uitgesleten brand-stem-openers',
  'Em-dash overschot + "Het resultaat? X" question-answer constructions',
];

export interface ConditionBOptions {
  /** Direct channelTones key: "socialMedia", "email", "website", etc. Overrides deliverableTypeId. */
  channel?: string;
  /** Deliverable type ID — auto-mapped to channel via category */
  deliverableTypeId?: string;
  /** Top personality trait for A.3/A.4 reinforcement (from BrandPersonalityFrameworkData.personalityTraits[0].name or .primaryDimension) */
  primaryTrait?: string;
  /** Top brand vocabulary words for A.3/A.4 reinforcement */
  brandWordsUse?: string[];
  brandWordsAvoid?: string[];
}

/**
 * Build the condition B voice section.
 *
 * Differences vs production buildBrandVoiceDirectiveFromContext (= condition A):
 *   - A.1: Adds a "Channel-specific tone for X: …" line extracted from the personality blob,
 *          plus an instruction to ignore the other channel tones for this content.
 *   - A.2: Labels canonical Brand Personality as "(canonical)" and Brandstyle Analyzer
 *          tone-of-voice as "(supplementary)" with explicit precedence rule.
 *
 * A.3 + A.4 are applied separately via wrapWithVoiceReinforcement().
 */
export function buildConditionBVoiceSection(
  ctx: BrandContextBlock,
  options?: ConditionBOptions,
): string {
  const hasPersonality = !!ctx.brandPersonality;
  const hasToneOfVoice = !!ctx.brandToneOfVoice;
  const hasLanguage = !!ctx.contentLanguage && ctx.contentLanguage !== 'en';

  if (!hasPersonality && !hasToneOfVoice && !hasLanguage) return '';

  const parts: string[] = [];
  parts.push('## BRAND VOICE DIRECTIVE — NON-NEGOTIABLE');
  parts.push(
    'All content MUST conform to these rules. They override any conflicting generic advice.',
  );
  parts.push('');

  // Language instruction (unchanged from condition A)
  const lang = ctx.contentLanguage ?? 'en';
  if (lang !== 'en') {
    const langName = LANGUAGE_NAMES[lang] ?? lang;
    parts.push(
      `**Language**: Write ALL content in ${langName}. No exceptions — every word, heading, hashtag, and CTA must be in ${langName}.`,
    );
    parts.push('');
  }

  // A.2: Voice-source deduplication
  // Precedence: canonical Brand Personality > Brandstyle Analyzer tone-of-voice
  if (hasPersonality) {
    parts.push(`**Brand voice (canonical, primary source)**: ${ctx.brandPersonality}`);
    parts.push('');

    if (hasToneOfVoice && ctx.brandToneOfVoice !== ctx.brandPersonality) {
      parts.push(`**Stylistic refinement (supplementary)**: ${ctx.brandToneOfVoice}`);
      parts.push(
        'When the supplementary refinement conflicts with the canonical brand voice above, the canonical voice wins.',
      );
      parts.push('');
    }
  } else if (hasToneOfVoice) {
    // Only Brandstyle Analyzer source available — no canonical personality asset
    parts.push(`**Brand voice**: ${ctx.brandToneOfVoice}`);
    parts.push('');
  }

  // A.1: Channel-tone extraction
  // Pull the specific channel-tone string from the personality blob and elevate it.
  // Other channels in the blob are explicitly marked irrelevant for this content.
  const channelKey = resolveChannelKey(options);
  if (channelKey && hasPersonality) {
    const extractedTone = extractChannelToneFromPersonality(ctx.brandPersonality!, channelKey);
    if (extractedTone) {
      parts.push(
        `**Channel-specific tone for "${channelKey}" (active for this content)**: ${extractedTone}`,
      );
      parts.push(
        'Apply this channel tone consistently throughout. The other channel tones listed in the brand voice above are NOT relevant for this content — focus only on the channel tone for this deliverable.',
      );
      parts.push('');
    } else {
      // Fall back to referential channel mention (= condition A behavior) when extraction fails
      parts.push(
        `**Channel**: This content is for the "${channelKey}" channel. Adapt tone accordingly using the channel-specific guidance in the brand voice above.`,
      );
      parts.push('');
    }
  }

  if (ctx.brandName) {
    parts.push(
      `**Brand name**: Use "${ctx.brandName}" (not "we" or "our company") when referring to the brand. Preserve the original capitalization exactly. Ensure the brand name appears naturally in the content.`,
    );
    parts.push('');
  }

  parts.push(
    'Apply this voice identity WITHIN the structural methodology specified below. The methodology provides structure; the voice directive provides personality.',
  );

  return parts.join('\n');
}

/**
 * A.3 + A.4: Wrap a content-type system prompt with mid-prompt and end-of-prompt
 * voice reinforcement blocks. Counters position-decay over 3K-word output.
 *
 * Layout of returned prompt:
 *
 *   [voice section]               ← A.1 + A.2 from buildConditionBVoiceSection()
 *   ## VOICE ANCHOR — APPLY TO EVERY SECTION    ← A.3 mid-prompt reinforcement
 *   [original type-specific system prompt]
 *   ## VOICE CHECK BEFORE OUTPUT  ← A.4 end-of-prompt voice check
 */
export function wrapWithVoiceReinforcement(
  voiceSection: string,
  systemPrompt: string,
  options?: ConditionBOptions,
): string {
  const primaryTrait = options?.primaryTrait;
  const wordsUse = (options?.brandWordsUse ?? []).filter(Boolean).slice(0, 3);
  const wordsAvoid = (options?.brandWordsAvoid ?? []).filter(Boolean).slice(0, 3);

  // A.3: Mid-prompt voice-reinforcement
  // Positioned BETWEEN the brand voice directive and the type-specific instructions,
  // so it's read after voice directive (priming) and before structure (action).
  const midReinforcementLines = [
    '## VOICE ANCHOR — APPLY TO EVERY SECTION',
    'For EACH ## H2 section you generate: pause before continuing and validate the voice.',
  ];
  if (primaryTrait) {
    midReinforcementLines.push(`- Maintain the primary trait: **${primaryTrait}**.`);
  }
  if (wordsUse.length > 0) {
    midReinforcementLines.push(
      `- Use brand vocabulary where natural: ${wordsUse.join(', ')}.`,
    );
  }
  if (wordsAvoid.length > 0) {
    midReinforcementLines.push(`- Avoid brand-specific words: ${wordsAvoid.join(', ')}.`);
  }
  midReinforcementLines.push(
    `- Avoid these generic LLM patterns: ${TOP_LLM_TELLS_TO_AVOID.slice(0, 4).join('; ')}.`,
  );
  midReinforcementLines.push(
    'If a section drifts toward generic marketing-LLM voice OR feels imposed/stylized (forced voice is also drift), rewrite that section before continuing to the next.',
  );
  const midReinforcement = midReinforcementLines.join('\n');

  // A.4: End-of-prompt voice-summary
  // Positioned AT THE VERY END of the system prompt, closest to user prompt and output.
  // Targets position-decay: voice instruction at top of system prompt has decreasing
  // influence over 3K-word output; this block resets attention right before generation.
  const endVoiceCheckLines = [
    '## VOICE CHECK BEFORE OUTPUT',
    'Before producing your final draft, verify against the voice directive at the top:',
  ];
  if (primaryTrait) {
    endVoiceCheckLines.push(
      `1. Does the opening paragraph sound like the brand (primary trait: **${primaryTrait}**), or like a generic AI marketing template?`,
    );
  } else {
    endVoiceCheckLines.push(
      '1. Does the opening paragraph sound like the brand voice, or like a generic AI marketing template?',
    );
  }
  endVoiceCheckLines.push(
    '2. Does each section maintain the brand voice consistently — not just the opening?',
  );
  if (wordsUse.length > 0) {
    endVoiceCheckLines.push(
      `3. Are brand vocabulary words present where natural (${wordsUse.join(', ')})?`,
    );
  }
  if (wordsAvoid.length > 0) {
    endVoiceCheckLines.push(`4. Are avoid-words absent (${wordsAvoid.join(', ')})?`);
  }
  endVoiceCheckLines.push(
    '5. Does the cadence match brand-typical rhythm (sentence length, paragraph length, rhetorical moves)?',
  );
  endVoiceCheckLines.push(
    '6. Does the voice feel naturally integrated, NOT imposed-stylistic? Forced voice is drift in the opposite direction of generic-LLM-drift; both are wrong.',
  );
  endVoiceCheckLines.push('If any check fails, revise that section before producing final output.');
  const endVoiceCheck = endVoiceCheckLines.join('\n');

  return [voiceSection, '', midReinforcement, '', systemPrompt, '', endVoiceCheck].join('\n');
}

/**
 * Extract personality fields from raw BrandPersonalityFrameworkData JSON.
 * Used by the runner to populate ConditionBOptions for A.3/A.4 reinforcement.
 *
 * Returns nullable fields — caller should handle missing data gracefully.
 */
export function extractPersonalityFields(frameworkData: unknown): {
  primaryTrait?: string;
  wordsUse: string[];
  wordsAvoid: string[];
} {
  if (!frameworkData || typeof frameworkData !== 'object') {
    return { wordsUse: [], wordsAvoid: [] };
  }
  const data = frameworkData as Record<string, unknown>;

  // Prefer first personality trait name (more specific than primaryDimension)
  let primaryTrait: string | undefined;
  const traits = data.personalityTraits;
  if (Array.isArray(traits) && traits.length > 0) {
    const firstTrait = traits[0] as Record<string, unknown> | null;
    const traitName = firstTrait?.name;
    if (typeof traitName === 'string' && traitName.trim().length > 0) {
      primaryTrait = traitName.trim();
    }
  }
  // Fallback to primaryDimension
  if (!primaryTrait && typeof data.primaryDimension === 'string') {
    primaryTrait = data.primaryDimension;
  }

  const wordsUse = Array.isArray(data.wordsWeUse)
    ? (data.wordsWeUse as unknown[]).filter((w): w is string => typeof w === 'string')
    : [];
  const wordsAvoid = Array.isArray(data.wordsWeAvoid)
    ? (data.wordsWeAvoid as unknown[]).filter((w): w is string => typeof w === 'string')
    : [];

  return { primaryTrait, wordsUse, wordsAvoid };
}

// ─── Helpers ──────────────────────────────────────────────

function resolveChannelKey(options?: ConditionBOptions): string | null {
  if (options?.channel) return options.channel;
  if (options?.deliverableTypeId) {
    const typeDef = getDeliverableTypeById(options.deliverableTypeId);
    if (typeDef?.category) return CATEGORY_CHANNEL_MAP[typeDef.category] ?? null;
  }
  return null;
}

/**
 * Extract a single channel's tone from the formatted personality blob.
 * formatBrandPersonality emits: "Channel-specific tone: socialMedia: …; email: …; website: …; …"
 * This pulls just the active channel's value for A.1.
 *
 * Returns null when the blob doesn't contain a channel-tone section or the requested channel.
 */
function extractChannelToneFromPersonality(
  personalityBlob: string,
  channelKey: string,
): string | null {
  const marker = 'Channel-specific tone:';
  const start = personalityBlob.indexOf(marker);
  if (start === -1) return null;

  // formatBrandPersonality joins parts with ". " — find the end of this section
  const fromMarker = personalityBlob.slice(start + marker.length);
  const endIdx = fromMarker.indexOf('. ');
  const section = endIdx === -1 ? fromMarker : fromMarker.slice(0, endIdx);

  // Each channel formatted as "channelKey: value", separated by "; "
  const channels = section.split(';').map((s) => s.trim()).filter(Boolean);
  for (const ch of channels) {
    const colonIdx = ch.indexOf(':');
    if (colonIdx === -1) continue;
    const key = ch.slice(0, colonIdx).trim();
    const value = ch.slice(colonIdx + 1).trim();
    if (key.toLowerCase() === channelKey.toLowerCase() && value.length > 0) {
      return value;
    }
  }
  return null;
}
