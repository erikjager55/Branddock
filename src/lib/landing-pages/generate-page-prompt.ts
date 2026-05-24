/**
 * Free-text prompt → FilledFields parser for the Phase 6 direct page
 * generator. Used by /api/landing-pages/generate-page.
 *
 * Two implementations:
 *  1. parseSimpleHeuristic — pure-JS extractor that derives a FilledFields
 *     skeleton from the prompt string (regex-based; no AI call). Used as
 *     a smoke-testable fallback + as the seed for the AI prompt.
 *  2. buildClaudePrompt — produces the user-prompt string sent to Claude
 *     by the route handler. Stays in lib/ so smoke + prompt-tuning can
 *     iterate on it without spinning up the route.
 *
 * The actual Claude call happens in the route (uses anthropicClient).
 */

import type { FilledFields } from '../../features/campaigns/components/canvas/medium/puck-templates';

export interface PromptInputs {
  /** User's free-text prompt — anything goes. */
  prompt: string;
  /** Workspace brand name for context-injection. */
  brandName?: string | null;
  /** Workspace tone-of-voice for context-injection. */
  brandToneOfVoice?: string | null;
  /** First persona name for the CTA persona-link. */
  primaryPersonaName?: string | null;
}

/**
 * Best-effort regex extraction from the prompt — useful when the AI call
 * fails / times out so we can still seed the page with something.
 *
 * Heuristics:
 *   "voor product-launch met persona X" → headline includes "product-launch"
 *   "korting" / "discount" → ctaLabel mentions discount
 *   "webinar" → headline includes Webinar
 *   anything else → derive headline from first 6 words of prompt
 */
export function parseSimpleHeuristic(input: PromptInputs): FilledFields {
  const prompt = input.prompt.trim();
  const lower = prompt.toLowerCase();

  const headlineFromPrompt = prompt
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');

  const headline = lower.includes('webinar')
    ? `Webinar: ${headlineFromPrompt}`
    : lower.includes('product-launch') || lower.includes('product launch')
      ? `Lanceer ${input.brandName ?? 'ons nieuwste product'}`
      : headlineFromPrompt || 'Welkom';

  const sub = `${input.brandName ?? 'Ons product'} helpt je ${
    lower.includes('snel') ? 'snel resultaat' : 'meer bereiken'
  }.`;

  const ctaLabel = lower.includes('proefperiode') || lower.includes('trial')
    ? 'Start proefperiode'
    : lower.includes('demo')
      ? 'Plan demo'
      : lower.includes('download')
        ? 'Download nu'
        : 'Start nu';

  return {
    headline,
    sub,
    ctaLabel,
    ctaHref: '#',
    featureItems: [],
    faqItems: [],
    testimonialQuote: '',
    testimonialAuthor: '',
    pricingTiers: [],
    longText: prompt,
  };
}

/**
 * Build the user-prompt string sent to Claude. The system prompt is
 * defined inline in the route to keep this module side-effect-free.
 */
export function buildClaudePrompt(input: PromptInputs): string {
  return [
    input.brandName ? `Brand: ${input.brandName}` : '',
    input.brandToneOfVoice ? `Tone of voice: ${input.brandToneOfVoice}` : '',
    input.primaryPersonaName ? `Primary persona: ${input.primaryPersonaName}` : '',
    '',
    'User prompt:',
    input.prompt,
    '',
    'Return a JSON object with exactly these keys:',
    '  - headline: string (max 80 chars, punchy)',
    '  - sub: string (1-2 sentences, value-prop)',
    '  - ctaLabel: string (max 30 chars, action verb)',
    '  - featureItems: array of { title: string, description: string } (3-5 items)',
    '  - faqItems: array of { question: string, answer: string } (2-4 items)',
    '  - testimonialQuote: string (one sentence quote)',
    '  - testimonialAuthor: string',
    '  - pricingTiers: array of { name: string, price: string, features: string }',
    '    (use 2-3 tiers when the prompt involves pricing/SaaS; otherwise empty)',
    '  - longText: string (1-3 paragraphs)',
    '',
    'Return ONLY valid JSON, no prose, no markdown fences.',
  ]
    .filter(Boolean)
    .join('\n');
}
