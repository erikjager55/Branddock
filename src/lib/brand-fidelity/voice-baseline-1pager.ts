// ============================================================
// Voice Baseline 1-pager — afgeleide compact view uit BrandVoiceguide
//
// Single source of truth voor "wat is brand baseline" — wordt geconsumeerd
// door drie lagen:
//
//   1. UI: VoiceBaseline1Pager component in Brand Alignment header
//   2. F-VAL judge-prompt: BRAND_VOICE-section i.p.v. losse-veld-includes
//   3. Strategy Analyst (Phase 3 Brandclaw) — context-input
//
// Derivation is pure (geen DB-lookups; voiceguide passed in). Format-helper
// produceert ≤300-word markdown-string voor prompt-embed.
//
// Methodology referentie: §3 expliciete merk-baseline + Bijlage A spectrum
// template + Bijlage B sjabloon per voice-attribute.
// ============================================================

import type { BrandVoiceguide } from '@prisma/client';

// ─── Public types ────────────────────────────────────

export interface VoiceAttribute {
  /** Human-readable label ("Formaliteit", "Toon", etc.) */
  name: string;
  /** Pole-positive label ("Formeel") */
  polePos: string;
  /** Pole-negative label ("Spreektaal") */
  poleNeg: string;
  /** Position on spectrum, 0=poleNeg, 1=polePos. Optional — undefined when not set. */
  value?: number;
}

export interface VoiceBaseline1Pager {
  attributes: VoiceAttribute[];
  preferredTermsTop10: string[];
  avoidTermsTop10: string[];
  styleRules: string[];
  /** Coverage signal — telt hoeveel signals daadwerkelijk in BV staan (voor degrade-UI). */
  derivedFromCount: {
    attributesAvailable: number;
    preferredTermsAvailable: number;
    avoidTermsAvailable: number;
    styleRulesAvailable: number;
  };
}

// ─── NN/g 4-axis tone-dimensions (canonical) ─────────

const TONE_AXIS_POLES: Record<
  string,
  { polePos: string; poleNeg: string; label: string }
> = {
  formalCasual: { polePos: 'Formeel', poleNeg: 'Spreektaal', label: 'Formaliteit' },
  seriousFunny: { polePos: 'Serieus', poleNeg: 'Speels', label: 'Toon' },
  respectfulIrreverent: { polePos: 'Respectvol', poleNeg: 'Brutaal', label: 'Houding' },
  matterOfFactEnthusiastic: { polePos: 'Zakelijk', poleNeg: 'Enthousiast', label: 'Energie' },
};

// ─── Derivation ──────────────────────────────────────

/**
 * Pure derivation function. Input: BrandVoiceguide row (or null when none set).
 * Output: typed 1-pager with degrade-aware empty-state for missing signals.
 */
export function deriveVoiceBaseline1Pager(
  voiceguide: BrandVoiceguide | null | undefined,
): VoiceBaseline1Pager {
  if (!voiceguide) {
    return emptyBaseline();
  }

  const attributes = deriveAttributes(voiceguide.toneDimensions);
  const preferredTermsTop10 = (voiceguide.wordsWeUse ?? []).slice(0, 10);
  const avoidTermsTop10 = (voiceguide.wordsWeAvoid ?? []).slice(0, 10);
  const styleRules = deriveStyleRules(voiceguide.antiPatterns ?? []);

  return {
    attributes,
    preferredTermsTop10,
    avoidTermsTop10,
    styleRules,
    derivedFromCount: {
      attributesAvailable: attributes.length,
      preferredTermsAvailable: (voiceguide.wordsWeUse ?? []).length,
      avoidTermsAvailable: (voiceguide.wordsWeAvoid ?? []).length,
      styleRulesAvailable: (voiceguide.antiPatterns ?? []).length,
    },
  };
}

/**
 * Convert toneDimensions Json to typed VoiceAttribute[].
 * NN/g 4-axis schema: each axis is 0..1 (0=poleNeg, 1=polePos).
 * Skips axes that are not numeric (degrade-aware).
 */
