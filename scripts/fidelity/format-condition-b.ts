/**
 * scripts/fidelity/format-condition-b.ts
 *
 * Gestructureerde BVD-formatter voor Conditie B in de drift-meting.
 * Implementeert docs/fidelity/condition-b-template.md.
 *
 * Verschil met Conditie A (formatBrandPersonality + BVD wrapper):
 * - Markdown headers per dimensie i.p.v. ". "-gejoinde zinketenketen
 * - Anti-patterns geïsoleerd in eigen blok onderaan
 * - Channel-specific tone gefilterd op huidig kanaal
 *
 * Pure functie zonder database-toegang — caller geeft data mee.
 */

// ─── Type definitions (mirror van src/features/brand-asset-detail/types/framework.types.ts) ─

export interface BrandPersonalityRaw {
  primaryDimension?: string;
  secondaryDimension?: string;
  dimensionScores?: Record<string, number>;
  personalityTraits?: Array<{
    name?: string;
    description?: string;
    weAreThis?: string;
    butNeverThat?: string;
  }>;
  spectrumSliders?: Record<string, number>;
  toneDimensions?: Record<string, number>;
  brandVoiceDescription?: string;
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  writingSample?: string;
  channelTones?: Record<string, string>;
}

export interface ToneOfVoiceRaw {
  contentGuidelines?: string[];
  writingGuidelines?: string[];
  toneSavedForAi?: boolean;
}

export interface BrandVoiceContentRaw {
  voiceTone?: string | null;
  voicePrompt?: string | null;
}

export interface FormatConditionBOptions {
  brandName: string;
  contentLanguage: string; // 'nl', 'en', etc.
  channelKey: string; // 'website', 'email', 'socialMedia', etc.
  channelLabel: string; // human-readable: 'Website', 'Email', etc.
  personality: BrandPersonalityRaw;
  toneOfVoice?: ToneOfVoiceRaw;
  brandVoice?: BrandVoiceContentRaw;
}

// ─── Label maps (mirror brand-context.ts) ──

const DIMENSION_LABELS: Record<string, string> = {
  sincerity: 'Sincerity',
  excitement: 'Excitement',
  competence: 'Competence',
  sophistication: 'Sophistication',
  ruggedness: 'Ruggedness',
};

const SPECTRUM_LABELS: Record<string, [string, string]> = {
  friendlyFormal: ['Friendly', 'Formal'],
  energeticThoughtful: ['Energetic', 'Thoughtful'],
  modernTraditional: ['Modern', 'Traditional'],
  innovativeProven: ['Innovative', 'Proven'],
  playfulSerious: ['Playful', 'Serious'],
  inclusiveExclusive: ['Inclusive', 'Exclusive'],
  boldReserved: ['Bold', 'Reserved'],
};

