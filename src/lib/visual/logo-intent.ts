// =============================================================
// Logo-intent parser
//
// Detects when a scene's [VISUAL: …] direction asks for the brand
// logo to appear in the image (e.g. "Logo Linfi rechtsonder",
// "Brand mark top-left", "logo lockup centered"). Returns the
// resolved corner-position so the post-generation overlay knows
// where to place the real asset.
//
// Why parse this client-of-image-gen instead of letting the model
// render the logo: image-gen models hallucinate logos — wrong
// colour, distorted typography, garbled mark. We strip the logo
// mention from the prompt so the model leaves the corner clean,
// then composite the actual brand asset on top.
// =============================================================

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface LogoIntent {
  wantLogo: boolean;
  position: LogoPosition;
}

// Position cues — Dutch + English. Match the most specific corner
// phrase first; fall back to single-direction words.
const POSITION_PATTERNS: Array<{ regex: RegExp; position: LogoPosition }> = [
  { regex: /\b(rechts[\s-]?onder|bottom[\s-]?right|onder[\s-]?rechts)\b/i, position: 'bottom-right' },
  { regex: /\b(links[\s-]?onder|bottom[\s-]?left|onder[\s-]?links)\b/i, position: 'bottom-left' },
  { regex: /\b(rechts[\s-]?boven|top[\s-]?right|boven[\s-]?rechts)\b/i, position: 'top-right' },
  { regex: /\b(links[\s-]?boven|top[\s-]?left|boven[\s-]?links)\b/i, position: 'top-left' },
];

const LOGO_KEYWORD = /\b(logo|beeldmerk|brand[\s-]?mark|wordmark|logo[\s-]?lockup|brand[\s-]?logo)\b/i;

/**
 * Parse a scene visual-prompt for logo intent. Returns
 * `{ wantLogo: false, … }` when no logo keyword found. Default
 * corner when logo mentioned without a position cue: bottom-right
 * (LinkedIn paid-video convention for end-frame logo placement).
 */
export function parseLogoIntent(prompt: string): LogoIntent {
  if (!prompt || !LOGO_KEYWORD.test(prompt)) {
    return { wantLogo: false, position: 'bottom-right' };
  }
  for (const { regex, position } of POSITION_PATTERNS) {
    if (regex.test(prompt)) return { wantLogo: true, position };
  }
  return { wantLogo: true, position: 'bottom-right' };
}

/**
 * Remove logo mentions from the image-gen prompt so the model
 * leaves the corner clean (no hallucinated mark). Drops sentences
 * containing "logo …rechtsonder", "Logo Linfi …", "wordmark …",
 * etc. Keeps the rest of the prompt intact so the scene's other
 * visual direction (composition, subject, lighting) survives.
 *
 * Strategy: split on sentence-boundary punctuation, drop any
 * sentence containing the logo keyword, rejoin. Safer than a
 * surgical token-strip because logo mentions tend to be whole
 * sentences ("Logo Linfi rechtsonder.").
 */
export function stripLogoMentions(prompt: string): string {
  if (!prompt) return prompt;
  // Sentence split keeps the trailing punctuation on each part so we
  // can rejoin without losing rhythm.
  const sentences = prompt.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => !LOGO_KEYWORD.test(s));
  // Defensive: if every sentence got dropped (rare — whole prompt was
  // logo direction), return a minimal subject seed so the model still
  // has something to render against.
  if (kept.length === 0) {
    return prompt.replace(LOGO_KEYWORD, '').trim();
  }
  return kept.join(' ').trim();
}