function deriveAttributes(toneDimensions: unknown): VoiceAttribute[] {
  if (!toneDimensions || typeof toneDimensions !== 'object') return [];
  const td = toneDimensions as Record<string, unknown>;
  const result: VoiceAttribute[] = [];
  for (const key of Object.keys(TONE_AXIS_POLES)) {
    const raw = td[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const poles = TONE_AXIS_POLES[key];
    result.push({
      name: poles.label,
      polePos: poles.polePos,
      poleNeg: poles.poleNeg,
      value: Math.max(0, Math.min(1, raw)),
    });
  }
  return result;
}

/**
 * Convert anti-pattern phrases to imperative rule-form ("Vermijd 'X'").
 * Top 3 — methodology Bijlage B template specifies "max 3 style-rules" for
 * cognitive-load-budget per page.
 */
function deriveStyleRules(antiPatterns: string[]): string[] {
  return antiPatterns
    .slice(0, 3)
    .map((pattern) => `Vermijd "${pattern}"`);
}

function emptyBaseline(): VoiceBaseline1Pager {
  return {
    attributes: [],
    preferredTermsTop10: [],
    avoidTermsTop10: [],
    styleRules: [],
    derivedFromCount: {
      attributesAvailable: 0,
      preferredTermsAvailable: 0,
      avoidTermsAvailable: 0,
      styleRulesAvailable: 0,
    },
  };
}

// ─── Format-helper for prompt-embed ──────────────────

/**
 * Format the 1-pager as compact markdown for embedding in F-VAL judge-prompts
 * and Strategy Analyst context. Target: ≤300 words. Degrades gracefully when
 * sections are empty (returns "_Nog niet vastgelegd._" placeholder per section).
 */
export function formatVoiceBaseline1Pager(baseline: VoiceBaseline1Pager): string {
  const lines: string[] = [];

  lines.push('# Brand Voice Baseline');
  lines.push('');

  // ── Section 1: Tone-attributes ──
  lines.push('## Tone-attributes');
  if (baseline.attributes.length === 0) {
    lines.push('_Nog niet vastgelegd. Voltooi BrandVoiceguide tone-dimensions voor full context._');
  } else {
    for (const attr of baseline.attributes) {
      const valueLabel =
        attr.value !== undefined
          ? formatSpectrum(attr.value, attr.poleNeg, attr.polePos)
          : `${attr.poleNeg} ↔ ${attr.polePos}`;
      lines.push(`- **${attr.name}**: ${valueLabel}`);
    }
    if (baseline.derivedFromCount.attributesAvailable < 4) {
      lines.push(
        `_${baseline.derivedFromCount.attributesAvailable}/4 axes vastgelegd._`,
      );
    }
  }
  lines.push('');

  // ── Section 2: Preferred terms ──
  lines.push('## Voorkeurstermen (top 10)');
  if (baseline.preferredTermsTop10.length === 0) {
    lines.push('_Nog niet vastgelegd._');
  } else {
    lines.push(baseline.preferredTermsTop10.join(', '));
  }
  lines.push('');

  // ── Section 3: Avoid terms ──
  lines.push('## Te vermijden termen (top 10)');
  if (baseline.avoidTermsTop10.length === 0) {
    lines.push('_Nog niet vastgelegd._');
  } else {
    lines.push(baseline.avoidTermsTop10.join(', '));
  }
  lines.push('');

  // ── Section 4: Style rules ──
  lines.push('## Style rules');
  if (baseline.styleRules.length === 0) {
    lines.push('_Nog niet vastgelegd._');
  } else {
    for (let i = 0; i < baseline.styleRules.length; i++) {
      lines.push(`${i + 1}. ${baseline.styleRules[i]}`);
    }
  }

  return lines.join('\n');
}

/**
 * Project a 0..1 spectrum-value to a human-readable label.
 *   < 0.33  → poleNeg-leaning ("Spreektaal (15%)")
 *   > 0.67  → polePos-leaning ("Formeel (82%)")
 *   else    → balanced ("Tussen Spreektaal & Formeel (50%)")
 */
function formatSpectrum(value: number, poleNeg: string, polePos: string): string {
  const pct = Math.round(value * 100);
  if (pct < 33) return `${poleNeg} (${pct}%)`;
  if (pct > 67) return `${polePos} (${pct}%)`;
  return `Tussen ${poleNeg} & ${polePos} (${pct}%)`;
}
