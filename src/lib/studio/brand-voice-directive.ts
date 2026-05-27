// =============================================================
// Brand Voice Directive
//
// Builds a compact (~300 token), high-priority voice instruction
// block that is injected BEFORE type-specific templates in every
// content generation, scoring, and suggestion prompt.
//
// This ensures brand voice, tone of voice, language, and channel-
// specific communication style take absolute priority over generic
// framework methodologies.
//
// Source — BV-WIRE W-2 (2026-05-06):
//   Primary: ctx.brandVoiceguide (formatted by formatBrandVoiceguide
//   in brand-context.ts; falls back to legacy BrandPersonality voice
//   fields for unmigrated workspaces).
//   Fallback: ctx.brandToneOfVoice (Brandstyle Analyzer) — only
//   injected when no voiceguide present, voiceguide otherwise wins
//   (single source of truth per BV-WIRE recommendation).
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
 * Brand-voice fidelity-level voor expliciete user-notification (content-test
 * verbeterpunt #1 uit Cowork-analyse 2026-05-12). Wordt door canvas-
 * orchestrator als SSE event uitgezonden zodat UI duidelijk maakt op welk
 * niveau de brand voice is toegepast.
 */
export type BrandVoiceLevel = 'voiceguide' | 'tone-only' | 'language-only' | 'none';

export interface BrandVoiceStatus {
  level: BrandVoiceLevel;
  /** Korte uitleg voor user (Nederlands), bv. "Voiceguide actief" of
   * "Geen voiceguide — neutrale professionele toon gebruikt". */
  userMessage: string;
  /** True wanneer level !== 'voiceguide' (UI kan dan suggestie tonen). */
  isFallback: boolean;
}

export function getBrandVoiceStatus(ctx: BrandContextBlock): BrandVoiceStatus {
  const hasVoiceguide = !!ctx.brandVoiceguide;
  const hasToneOfVoice = !!ctx.brandToneOfVoice;
  const hasLanguage = !!ctx.contentLanguage;
  if (hasVoiceguide) {
    return {
      level: 'voiceguide',
      userMessage: 'Brand voiceguide toegepast op deze generatie.',
      isFallback: false,
    };
  }
  if (hasToneOfVoice) {
    return {
      level: 'tone-only',
      userMessage:
        'Geen voiceguide geconfigureerd — fallback naar Brandstyle tone-of-voice. Tip: vul de voiceguide aan voor scherpere brand-fit.',
      isFallback: true,
    };
  }
  if (hasLanguage) {
    return {
      level: 'language-only',
      userMessage:
        'Geen brand voice of tone-of-voice geconfigureerd — alleen contenttaal toegepast. Tip: vul de voiceguide of tone-of-voice aan voor brand-fit.',
      isFallback: true,
    };
  }
  return {
    level: 'none',
    userMessage:
      'Geen voiceguide, tone-of-voice of contenttaal geconfigureerd — neutrale professionele toon toegepast.',
    isFallback: true,
  };
}

/**
 * Build the directive synchronously from an already-fetched BrandContextBlock.
 * Useful when the caller already has the context (e.g., canvas orchestrator).
 */
export function buildBrandVoiceDirectiveFromContext(
  ctx: BrandContextBlock,
  options?: BrandVoiceDirectiveOptions,
): string {
  const hasVoiceguide = !!ctx.brandVoiceguide;
  const hasToneOfVoice = !!ctx.brandToneOfVoice;
  const hasLanguage = !!ctx.contentLanguage;

  if (!hasVoiceguide && !hasToneOfVoice && !hasLanguage) {
    return '';
  }

  const parts: string[] = [];
  parts.push('## BRAND VOICE DIRECTIVE — NON-NEGOTIABLE');
  parts.push('All content MUST conform to these rules. They override any conflicting generic advice.');
  parts.push('');

  // Always emit explicit language enforcement — even for EN workspaces brand-context
  // can contain mixed-language input (e.g. NL persona-quotes in an EN brand foundation)
  // which the AI mirrors unless told to translate.
  const lang = ctx.contentLanguage ?? 'en';
  const langName = LANGUAGE_NAMES[lang] ?? lang;
  parts.push(`**Language**: Write ALL content in ${langName}. Every word, heading, hashtag, and CTA — no exceptions. If source material in this prompt (brand context, persona descriptions, prior content, user instructions) is in another language, translate the meaning into ${langName} before responding. Do not preserve foreign-language phrases for "authenticity". This rule outranks tone, style, and methodology guidance.`);
  parts.push('');

  if (hasVoiceguide) {
    // F21 (audit 2026-05-13): voiceguide krijgt expliciete MUST-MATCH frame
    // i.p.v. zachte "Brand voice" label. Writing-samples + words-we-use +
    // anti-patterns staan al in de gerenderde voiceguide-string; door de
    // stronger frame leest AI dit als imitatie-target ipv achtergrondinfo.
    parts.push('**VOICE FINGERPRINT — MUST MATCH BEFORE OUTPUT**:');
    parts.push(ctx.brandVoiceguide!);
    parts.push('');
  }

  // DTS-plan C1 — vocabulary-rails: alle content-generators krijgen nu
  // expliciete do/don't woordenlijst (was eerder alleen variant-generator).
  // Threshold 3+ items aan beide kanten — voorkomt incomplete guidance.
  const hasVocab =
    Array.isArray(ctx.vocabularyDo) && ctx.vocabularyDo.length >= 3 &&
    Array.isArray(ctx.vocabularyDont) && ctx.vocabularyDont.length >= 3;
  if (hasVocab) {
    parts.push('**VOCABULARY DISCIPLINE — STRICT**:');
    parts.push(`- USE these brand-specific words/phrases where natural: ${ctx.vocabularyDo!.map((w) => `"${w}"`).join(', ')}`);
    parts.push(`- NEVER use: ${ctx.vocabularyDont!.map((w) => `"${w}"`).join(', ')}`);
    parts.push('Replace generic equivalents with brand-specific vocabulary from the USE list.');
    parts.push('');
  }

  // DTS-plan C2 — voice few-shot sample: complete paragraph in brand's own
  // voice voor rhythm/syntax-matching. Minimum 30 chars om triviale
  // fragmenten te skippen.
  const voiceSample = ctx.voiceSample?.trim();
  if (voiceSample && voiceSample.length >= 30) {
    parts.push('**VOICE EXAMPLE — match this rhythm, sentence-length, and vocabulary**:');
    parts.push(`> ${voiceSample.replace(/\n/g, '\n> ')}`);
    parts.push('');
  }

  // Tone of voice (Brandstyle Analyzer) is fallback-only — injected when
  // no voiceguide present. Voiceguide is the canonical source per BV-WIRE
  // recommendation; gating here prevents duplicate voice context in prompts.
  if (!hasVoiceguide && hasToneOfVoice) {
    parts.push(`**Tone of voice guidelines**: ${ctx.brandToneOfVoice}`);
    parts.push('');
  }

  const channelKey = resolveChannelKey(options);
  if (channelKey) {
    // 2026-05-20 — sharper instruction. Previously "adapt accordingly" was
    // too soft; models often defaulted to the global tone even when the
    // voiceguide block contained an explicit channel-override. Now we
    // explicitly tell the model the channel-specific entry overrules the
    // global tone for THIS generation. The actual per-channel tone-string
    // is already in the brandVoiceguide block above via
    // formatBrandVoiceguide → channelTones serialisation.
    parts.push(
      `**Channel — ${channelKey}**: This content publishes on the "${channelKey}" channel. ` +
        `Locate the "Channel-specific tone" entry for "${channelKey}" in the VOICE FINGERPRINT block above. ` +
        `That channel-specific tone OVERRIDES the global tone-of-voice for this generation — write in the channel-specific register, not the global default. ` +
        `When the channel entry is missing for "${channelKey}", fall back to the global tone unchanged.`,
    );
    parts.push('');
  }

  if (ctx.brandName) {
    parts.push(`**Brand name**: Use "${ctx.brandName}" (not "we" or "our company") when referring to the brand. Ensure the brand name appears naturally in the content.`);
    parts.push('');
  }

  parts.push('Apply this voice identity WITHIN the structural methodology specified below. The methodology provides structure; the voice directive provides personality.');

  return parts.join('\n');
}

/**
 * F21 (audit 2026-05-13): self-check directive voor het EINDE van de system-
 * prompt zodat het de recency-positie pakt (laatste instructie wint vaak).
 * Combineert met de stronger framing van de voiceguide block bovenaan
 * (zie buildBrandVoiceDirectiveFromContext). Doel: initial F-VAL composite
 * van ~50 → ≥65 zonder auto-iterate; auto-iterate doet de rest naar ≥75.
 *
 * Wordt afzonderlijk samengesteld zodat consumers die geen
 * voiceguide-self-check willen (campaign-strategist, persona-analyse) het
 * ongebruikt kunnen laten. Content-generation pipeline (canvas-orchestrator)
 * appendt het altijd wanneer voiceguide of brand-name beschikbaar is.
 */
export function buildVoiceSelfCheckDirective(ctx: BrandContextBlock): string {
  const hasVoiceguide = !!ctx.brandVoiceguide;
  const hasBrandName = !!ctx.brandName;
  if (!hasVoiceguide && !hasBrandName) return '';

  const lang = ctx.contentLanguage ?? 'en';
  const isNl = lang === 'nl' || lang.startsWith('nl-');

  const lines: string[] = [];
  lines.push('## SELF-CHECK BEFORE RESPONDING — PERFORM MENTALLY, REVISE INLINE IF NEEDED');
  if (isNl) {
    if (hasVoiceguide) {
      lines.push(
        '1. **Voice-fingerprint match**: Komt het ritme + openingsstijl overeen met Writing sample [1] uit de Voice Fingerprint bovenaan? Zo nee → herschrijf de eerste alinea zodat het matched (zelfde zinslengte-patroon, zelfde type opening).',
      );
      lines.push(
        '2. **Words we use frequency**: Verschijnen tenminste 2 termen uit "Words we use" per alinea? Zo nee → vervang generieke woorden door brand-eigen vocabulaire uit die lijst.',
      );
      lines.push(
        '3. **Geen verboden termen**: Komen er termen uit "Words we avoid" of "Anti-patterns" voor? Zo ja → vervang ze door alternatieven uit het brand-vocabulaire.',
      );
    }
    if (hasBrandName) {
      lines.push(
        `4. **Brand-naam aanwezig**: Komt "${ctx.brandName}" expliciet voor in de hoofdtekst (niet alleen impliciet via "wij")? Zo nee → introduceer de naam in de eerste of tweede alinea.`,
      );
    }
    lines.push(
      '5. **AI-clichés geschrapt**: Geen "in de wereld van vandaag", "het is belangrijk om", "samengevat", "ontdek hoe", etc.',
    );
  } else {
    if (hasVoiceguide) {
      lines.push(
        '1. **Voice-fingerprint match**: Does the opening rhythm + style match Writing sample [1] from the Voice Fingerprint above? If not → rewrite the first paragraph to match (same sentence-length pattern, same opening type).',
      );
      lines.push(
        '2. **Words we use frequency**: Do at least 2 terms from "Words we use" appear per paragraph? If not → replace generic words with brand-specific vocabulary from that list.',
      );
      lines.push(
        '3. **No banned terms**: Do any terms from "Words we avoid" or "Anti-patterns" appear? If yes → replace them with alternatives from the brand vocabulary.',
      );
    }
    if (hasBrandName) {
      lines.push(
        `4. **Brand name present**: Does "${ctx.brandName}" appear explicitly in the body (not just implicitly via "we")? If not → introduce the name in the first or second paragraph.`,
      );
    }
    lines.push(
      '5. **AI-clichés eliminated**: No "in today\'s world", "it is important to note", "in summary", "discover how", etc.',
    );
  }
  lines.push('');
  lines.push(
    isNl
      ? 'Als één van bovenstaande checks zou falen, herschrijf de tekst VOORDAT je antwoordt. De gegenereerde output moet ALLE checks halen.'
      : 'If any of the above checks would fail, rewrite the text BEFORE responding. The generated output must pass ALL checks.',
  );

  return lines.join('\n');
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