const TONE_LABELS: Record<string, [string, string]> = {
  formalCasual: ['Formal', 'Casual'],
  seriousFunny: ['Serious', 'Funny'],
  respectfulIrreverent: ['Respectful', 'Irreverent'],
  matterOfFactEnthusiastic: ['Matter-of-fact', 'Enthusiastic'],
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

// ─── Formatter ────────────────────────────────────────────

export function formatConditionB(opts: FormatConditionBOptions): string {
  const { brandName, contentLanguage, channelKey, channelLabel, personality, toneOfVoice, brandVoice } = opts;
  const lines: string[] = [];

  lines.push('## BRAND VOICE DIRECTIVE — STRUCTURED');
  lines.push('');
  lines.push(`**Brand**: ${brandName}`);
  if (contentLanguage && contentLanguage !== 'en') {
    lines.push(`**Language**: ${LANGUAGE_NAMES[contentLanguage] ?? contentLanguage}`);
  }
  lines.push(`**Channel context**: ${channelLabel}`);
  lines.push('');

  // ── 1. Personality identity ──
  const hasPersonalityIdentity = personality.primaryDimension || personality.dimensionScores;
  if (hasPersonalityIdentity) {
    lines.push('### 1. Personality identity');
    if (personality.primaryDimension) {
      const label = DIMENSION_LABELS[personality.primaryDimension] ?? personality.primaryDimension;
      lines.push(`- **Primary dimension**: ${label}`);
    }
    if (personality.secondaryDimension) {
      const label = DIMENSION_LABELS[personality.secondaryDimension] ?? personality.secondaryDimension;
      lines.push(`- **Secondary dimension**: ${label}`);
    }
    if (personality.dimensionScores) {
      const scored = Object.entries(personality.dimensionScores)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${DIMENSION_LABELS[k] ?? k}: ${v}/5`);
      if (scored.length > 0) lines.push(`- **Aaker scores**: ${scored.join(', ')}`);
    }
    lines.push('');
  }

  // ── 2. Voice positioning ──
  const hasPositioning =
    personality.spectrumSliders ||
    personality.toneDimensions ||
    personality.brandVoiceDescription ||
    brandVoice?.voiceTone ||
    brandVoice?.voicePrompt;
  if (hasPositioning) {
    lines.push('### 2. Voice positioning');
    if (personality.spectrumSliders) {
      const positions = Object.entries(personality.spectrumSliders)
        .filter(([, v]) => v !== 4)
        .map(([k, v]) => {
          const labels = SPECTRUM_LABELS[k];
          if (!labels) return null;
          const position = v < 4 ? labels[0] : labels[1];
          const intensity = Math.abs(v - 4) >= 2 ? 'strongly' : 'slightly';
          return `${intensity} ${position}`;
        })
        .filter(Boolean);
      if (positions.length > 0) lines.push(`- **Spectrum**: ${positions.join(', ')}`);
    }
    if (personality.toneDimensions) {
      const tones = Object.entries(personality.toneDimensions)
        .filter(([, v]) => v !== 4)
        .map(([k, v]) => {
          const labels = TONE_LABELS[k];
          if (!labels) return null;
          return v < 4 ? labels[0] : labels[1];
        })
        .filter(Boolean);
      if (tones.length > 0) lines.push(`- **Tone**: ${tones.join(', ')}`);
    }
    if (personality.brandVoiceDescription) {
      lines.push(`- **Voice character**: ${personality.brandVoiceDescription}`);
    }
    if (brandVoice?.voiceTone || brandVoice?.voicePrompt) {
      const parts: string[] = [];
      if (brandVoice.voiceTone) parts.push(`tone=${brandVoice.voiceTone}`);
      if (brandVoice.voicePrompt) parts.push(`character=${brandVoice.voicePrompt}`);
      lines.push(`- **Voice (TTS-derived)**: ${parts.join(', ')}`);
    }
    lines.push('');
  }

  // ── 3. Core traits ──
  const traits = personality.personalityTraits?.filter((t) => t.name) ?? [];
  if (traits.length > 0) {
    lines.push('### 3. Core traits');
    for (const t of traits) {
      let line = `- **${t.name}**`;
      if (t.description) line += ` — ${t.description}`;
      lines.push(line);
      if (t.weAreThis) lines.push(`  - We are: ${t.weAreThis}`);
      // butNeverThat verplaatst naar sectie 7 (Anti-patterns)
    }
    lines.push('');
  }

  // ── 4. Vocabulary ──
  const hasVocab =
    (personality.wordsWeUse && personality.wordsWeUse.length > 0) ||
    (personality.wordsWeAvoid && personality.wordsWeAvoid.length > 0);
  if (hasVocab) {
    lines.push('### 4. Vocabulary');
    if (personality.wordsWeUse?.length) {
      lines.push(`- **Words we use**: ${personality.wordsWeUse.filter(Boolean).join(', ')}`);
    }
    if (personality.wordsWeAvoid?.length) {
      lines.push(`- **Words we avoid**: ${personality.wordsWeAvoid.filter(Boolean).join(', ')}`);
    }
    lines.push('');
  }

  // ── 5. Writing register ──
  if (personality.writingSample) {
    lines.push('### 5. Writing register (match this style)');
    lines.push('- **Sample**:');
    for (const sentence of personality.writingSample.split('\n')) {
      lines.push(`  > ${sentence}`);
    }
    lines.push('');
  }

  // ── 6. Channel-specific tone ──
  if (personality.channelTones && personality.channelTones[channelKey]) {
    lines.push(`### 6. Channel-specific tone — current channel: ${channelLabel}`);
    lines.push(personality.channelTones[channelKey]);
    lines.push('');
  }

  // ── 7. Anti-patterns ──
  const antiPatterns: string[] = [];
  for (const t of traits) {
    if (t.butNeverThat) antiPatterns.push(t.butNeverThat);
  }
  // Add ToV writingGuidelines (if "saved for AI") that read as don'ts
  if (toneOfVoice?.toneSavedForAi && toneOfVoice.writingGuidelines) {
    for (const g of toneOfVoice.writingGuidelines) {
      // Heuristic: items starting with "Geen", "Vermijd", "Niet", "Avoid", "Don't" are anti-patterns
      if (/^(geen|vermijd|niet|nooit|avoid|don't|do not)\b/i.test(g.trim())) {
        antiPatterns.push(g);
      }
    }
  }

  if (antiPatterns.length > 0 || (personality.wordsWeAvoid?.length ?? 0) > 0) {
    lines.push('### 7. Anti-patterns — NEVER do these');
    for (const ap of antiPatterns) {
      lines.push(`- ${ap}`);
    }
    if (personality.wordsWeAvoid?.length) {
      lines.push(`- (Also avoid these words: ${personality.wordsWeAvoid.filter(Boolean).join(', ')})`);
    }
    lines.push('');
  }

  // ── Footer ──
  lines.push('---');
  lines.push('');
  lines.push('Apply this voice WITHIN the methodology specified below. The methodology provides structure; this directive provides identity.');

  return lines.join('\n');
}
