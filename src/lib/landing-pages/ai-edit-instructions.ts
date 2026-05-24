/**
 * Registry of AI-edit instructions for component-level rewrites in the
 * web-page builder (Phase 5 per ADR 2026-05-22-landing-page-builder-
 * architectuur).
 *
 * Each instruction maps a UI action ("Maak korter") to a stable id +
 * server-side prompt-template. Keeping the catalogue in one place avoids
 * the spike-pattern where the instruction string lived inline in the
 * component — which made prompt-tuning hard to A/B and lock-down for
 * F-VAL judging in later phases.
 *
 * MVP scope: 4 instructions covering the common copy-rewrite asks. Phase
 * 6+ may add long-form rewrites (e.g. "expand"), brand-voice-strict ones
 * ("match BrandVoice formality strictly"), or persona-targeted ones
 * ("rewrite for {persona}"). Adding one is a new entry here + a UI button.
 */

export type AiInstructionId = 'shorten' | 'formal' | 'casual' | 'alternatives';

export interface AiInstruction {
  id: AiInstructionId;
  /** Short user-facing label — shown on the toolbar button. */
  label: string;
  /** Optional Dutch translation when the workspace contentLocale = nl. */
  labelNl?: string;
  /** Prompt fragment appended to the system base in component-edit/route.ts. */
  promptDirective: string;
  /**
   * When true, the AI is asked to produce multiple variants in JSON form
   * (one per text field) rather than a single rewrite. The route still
   * returns proposedProps as a single object — alternatives UX comes in
   * Phase 6 via a carousel modal; for Phase 5 we collapse to the first
   * alternative so existing diff-preview keeps working.
   */
  multiVariant?: boolean;
}

const REGISTRY: Record<AiInstructionId, AiInstruction> = {
  shorten: {
    id: 'shorten',
    label: 'Make shorter',
    labelNl: 'Maak korter',
    promptDirective:
      'Rewrite the text fields to be at least 25% shorter while keeping intent intact. '
      + 'Prefer punchy, action-oriented sentences. Never invent facts.',
  },
  formal: {
    id: 'formal',
    label: 'More formal',
    labelNl: 'Formeler',
    promptDirective:
      'Rewrite the text fields in a more formal register. Use professional vocabulary, '
      + 'avoid contractions and colloquialisms, keep the meaning identical.',
  },
  casual: {
    id: 'casual',
    label: 'More casual',
    labelNl: 'Casualer',
    promptDirective:
      'Rewrite the text fields in a warmer, more conversational tone. Use contractions, '
      + 'address the reader directly (je/jij in NL, you in EN), keep the meaning identical.',
  },
  alternatives: {
    id: 'alternatives',
    label: '3 alternatives',
    labelNl: '3 alternatieven',
    promptDirective:
      'Produce 3 distinct rewrites of each text field. Vary headline style (question / '
      + 'statement / promise), keep the underlying value-proposition consistent. Return '
      + 'the FIRST alternative as the primary rewrite — the diff-preview UI in MVP only '
      + 'consumes one variant per field.',
    multiVariant: true,
  },
};

const VALID_IDS = new Set<string>(Object.keys(REGISTRY));

export function isValidInstructionId(id: string): id is AiInstructionId {
  return VALID_IDS.has(id);
}

export function getInstruction(id: AiInstructionId): AiInstruction {
  return REGISTRY[id];
}

export function listInstructions(): AiInstruction[] {
  return Object.values(REGISTRY);
}
